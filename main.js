import express from 'express';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

const app = express();

async function fetchUrl(url) {
    try {
        const starttime = Date.now();
        const response = await fetch(url);
        let article = await response.text();

        article = article.replace(/"Product_image": "([0-9]*)/, `"Product_image": "https://static.toiimg.com/photo/$1.cms`);
        article = article.replace(/"url":  "([0-9]*)/, `"url":  "https://www.gadgetsnow.com$1`, article);

        const data = JSON.parse(article);

        if (data.length > 0) {
            const results = [];

            async function extractResults(i) {
                const itemResponse = await fetch(`https://www.gadgetsnow.com/pwafeeds/gnow/web/show/gadgets/json?uName=${i.url.split('/').pop()}&url=${i.url.split('https://www.gadgetsnow.com')[1]}`);
                const itemData = await itemResponse.json();
                Object.assign(i, itemData.jsonFeed.data.item);
                delete i.review;
                delete i.reviews;
                delete i.userReview;
                results.push(i);
            }

            await Promise.all(data[0].gadgets.data.map(i => extractResults(i)));
            console.log(Date.now() - starttime);
            return results;

        } else {
            return { error: true, error_message: "No results found" };
        }
    } catch (e) {
        console.error(e);
        return { error: true, error_message: e.message };
    }
}

async function fetchGadgets360(query) {
    const starttime = Date.now();
    const response = await fetch(`https://gadgets360.com/search?searchtext=${query}`);
    const text = await response.text();
    const dom = new JSDOM(text);
    const document = dom.window.document;
    const results = [];

    async function extractResults(item) {
        const title = item.querySelector('img').title;
        const contResponse = await fetch(item.querySelector('a').href);
        const contText = await contResponse.text();
        const contDom = new JSDOM(contText);
        const contDocument = contDom.window.document;
        const req = contDocument.querySelectorAll('div._pdsd');
        const jsun = { title };

        async function fpInReq(fp) {
            const ty = fp.nextElementSibling;
            if (!ty) return;
            jsun[ty.textContent] = ty.nextElementSibling.textContent;
        }

        await Promise.all(Array.from(req).map(fpInReq));
        results.push(jsun);
    }

    await Promise.all(Array.from(document.querySelectorAll('div.rvw-imgbox')).map(item => extractResults(item)));
    console.log(Date.now() - starttime);
    return results;
}

app.get('/gadgetsnow/:query', async (req, res) => {
    const results = await fetchUrl(`https://www.gadgetsnow.com/single_search.cms?q=${req.params.query}&tag=product`);
    res.json(results);
});

app.get('/gadgets360/:query', async (req, res) => {
    const results = await fetchGadgets360(req.params.query);
    res.json(results);
});

app.get('/', (req, res) => {
    res.json({ message: "Hello FastAPI!" });
});

  app.listen(process.env.PORT || 8080, () => {
     console.log(`Server running on port ${process.env.PORT || 8080}`);
 });