"use strict";(self.webpackChunkrxdb=self.webpackChunkrxdb||[]).push([[6287,2584],{1527:(e,a,r)=>{function s(e,a){if(!window.trigger)throw new Error("window.trigger not defined");return window.trigger(e,a)}r.d(a,{h:()=>s})},6465:(e,a,r)=>{r.r(a),r.d(a,{default:()=>l});var s=r(2303),i=r(6540),n=r(9961),t=r(1980),o=r(4848);function l(){const e=(0,s.A)();return(0,i.useEffect)((()=>{e&&(0,n.IA)()&&(async()=>{const e=await(0,n.C3)(),a=await e.getLocal(t.FORM_VALUE_DOCUMENT_ID);if(console.dir(a),a){if(a._data.data.formSubmitted)return void console.log("# lead already tracked");window.trigger("premium_lead_"+a._data.data.homeCountry.toLowerCase(),Math.floor(a._data.data.price/3)),await a.incrementalPatch({formSubmitted:!0})}else window.trigger("premium_lead_unknown",300),await e.upsertLocal(t.FORM_VALUE_DOCUMENT_ID,{formSubmitted:!0})})()})),(0,o.jsxs)("main",{children:[(0,o.jsx)("br",{}),(0,o.jsx)("br",{}),(0,o.jsx)("br",{}),(0,o.jsx)("br",{}),(0,o.jsxs)("div",{className:"redirectBox",style:{textAlign:"center"},children:[(0,o.jsx)("a",{href:"/",target:"_blank",children:(0,o.jsx)("div",{className:"logo",children:(0,o.jsx)("img",{src:"/files/logo/logo_text.svg",alt:"RxDB",width:120})})}),(0,o.jsx)("br",{}),(0,o.jsx)("br",{}),(0,o.jsx)("h1",{children:"RxDB Premium Form Submitted"}),(0,o.jsx)("br",{}),(0,o.jsxs)("p",{style:{padding:50},children:["Thank you for submitting the form. You will directly get a confirmation email.",(0,o.jsx)("br",{}),(0,o.jsx)("b",{children:"Please check your spam folder!"}),".",(0,o.jsx)("br",{}),"In the next 24 hours you will get an email with a preview of the license agreement."]}),(0,o.jsx)("br",{}),(0,o.jsx)("br",{})]})]})}},1980:(e,a,r)=>{r.r(a),r.d(a,{FORM_VALUE_DOCUMENT_ID:()=>j,default:()=>b});var s=r(4586),i=r(8465),n=r(5260),t=r(6540),o=r(3337),l=r(7810),c=r(7849);const d=[{name:"Antigua and Barbuda",code:"AG",salary:49527},{name:"Argentina",code:"AR",salary:17158},{name:"Australia",code:"AU",salary:76036},{name:"Austria",code:"AT",salary:59383},{name:"Bahamas",code:"BS",salary:62024},{name:"Belarus",code:"BY",salary:5749},{name:"Belgium",code:"BE",salary:63749},{name:"Bermuda",code:"BM",salary:86590},{name:"Bosnia and Herzegovina",code:"BA",salary:11992},{name:"Brazil",code:"BR",salary:26464},{name:"Bulgaria",code:"BG",salary:23384},{name:"Cambodia",code:"KH",salary:18e3},{name:"Canada",code:"CA",salary:71554},{name:"Chile",code:"CL",salary:31073},{name:"China",code:"CN",salary:40611},{name:"Colombia",code:"CO",salary:12894},{name:"Costa Rica",code:"CR",salary:40256},{name:"Croatia",code:"HR",salary:22566},{name:"Czech Republic",code:"CZ",salary:33760},{name:"Denmark",code:"DK",salary:68778},{name:"Ecuador",code:"EC",salary:35016},{name:"Egypt",code:"EG",salary:7758},{name:"Estonia",code:"EE",salary:26728},{name:"Finland",code:"FI",salary:64198},{name:"France",code:"FR",salary:58137},{name:"Georgia",code:"GE",salary:40315},{name:"Germany",code:"DE",salary:72138},{name:"Greece",code:"GR",salary:36824},{name:"Guatemala",code:"GT",salary:49612},{name:"Holy See (Vatican City State)",code:"VA",salary:51474},{name:"Hong Kong",code:"HK",salary:71970},{name:"Hungary",code:"HU",salary:22341},{name:"Iceland",code:"IS",salary:66512},{name:"India",code:"IN",salary:35420},{name:"Indonesia",code:"ID",salary:20978},{name:"Iraq",code:"IQ",salary:21029},{name:"Ireland",code:"IE",salary:66281},{name:"Israel",code:"IL",salary:57466},{name:"Italy",code:"IT",salary:50900},{name:"Jamaica",code:"JM",salary:21048},{name:"Japan",code:"JP",salary:57793},{name:"Kazakhstan",code:"KZ",salary:12243},{name:"Republic of Korea",code:"KR",salary:45957},{name:"Latvia",code:"LV",salary:26728},{name:"Luxembourg",code:"LU",salary:84663},{name:"Malaysia",code:"MY",salary:26117},{name:"Malta",code:"MT",salary:41971},{name:"Mexico",code:"MX",salary:24050},{name:"Morocco",code:"MA",salary:17903},{name:"Netherlands",code:"NL",salary:62661},{name:"New Zealand",code:"NZ",salary:63948},{name:"Norway",code:"NO",salary:69498},{name:"Pakistan",code:"PK",salary:9066},{name:"Panama",code:"PA",salary:39143},{name:"Peru",code:"PE",salary:17469},{name:"Philippines",code:"PH",salary:11088},{name:"Poland",code:"PL",salary:30236},{name:"Portugal",code:"PT",salary:37959},{name:"Romania",code:"RO",salary:22319},{name:"Russian Federation",code:"RU",salary:20492},{name:"Saudi Arabia",code:"SA",salary:47336},{name:"Singapore",code:"SG",salary:66023},{name:"Slovakia",code:"SK",salary:29650},{name:"South Africa",code:"ZA",salary:40336},{name:"Spain",code:"ES",salary:47819},{name:"Sweden",code:"SE",salary:49361},{name:"Switzerland",code:"CH",salary:92820},{name:"Taiwan",code:"TW",salary:47737},{name:"Thailand",code:"TH",salary:21772},{name:"Turkey",code:"TR",salary:8788},{name:"Ukraine",code:"UA",salary:14139},{name:"United Arab Emirates",code:"AE",salary:66381},{name:"United Kingdom",code:"GB",salary:61188},{name:"United States",code:"US",salary:91935},{name:"Uruguay",code:"UY",salary:23754},{name:"Vietnam",code:"VN",salary:19058}],h={browser:.4,native:.4,performance:.35,server:.25,sourcecode:0,perpetual:0},m=.05;var p=r(1527),u=r(9961),x=r(2303),g=r(6902),y=r(4848);const j="premium-price-form-value";function b(){const{siteConfig:e}=(0,s.A)(),a=(0,x.A)(),[r,c]=t.useState(null),[b,v]=t.useState(null),[w,N]=t.useState(!1);(0,t.useEffect)((()=>{a&&(0,u.IA)()&&(w||(a&&window.trigger("open_pricing_page",1),(async()=>{const e=await(0,u.C3)(),a=await e.getLocal(j);if(a){console.log("formValueDoc:"),console.dir(a),v(a._data.data.homeCountry),c(a._data.data.homeCountry),f("company-size",a._data.data.companySize),f("project-amount",a._data.data.projectAmount),f("license-period",a._data.data.licensePeriod),Object.keys(h).forEach((e=>{f("package-"+e,!1)})),a._data.data.packages.forEach((e=>{f("package-"+e,!0)}));const e=document.getElementById("price-calculator-submit");e&&e.click()}N(!0)})()))}));const[S,R]=t.useState(!1);return(0,y.jsxs)(y.Fragment,{children:[(0,y.jsx)(n.A,{children:(0,y.jsx)("body",{className:"homepage"})}),(0,y.jsx)(i.A,{title:`Premium Plugins - ${e.title}`,description:"RxDB plugins for professionals. FAQ, pricing and license",children:(0,y.jsxs)("main",{children:[(0,y.jsx)("div",{className:"block first",id:"price-calculator-block",children:(0,y.jsxs)("div",{className:"content centered",children:[(0,y.jsxs)("h2",{children:["RxDB Premium ",(0,y.jsx)("b",{className:"underline",children:"Price Calculator"})]}),(0,y.jsxs)("p",{style:{width:"80%"},children:["RxDB's Premium plugins offer advanced features and optimizations that enhance application ",(0,y.jsx)("b",{children:"performance"})," ","and are backed by dedicated support and regular updates. Using the premium plugins is recommended for users that use RxDB in a professional context. If you use RxDB in your side project, you likely want to stay on the Open Core."]}),(0,y.jsx)("div",{className:"price-calculator",children:(0,y.jsx)("div",{className:"price-calculator-inner",children:(0,y.jsxs)("form",{id:"price-calculator-form",children:[(0,y.jsxs)("div",{className:"field",children:[(0,y.jsx)("label",{htmlFor:"home-country",children:"Company Home Country:"}),(0,y.jsx)("div",{className:"input",children:(0,y.jsx)(g.A,{id:"home-country",style:{width:"100%"},popupMatchSelectWidth:!0,optionFilterProp:"value",showSearch:!0,placeholder:"Company Home Country",value:r||b,onChange:e=>{e!==r&&c(e)},children:d.sort(((e,a)=>e.name>=a.name?1:-1)).map(((e,a)=>(0,y.jsx)(g.A.Option,{value:e.name,children:e.name},a)))})})]}),(0,y.jsx)("br",{}),(0,y.jsx)("div",{className:"clear"}),(0,y.jsxs)("div",{className:"field",children:[(0,y.jsx)("label",{htmlFor:"company-size",children:"Company Size:"}),(0,y.jsxs)("div",{className:"input",children:[(0,y.jsx)("input",{type:"number",name:"company-size",min:1,max:1e6,required:!0,onKeyDown:()=>{const e=(0,o.ZN)(event);return 69!==e.keyCode&&189!==e.keyCode&&190!==e.keyCode},placeholder:"Company Size"}),(0,y.jsx)("div",{className:"suffix",children:"employee(s)"})]})]}),(0,y.jsxs)("div",{className:"packages",children:[(0,y.jsx)("h3",{children:"Packages:"}),(0,y.jsx)("div",{className:"package bg-gradient-left-top",children:(0,y.jsxs)("div",{className:"package-inner",children:[(0,y.jsx)("input",{name:"package-browser",type:"checkbox",className:"package-checkbox",defaultChecked:!0}),(0,y.jsx)("h4",{children:"Browser Package"}),(0,y.jsxs)("ul",{children:[(0,y.jsx)("li",{children:(0,y.jsx)("a",{href:"/rx-storage-opfs.html",target:"_blank",children:"RxStorage OPFS"})}),(0,y.jsx)("li",{children:(0,y.jsx)("a",{href:"/rx-storage-indexeddb.html",target:"_blank",children:"RxStorage IndexedDB"})}),(0,y.jsx)("li",{children:(0,y.jsx)("a",{href:"/rx-storage-worker.html",target:"_blank",children:"RxStorage Worker"})}),(0,y.jsx)("li",{children:(0,y.jsx)("a",{href:"/encryption.html",target:"_blank",children:"WebCrypto Encryption"})})]})]})}),(0,y.jsx)("div",{className:"package bg-gradient-left-top",children:(0,y.jsxs)("div",{className:"package-inner",children:[(0,y.jsx)("input",{name:"package-native",type:"checkbox",className:"package-checkbox",defaultChecked:!0}),(0,y.jsx)("h4",{children:"Native Package"}),(0,y.jsxs)("ul",{children:[(0,y.jsx)("li",{children:(0,y.jsx)("a",{href:"/rx-storage-sqlite.html",target:"_blank",children:"RxStorage SQLite"})}),(0,y.jsx)("li",{children:(0,y.jsx)("a",{href:"/rx-storage-filesystem-node.html",target:"_blank",children:"RxStorage Filesystem Node"})})]})]})}),(0,y.jsx)("div",{className:"package bg-gradient-left-top",children:(0,y.jsxs)("div",{className:"package-inner",children:[(0,y.jsx)("input",{name:"package-performance",type:"checkbox",className:"package-checkbox",defaultChecked:!0}),(0,y.jsx)("h4",{children:"Performance Package"}),(0,y.jsxs)("ul",{children:[(0,y.jsx)("li",{children:(0,y.jsx)("a",{href:"/rx-storage-sharding.html",target:"_blank",children:"RxStorage Sharding"})}),(0,y.jsx)("li",{children:(0,y.jsx)("a",{href:"/rx-storage-memory-mapped.html",target:"_blank",children:"RxStorage Memory Mapped"})}),(0,y.jsx)("li",{children:(0,y.jsx)("a",{href:"/rx-storage-memory-synced.html",target:"_blank",children:"RxStorage Memory Synced"})}),(0,y.jsx)("li",{children:(0,y.jsx)("a",{href:"/query-optimizer.html",target:"_blank",children:"Query Optimizer"})}),(0,y.jsx)("li",{children:(0,y.jsx)("a",{href:"/rx-storage-localstorage-meta-optimizer.html",target:"_blank",children:"RxStorage Localstorage Meta Optimizer"})}),(0,y.jsx)("li",{children:(0,y.jsx)("a",{href:"/rx-storage-shared-worker.html",target:"_blank",children:"RxStorage Shared Worker"})})]})]})}),(0,y.jsx)("div",{className:"package bg-gradient-left-top",children:(0,y.jsxs)("div",{className:"package-inner",children:[(0,y.jsx)("input",{name:"package-server",type:"checkbox",className:"package-checkbox",defaultChecked:!0}),(0,y.jsx)("h4",{children:"Server Package"}),(0,y.jsxs)("ul",{children:[(0,y.jsx)("li",{children:(0,y.jsx)("a",{href:"/rx-server.html",target:"_blank",children:"RxServer Adapter Fastify"})}),(0,y.jsx)("li",{children:(0,y.jsx)("a",{href:"/rx-server.html",target:"_blank",children:"RxServer Adapter Koa"})})]})]})}),(0,y.jsx)("div",{className:"package bg-gradient-left-top",children:(0,y.jsxs)("div",{className:"package-inner",children:[(0,y.jsx)("input",{name:"package-utilities",type:"checkbox",className:"package-checkbox",defaultChecked:!0,disabled:!0}),(0,y.jsxs)("h4",{children:["Utilities Package ",(0,y.jsx)("b",{children:"always included"})]}),(0,y.jsxs)("ul",{children:[(0,y.jsx)("li",{children:(0,y.jsx)("a",{href:"/logger.html",target:"_blank",children:"Logger"})}),(0,y.jsx)("li",{children:(0,y.jsx)("a",{href:"/fulltext-search.html",target:"_blank",children:"Fulltext Search"})}),(0,y.jsx)("li",{children:(0,y.jsx)("a",{href:"/reactivity.html",target:"_blank",children:"Reactivity Vue"})}),(0,y.jsx)("li",{children:(0,y.jsx)("a",{href:"/reactivity.html",target:"_blank",children:"Reactivity Preact Signals"})})]})]})}),(0,y.jsx)("div",{className:"clear"}),(0,y.jsx)("div",{className:"clear"})]}),(0,y.jsx)("div",{className:"button",id:"price-calculator-submit",onClick:async()=>{(0,p.h)("calculate_premium_price",3);const e=(0,o.ZN)(document.getElementById("price-calculator-form"));if(!e.reportValidity())return void console.log("form not valid");const s=new FormData(e),i=Object.fromEntries(s.entries());if(console.log("formData:"),console.dir(i),console.dir(r),!r&&w&&a)return void alert("Please fill out the Home Country Field");if(!r)return;const n=d.find((e=>e.name.toLowerCase()===r.toLowerCase()));if(!n)return;const t=Object.entries(i).filter((e=>{let[a,r]=e;return a.startsWith("package-")})).map((e=>{let[a]=e;return(0,l.dG)(a.split("-"))})),c={companySize:parseInt(i["company-size"],10),teamSize:i["developer-count"],projectAmount:"1",licensePeriod:1,homeCountryCode:n.code,packages:t},x=function(e){if(console.log("calculatePrice:"),console.dir(e),"number"!=typeof e.licensePeriod)throw new Error("not a number "+typeof e.licensePeriod);const a=(0,o.ZN)(d.find((a=>a.code===e.homeCountryCode))).salary;let r=0;e.packages.forEach((e=>{const a=h[e];r+=a})),console.log("aimInPercent: "+r);let s=350+1.4*a*(r/100);if(2===e.packages.length?s*=.95:e.packages.length>2&&(s*=.9),e.companySize>1){let a=1+Math.pow(1*e.companySize-1,.45)/100*4.5;const r=6;a>r&&(a=r),console.log("input.companySize "+e.companySize+" - "+a),s*=a}if(e.packages.includes("sourcecode")){s*=1.75;const e=1520;s<e&&(s=e)}const i=(new Date).getFullYear()-2022,n=Math.pow(1+m,i);console.log("inflationMultiplier: "+n),s*=n,"2"===e.projectAmount?s*=1.6:"infinity"===e.projectAmount&&(s*=3),s=Math.ceil(s)*e.licensePeriod,2===e.licensePeriod?s*=.9:3===e.licensePeriod&&(s*=.8),e.packages.includes("perpetual")&&(s+=s/e.licensePeriod*.45);return s=Math.ceil(s),s=s>1200?100*Math.floor(s/100):50*Math.floor(s/50),{totalPrice:s}}(c);console.log("priceResult:"),console.log(JSON.stringify(x,null,4));const g=(0,o.ZN)(document.getElementById("price-calculator-result")),y=(0,o.ZN)(document.getElementById("total-per-project-per-month")),b=(e,a)=>{console.log("setPrice:"),console.dir(a),e.innerHTML=Math.ceil(a).toString()},f=x.totalPrice/c.licensePeriod;b(y,"infinity"!==c.projectAmount?f/parseInt(c.projectAmount,10)/12:0);const k=await(0,u.C3)();await k.upsertLocal(j,{companySize:i["company-size"],projectAmount:i["project-amount"],licensePeriod:i["license-period"],homeCountry:n.name,packages:t,price:x.totalPrice,formSubmitted:!1}),g.style.display="block"},children:"Estimate Price"})]})})}),(0,y.jsx)("div",{className:"price-calculator",id:"price-calculator-result",style:{marginBottom:90,display:"none"},children:(0,y.jsxs)("div",{className:"price-calculator-inner",children:[(0,y.jsx)("h4",{children:"Estimated Price:"}),(0,y.jsx)("br",{}),(0,y.jsxs)("div",{className:"inner",children:[(0,y.jsx)("span",{className:"price-label",children:"\u20ac"}),(0,y.jsx)("span",{id:"total-per-project-per-month",children:"84"}),(0,y.jsx)("span",{className:"per-month",children:"/month"}),(0,y.jsx)("span",{className:"clear"})]}),(0,y.jsx)("br",{}),(0,y.jsx)("br",{}),(0,y.jsx)("div",{className:"clear"}),(0,y.jsx)("div",{className:"button",onClick:()=>{(0,p.h)("open_premium_submit_popup",20),R(!0)},children:"Buy Now \xbb"}),(0,y.jsx)("div",{className:"clear"})]})})]})}),(0,y.jsx)("div",{className:"block dark",id:"faq",children:(0,y.jsxs)("div",{className:"content centered premium-faq",children:[(0,y.jsxs)("h2",{children:["F.A.Q. ",(0,y.jsx)("b",{children:"(click to toggle)"})]}),(0,y.jsxs)("details",{children:[(0,y.jsx)("summary",{children:"Do I need the Premium Plugins?"}),"RxDB Core is open source and many use cases can be implemented with the Open Core part of RxDB. There are many"," ",(0,y.jsx)("a",{href:"/rx-storage.html",target:"_blank",children:"RxStorage"})," ","options and all core plugins that are required for replication, schema validation, encryption and so on, are totally free. As soon as your application is more then a side project you can consider using the premium plugins as an easy way to improve your applications performance and reduce the build size.",(0,y.jsx)("br",{}),"The main benefit of the Premium Plugins is ",(0,y.jsx)("b",{children:"performance"}),". The Premium RxStorage implementations have a better performance so reading and writing data is much faster especially on low-end devices. You can find a performance comparison"," ",(0,y.jsx)("a",{href:"/rx-storage-performance.html",target:"_blank",children:"here"}),". Also there are additional Premium Plugins that can be used to further optimize the performance of your application like the"," ",(0,y.jsx)("a",{href:"/query-optimizer.html",target:"_blank",children:"Query Optimizer"})," ","or the"," ",(0,y.jsx)("a",{href:"/rx-storage-sharding.html",target:"_blank",children:"Sharding"})," ","plugin."]}),(0,y.jsxs)("details",{children:[(0,y.jsx)("summary",{children:"Why is it not for free?"}),"The development of RxDB started in 2016 and after all these years it became clear that big implementation and improvement steps will not be done by the RxDB community. While the community submits valuable pull requests, they are mostly small improvements or bugfixes for specific edge case. Big rewrites and optimizations that require a big effort have only be done by the RxDB maintainer.",(0,y.jsx)("br",{}),"Selling RxDB Premium ensures that there will be always an incentive for someone to add features, keep everything up to date and to further improve and optimize the codebase. This gives the user the confidence that RxDB is a ",(0,y.jsx)("b",{children:"future proof"})," tech stack to build on which lets RxDB stand out compared to similar technologies."]}),(0,y.jsxs)("details",{children:[(0,y.jsx)("summary",{children:"Why is there no free trial period?"}),(0,y.jsxs)("ul",{children:[(0,y.jsx)("li",{children:"RxDB is written in JavaScript and the code of the Premium Plugins does not contain any tracking or measurement code that would send information from your application to our servers in production mode. As soon as someone has the code on his computer, the maintainer has no chance to really ensure that after a free trial period the code is no longer used and deleted."}),(0,y.jsxs)("li",{children:["Before you can use the Premium Plugins you have to debate and sign a license agreement with the maintainer. This is a sophisticated process that creates overhead which distracts the maintainer from writing RxDB code. So handling trial period users is just not manageable. For this reason there is also no monthly subscriptions. Premium access must be paid ",(0,y.jsx)("b",{children:"per year"}),"."]})]})]}),(0,y.jsxs)("details",{children:[(0,y.jsx)("summary",{children:"Why is it not cheaper?"}),"The price of the Premium Plugins is chosen in way that ensures that there can be always one person that develops RxDB ",(0,y.jsx)("b",{children:"full time"}),". Compared to other JavaScript frameworks and developer tools, RxDB satisfies an edge use case for people that want to store data inside of their application on the users device. Most web developers do not need to do that and rely on the traditional client-server stack. So RxDB cannot be sold to that many people which increases the price."]}),(0,y.jsxs)("details",{children:[(0,y.jsx)("summary",{children:"Can I install/build the premium plugins in my CI?"}),(0,y.jsx)("b",{children:"Yes"})," you can safely install and use the Premium Plugins in your CI without additional payment."]}),(0,y.jsxs)("details",{children:[(0,y.jsx)("summary",{children:"Which payment methods are accepted?"}),(0,y.jsx)("b",{children:"Stripe.com"})," is used as payment processor so most known payment options like credit card, PayPal, SEPA transfer and others are available. A list of all options can be found"," ",(0,y.jsx)("a",{href:"https://stripe.com/docs/payments/payment-methods/overview",title:"stripe payment options",target:"_blank",children:"here"}),"."]}),(0,y.jsxs)("details",{children:[(0,y.jsx)("summary",{children:"Can I get a discount?"}),"Discounts are provided for people that have made a significant contribution to RxDB or one of RxDB's dependencies or to the Open Source Community overall. Also for private personal projects there is the option to solve one of the",(0,y.jsx)("a",{href:"https://github.com/pubkey/rxdb/blob/master/orga/premium-tasks.md",target:"_blank",children:"Premium Tasks"}),"to get 2 years access to the Premium Plugins."]}),(0,y.jsxs)("details",{children:[(0,y.jsx)("summary",{children:"Is there any tracking code inside of the premium plugins?"}),"No, the premium plugins themself do not contain any tracking code. When you build your application with RxDB and deploy it to production, it will not make requests from your users to any RxDB server."]})]})}),(0,y.jsx)("div",{className:"block",children:(0,y.jsxs)("div",{className:"content centered",children:[(0,y.jsxs)("h2",{children:["RxDB Premium Plugins ",(0,y.jsx)("b",{className:"underline",children:"Overview"})]}),(0,y.jsxs)("div",{className:"premium-blocks",children:[(0,y.jsx)("a",{href:"/rx-storage-indexeddb.html",target:"_blank",children:(0,y.jsx)("div",{className:"premium-block hover-shadow-middle bg-gradient-right-top",children:(0,y.jsxs)("div",{className:"premium-block-inner",children:[(0,y.jsx)("h4",{children:"RxStorage IndexedDB"}),(0,y.jsxs)("p",{children:["A storage for browsers based on ",(0,y.jsx)("b",{children:"IndexedDB"}),". Has the best latency on writes and smallest build size."]})]})})}),(0,y.jsx)("a",{href:"/rx-storage-opfs.html",target:"_blank",children:(0,y.jsx)("div",{className:"premium-block hover-shadow-middle bg-gradient-left-top",children:(0,y.jsxs)("div",{className:"premium-block-inner",children:[(0,y.jsx)("h4",{children:"RxStorage OPFS"}),(0,y.jsxs)("p",{children:["Currently the RxStorage with best data throughput that can be used in the browser. Based on the ",(0,y.jsx)("b",{children:"OPFS File System Access API"}),"."]})]})})}),(0,y.jsx)("a",{href:"/rx-storage-sqlite.html",target:"_blank",children:(0,y.jsx)("div",{className:"premium-block hover-shadow-middle bg-gradient-right-top",children:(0,y.jsxs)("div",{className:"premium-block-inner",children:[(0,y.jsx)("h4",{children:"RxStorage SQLite"}),(0,y.jsxs)("p",{children:["A fast storage based on ",(0,y.jsx)("b",{children:"SQLite"})," for Servers and Hybrid Apps. Can be used with"," ",(0,y.jsx)("b",{children:"Node.js"}),", ",(0,y.jsx)("b",{children:"Electron"}),", ",(0,y.jsx)("b",{children:"React Native"}),", ",(0,y.jsx)("b",{children:"Capacitor"}),"."]})]})})}),(0,y.jsx)("a",{href:"/rx-storage-shared-worker.html",target:"_blank",children:(0,y.jsx)("div",{className:"premium-block hover-shadow-middle bg-gradient-left-top",children:(0,y.jsxs)("div",{className:"premium-block-inner",children:[(0,y.jsx)("h4",{children:"RxStorage SharedWorker"}),(0,y.jsxs)("p",{children:["A RxStorage wrapper to run the storage inside of a SharedWorker which improves the performance by taking CPU load away from the main process. Used in ",(0,y.jsx)("b",{children:"browsers"}),"."]})]})})}),(0,y.jsx)("a",{href:"/rx-storage-worker.html",target:"_blank",children:(0,y.jsx)("div",{className:"premium-block hover-shadow-middle bg-gradient-left-top",children:(0,y.jsxs)("div",{className:"premium-block-inner",children:[(0,y.jsx)("h4",{children:"RxStorage Worker"}),(0,y.jsx)("p",{children:"A RxStorage wrapper to run the storage inside of a Worker which improves the performance by taking CPU load away from the main process."})]})})}),(0,y.jsx)("a",{href:"/rx-storage-sharding.html",target:"_blank",children:(0,y.jsx)("div",{className:"premium-block hover-shadow-middle bg-gradient-right-top",children:(0,y.jsxs)("div",{className:"premium-block-inner",children:[(0,y.jsx)("h4",{children:"RxStorage Sharding"}),(0,y.jsx)("p",{children:"A wrapper around any other storage that improves performance by applying the sharding technique."})]})})}),(0,y.jsx)("a",{href:"/rx-storage-memory-mapped.html",target:"_blank",children:(0,y.jsx)("div",{className:"premium-block hover-shadow-middle bg-gradient-left-top",children:(0,y.jsxs)("div",{className:"premium-block-inner",children:[(0,y.jsx)("h4",{children:"RxStorage Memory Mapped"}),(0,y.jsx)("p",{children:"A wrapper around any other storage that creates a mapped in-memory copy which improves performance for the initial page load time and write & read operations."})]})})}),(0,y.jsx)("a",{href:"/rx-storage-memory-synced.html",target:"_blank",children:(0,y.jsx)("div",{className:"premium-block hover-shadow-middle bg-gradient-left-top",children:(0,y.jsxs)("div",{className:"premium-block-inner",children:[(0,y.jsx)("h4",{children:"RxStorage Memory Synced"}),(0,y.jsx)("p",{children:"A wrapper around any other storage that creates a synced in-memory copy which improves performance for the initial page load time and write & read operations."})]})})}),(0,y.jsx)("a",{href:"/query-optimizer.html",target:"_blank",children:(0,y.jsx)("div",{className:"premium-block hover-shadow-middle bg-gradient-right-top",children:(0,y.jsxs)("div",{className:"premium-block-inner",children:[(0,y.jsx)("h4",{children:"Query Optimizer"}),(0,y.jsx)("p",{children:"A tool to find the best index for a given query. You can use this during build time to find the best index and then use that index during runtime."})]})})}),(0,y.jsx)("a",{href:"/rx-storage-localstorage-meta-optimizer.html",target:"_blank",children:(0,y.jsx)("div",{className:"premium-block hover-shadow-middle bg-gradient-left-top",children:(0,y.jsxs)("div",{className:"premium-block-inner",children:[(0,y.jsx)("h4",{children:"RxStorage Localstorage Meta Optimizer"}),(0,y.jsxs)("p",{children:["A wrapper around any other storage which optimizes the initial page load one by using localstorage for meta key-value document. Only works in ",(0,y.jsx)("b",{children:"browsers"}),"."]})]})})}),(0,y.jsx)("a",{href:"/encryption.html",target:"_blank",children:(0,y.jsx)("div",{className:"premium-block hover-shadow-middle bg-gradient-right-top",children:(0,y.jsxs)("div",{className:"premium-block-inner",children:[(0,y.jsx)("h4",{children:"WebCrypto Encryption"}),(0,y.jsx)("p",{children:"A faster and more secure encryption plugin based on the Web Crypto API."})]})})}),(0,y.jsx)("a",{href:"/rx-storage-filesystem-node.html",target:"_blank",children:(0,y.jsx)("div",{className:"premium-block hover-shadow-middle bg-gradient-left-top",children:(0,y.jsxs)("div",{className:"premium-block-inner",children:[(0,y.jsx)("h4",{children:"RxStorage Filesystem Node"}),(0,y.jsxs)("p",{children:["A fast RxStorage based on the ",(0,y.jsx)("b",{children:"Node.js"})," Filesystem."]})]})})}),(0,y.jsx)("a",{href:"/logger.html",target:"_blank",children:(0,y.jsx)("div",{className:"premium-block hover-shadow-middle bg-gradient-right-top",children:(0,y.jsxs)("div",{className:"premium-block-inner",children:[(0,y.jsx)("h4",{children:"Logger"}),(0,y.jsx)("p",{children:"A logging plugin useful to debug performance problems and for monitoring with Application Performance Monitoring (APM) tools like Bugsnag, Datadog, Elastic, Sentry and others"})]})})}),(0,y.jsx)("a",{href:"/rx-server.html",target:"_blank",children:(0,y.jsx)("div",{className:"premium-block hover-shadow-middle bg-gradient-left-top",children:(0,y.jsxs)("div",{className:"premium-block-inner",children:[(0,y.jsx)("h4",{children:"RxServer Fastify Adapter"}),(0,y.jsx)("p",{children:"An adapter to use the RxServer with fastify instead of express. Used to have better performance when serving requests."})]})})}),(0,y.jsx)("a",{href:"/logger.html",target:"_blank",children:(0,y.jsx)("div",{className:"premium-block hover-shadow-middle bg-gradient-right-top",children:(0,y.jsxs)("div",{className:"premium-block-inner",children:[(0,y.jsx)("h4",{children:"RxServer Koa Adapter"}),(0,y.jsx)("p",{children:"An adapter to use the RxServer with Koa instead of express. Used to have better performance when serving requests."})]})})}),(0,y.jsx)("a",{href:"/fulltext-search.html",target:"_blank",children:(0,y.jsx)("div",{className:"premium-block hover-shadow-middle bg-gradient-right-top",children:(0,y.jsxs)("div",{className:"premium-block-inner",children:[(0,y.jsx)("h4",{children:"FlexSearch"}),(0,y.jsx)("p",{children:"A plugin to efficiently run local fulltext search indexing and queries."})]})})}),(0,y.jsx)("a",{href:"/reactivity.html",target:"_blank",children:(0,y.jsx)("div",{className:"premium-block hover-shadow-middle bg-gradient-left-top",children:(0,y.jsxs)("div",{className:"premium-block-inner",children:[(0,y.jsx)("h4",{children:"Reactivity Vue"}),(0,y.jsx)("p",{children:"An extension for Vue.js to get vue shallow-ref objects to observe RxDB state instead of rxjs observables."})]})})}),(0,y.jsx)("a",{href:"/reactivity.html",target:"_blank",children:(0,y.jsx)("div",{className:"premium-block hover-shadow-middle bg-gradient-right-top",children:(0,y.jsxs)("div",{className:"premium-block-inner",children:[(0,y.jsx)("h4",{children:"Reactivity Preact Signals"}),(0,y.jsx)("p",{children:"An extension for react/preact to get preact signals to observe RxDB state instead of rxjs observables."})]})})})]})]})}),(0,y.jsx)(k,{open:S,onClose:()=>{R(!1)}})]})})]})}function f(e,a){if(void 0===a)return;const r=document.querySelector("[name="+e+"]");r&&(r.type&&"checkbox"===r.type?r.checked=a:r.value=a)}function k(e){let{onClose:a,open:r}=e;return(0,y.jsx)(c.A,{className:"modal-consulting-page",open:r,width:"auto",onCancel:()=>{a()},closeIcon:null,footer:null,children:(0,y.jsxs)("iframe",{style:{width:"100%",height:"70vh",borderRadius:"32px"},id:"request-project-form",src:"https://webforms.pipedrive.com/f/c5cAfYVe373ccihUfJkyxdU2zg5Iz2liQB09nU6jOQCyRXOJy6W7qPdQdmomvugRj5",children:["Your browser doesn't support iframes,"," ",(0,y.jsx)("a",{href:"https://webforms.pipedrive.com/f/c5cAfYVe373ccihUfJkyxdU2zg5Iz2liQB09nU6jOQCyRXOJy6W7qPdQdmomvugRj5",target:"_blank",rel:"nofollow",children:"Click here"})]})})}}}]);