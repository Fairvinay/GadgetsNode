import express from 'express';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cors from 'cors';
import { tidy } from 'htmltidy2';
import pLimit from 'p-limit';
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


const originsWhitelist = ['https://localhost:4200','https://localhost:8081','https://storenotify.com',"storenotiftycom.netlify.app",'https://storenotify.com/',
  'https://192.168.1.4:8000','https://192.168.1.4:8080','http://192.168.1.4:3000','http://127.0.0.1:3000','http://localhost:3000/',
   'https://192.168.1.7','https://192.168.1.2','https://192.168.1.3','https://192.168.1.5','https://192.168.1.6',
   'https://bb6f6125-db9c-4152-b500-ee566806723b.e1-us-east-azure.choreoapps.dev', 'https://glaubhanta.site','https://www.glaubhanta.site'
];
const options= {  /* : cors.CorsOptions   */
   origin:  originsWhitelist ,
  credentials:true,
  methods: ['GET','POST','DELETE','UPDATE','PUT','PATCH','OPTIONS']
}

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
    let text = '';
    let dom = new JSDOM(text);
    let document = dom.window.document;
    let results = [];
   await fetch(`https://gadgets360.com/search?searchtext=${query}`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    
       let fetHTML =   (async () => {
          const t = await response.text();
           let text =t
          dom = new JSDOM(text);
          document = dom.window.document;


            await Promise.all(Array.from(document.querySelectorAll('div.rvw-imgbox'))
            .map(item => extractResults(item))).then(data => { console.log(data); 
                 return data;
      
                }).catch(error => {
                  console.error('Fetch error:', error);
                  return { error: true, error_message: error.message };
                });

            
        });
        return fetHTML();
        // fetHTML().then(data => { console.log(data); 
        //   return data;

        // });
        


    })
    .then(data => { console.log(data); 



     } )
    .catch(error => {
      console.error('Fetch error:', error);
    });
   

    async function extractResults(item) {
        const title = await item.querySelector('img').title;
        const imgsrc  = await item.querySelector('img').src;
        let jsun = ''; let  prodDesc ='' , prodImg='';
        jsun  = { title , imgsrc };
        let prodDescArr =[]; let prodImgHref ='';
        let reqProduct = {}
        // read https://www.gadgets360.com/vivo-t4-5g-price-in-india-131722#pfrom=search
        try { //const contResponse = await fetch(item.querySelector('a').href);
           const url = item.querySelector('a').href
            const response = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' // Some sites block non-browser agents
              }
            });
          
            const rawHtml = await response.text();
          
            tidy(rawHtml, { doctype: 'html5', indent: true }, (err, cleanedHtml) => {
              if (err) {
                console.error('HTML Tidy Error:', err);
                return;
              }
          
              const dom = new JSDOM(cleanedHtml);
              const documentD = dom.window.document;
             // const contDocument = contDom.window.document;
                prodDesc = documentD.querySelectorAll('._pdsd'); //documentD.querySelectorAll('div._pdsd');
               if(prodDesc.length  > 0){
                  // req = req[0].nextElementSibling.textContene  
                     prodDesc.forEach(element => {
                        console.log('element:', element.textContent);
                        let descSplit = element.textContent.split('\n');
                        if( descSplit.length >1){
                            console.log('key :', descSplit[0]);
                            console.log('value :', descSplit[1]);
                            jsun[descSplit[0]] = descSplit[1];
                        }
                        prodDescArr.push(element.textContent.trim());   
                     });
               }
               prodImg =  documentD.querySelectorAll('._pdmimg'); // .__arModalBtn ._flx
               if(prodImg !==null && prodImg !== undefined  ){
                   // fetch the image url
                   if(prodImg.childNodes  !== null && prodImg.childNodes !== undefined  && prodImg.childNodes.length > 0) {
                     if(prodImg.childNodes [0] !==null && prodImg.childNodes[0] !== undefined  ){
                       prodImgHref = prodImg.childNodes[0];
                      if(prodImgHref.src !==null && prodImgHref.src !== undefined  ){
                         console.log('image href:', prodImgHref.src);
                         jsun.image = prodImgHref.src;
                      }
                   }
                 }
                  
               }
              // request prodect with image and detais descrip attributes
              let t =jsun?.title;
              let img = jsun?.imgsrc;
              reqProduct = { t , img, prodDescArr};

              console.log('reqProduct:', reqProduct);
              // Example: Extract product title
              const title = documentD.querySelector('h1')?.textContent.trim();
              console.log('📱 Title:', title);
             // console.log(' req :',  req );
              // Example: Extract price
              const price = documentD.querySelector('.shop_now_section .price')?.textContent.trim();
              console.log('💰 Price:', price || 'Not found');
            });
          
          } catch (error) {
            console.error('❌ Fetch error:', error.message);
       }
       // const contText = await contResponse.text();
       // const contDom = new JSDOM(contText);
       

        async function fpInReq(fp) {
            const ty = fp.nextElementSibling;
            if (!ty) return;
            jsun[ty.textContent] = ty.nextElementSibling.textContent;
        }
        const limit = pLimit(10); // Set concurrency limit to 10
        const tasks =   Array.from(reqProduct).map(item => 
          limit(() => fpInReq(item))
        );
        await Promise.all(tasks);
        results.push(jsun);
        return results;
    }

    
    return results;
}

