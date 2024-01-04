"use strict";(self.webpackChunkrxdb=self.webpackChunkrxdb||[]).push([[6017],{2443:(e,r,t)=>{t.r(r),t.d(r,{assets:()=>l,contentTitle:()=>a,default:()=>m,frontMatter:()=>s,metadata:()=>i,toc:()=>c});var n=t(5893),o=t(1151);const s={title:"Memory RxStorage",slug:"rx-storage-memory.html"},a="Memory RxStorage",i={id:"rx-storage-memory",title:"Memory RxStorage",description:"\x3c!-- keywords:",source:"@site/docs/rx-storage-memory.md",sourceDirName:".",slug:"/rx-storage-memory.html",permalink:"/rx-storage-memory.html",draft:!1,unlisted:!1,editUrl:"https://github.com/pubkey/rxdb/tree/master/docs-src/docs/rx-storage-memory.md",tags:[],version:"current",frontMatter:{title:"Memory RxStorage",slug:"rx-storage-memory.html"},sidebar:"tutorialSidebar",previous:{title:"LokiJS RxStorage",permalink:"/rx-storage-lokijs.html"},next:{title:"IndexedDB RxStorage \ud83d\udc51",permalink:"/rx-storage-indexeddb.html"}},l={},c=[{value:"Pros",id:"pros",level:3},{value:"Cons",id:"cons",level:3}];function d(e){const r={code:"code",h1:"h1",h3:"h3",li:"li",p:"p",pre:"pre",ul:"ul",...(0,o.a)(),...e.components};return(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(r.h1,{id:"memory-rxstorage",children:"Memory RxStorage"}),"\n",(0,n.jsxs)(r.p,{children:["The Memory ",(0,n.jsx)(r.code,{children:"RxStorage"})," is based on plain in memory arrays and objects. It can be used in all environments and is made for performance.\nUse this storage when you need a really fast database like in your unit tests or when you use RxDB with server side rendering."]}),"\n",(0,n.jsx)(r.h3,{id:"pros",children:"Pros"}),"\n",(0,n.jsxs)(r.ul,{children:["\n",(0,n.jsx)(r.li,{children:"Really fast. Uses binary search on all operations."}),"\n",(0,n.jsx)(r.li,{children:"Small build size"}),"\n"]}),"\n",(0,n.jsx)(r.h3,{id:"cons",children:"Cons"}),"\n",(0,n.jsxs)(r.ul,{children:["\n",(0,n.jsx)(r.li,{children:"No persistence"}),"\n"]}),"\n",(0,n.jsx)(r.pre,{children:(0,n.jsx)(r.code,{className:"language-ts",children:"import {\n    createRxDatabase\n} from 'rxdb';\nimport {\n    getRxStorageMemory\n} from 'rxdb/plugins/storage-memory';\n\nconst db = await createRxDatabase({\n    name: 'exampledb',\n    storage: getRxStorageMemory()\n});\n"})})]})}function m(e={}){const{wrapper:r}={...(0,o.a)(),...e.components};return r?(0,n.jsx)(r,{...e,children:(0,n.jsx)(d,{...e})}):d(e)}},1151:(e,r,t)=>{t.d(r,{Z:()=>i,a:()=>a});var n=t(7294);const o={},s=n.createContext(o);function a(e){const r=n.useContext(s);return n.useMemo((function(){return"function"==typeof e?e(r):{...r,...e}}),[r,e])}function i(e){let r;return r=e.disableParentContext?"function"==typeof e.components?e.components(o):e.components||o:a(e.components),n.createElement(s.Provider,{value:r},e.children)}}}]);