const allowedOrigins = ['http://localhost:3000', 'http://localhost:5000', 'http://localhost:8081',
   'https://bb6f6125-db9c-4152-b500-ee566806723b.e1-us-east-azure.choreoapps.dev',
   'https://ea24beef-ae35-447d-8351-92e96e289f12.e1-us-east-azure.choreoapps.dev'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
/*
app.use( (req ,  res , next )  => {
  const origin  = req.headers.origin !=undefined ? req.headers.origin :( req.headers.host !=undefined ? req.headers.host  :"") ;
   let  originHost =   origin.substring(0,origin.indexOf(":"));
   originHost = originHost ==="" ? origin : req.headers.referer?req.headers.referer:"";
   console.log("req.headers "+JSON.stringify(req.headers));
    let validReqOrigin = false;
     originsWhitelist.forEach((validHost, index) => {
         if(validHost.indexOf(originHost) > -1){
             validReqOrigin = true;
             }
        });
          console.log(validHost+ " < validhost " + "originHost "+originHost);
     if(validReqOrigin && originHost!=="") {
           res.header("Access-Control-Allow-Origin",originHost);
              console.log("CORS allowed "+originHost);
              // console.log("CORS request body "+JSON.stringify(req['body']));
      }
       else { console.log("CORS not allowed "+origin);
       }
         res.header("Access-Control-Allow-Headers","Origin, X-Requested-With, Content-Type, Accept");
       next();
 },   cors(options));*/

app.get('/gadgetsnow/:query', async (req, res) => {
    const results = await fetchUrl(`https://www.gadgetsnow.com/single_search.cms?q=${req.params.query}&tag=product`);
    res.json(results);
});

app.get('/gadgets360/:query', async (req, res) => {
    const results = await fetchGadgets360(req.params.query);
   

    res.json(results);
});
//http://localhost:8080/gadgets360/vivo
app.get('/sample', (req, res) => {
  const items = [
    {
      imgSrc: "https://rukminim1.flixcart.com/image/900/900/xif0q/mobile/k/t/x/-original-imahbgpzbumfzkbh.jpeg?q=90",
      name: "Vivo T4 5G (8GB RAM, 128GB)...",
      price: "₹ 21,999",
      linkClick1: "https://pricee.com/api/redirect/t.php?itemid=1-mobhatxzs3wn8fz2&click=1",
      linkClick2: "https://pricee.com/api/redirect/t.php?itemid=1-mobhatxzs3wn8fz2&click=2",
      linkClick4: "https://pricee.com/api/redirect/t.php?itemid=1-mobhatxzs3wn8fz2&click=4",
      seller: "Flipkart"
    },
    {
      imgSrc: "https://m.media-amazon.com/images/I/41xlVzMbjOL._SL160_.jpg",
      name: "Vivo Y19 5G (4GB RAM, 64GB)...",
      price: "₹ 10,499",
      linkClick1: "https://pricee.com/api/redirect/t.php?itemid=2-b0f3n9mxpd&click=1",
      linkClick2: "https://pricee.com/api/redirect/t.php?itemid=2-b0f3n9mxpd&click=2",
      linkClick4: "https://pricee.com/api/redirect/t.php?itemid=2-b0f3n9mxpd&click=4",
      seller: "Amazon"
    }
    // Add more items as needed
  ];

  res.render('slider', { items });
});

app.get('/', (req, res) => {
    res.json({ message: "Hello FastAPI!" });
});

  app.listen(process.env.PORT || 8080, () => {
     console.log(`Server running on port ${process.env.PORT || 8080}`);
 });