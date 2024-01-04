"use strict";(self.webpackChunkrxdb=self.webpackChunkrxdb||[]).push([[8814],{7854:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>s,contentTitle:()=>i,default:()=>d,frontMatter:()=>a,metadata:()=>g,toc:()=>l});var r=t(5893),o=t(1151);const a={title:"Logger \ud83d\udc51",slug:"logger.html"},i="RxDB Logger Plugin",g={id:"logger",title:"Logger \ud83d\udc51",description:"With the logger plugin you can log all operations to the storage layer of your RxDatabase.",source:"@site/docs/logger.md",sourceDirName:".",slug:"/logger.html",permalink:"/logger.html",draft:!1,unlisted:!1,editUrl:"https://github.com/pubkey/rxdb/tree/master/docs-src/docs/logger.md",tags:[],version:"current",frontMatter:{title:"Logger \ud83d\udc51",slug:"logger.html"},sidebar:"tutorialSidebar",previous:{title:"Query Optimizer \ud83d\udc51",permalink:"/query-optimizer.html"},next:{title:"Plugins",permalink:"/plugins.html"}},s={},l=[{value:"Using the logger plugin",id:"using-the-logger-plugin",level:2},{value:"Specify what to be logged",id:"specify-what-to-be-logged",level:2},{value:"Using custom logging functions",id:"using-custom-logging-functions",level:2}];function c(e){const n={a:"a",code:"code",h1:"h1",h2:"h2",p:"p",pre:"pre",strong:"strong",...(0,o.a)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(n.h1,{id:"rxdb-logger-plugin",children:"RxDB Logger Plugin"}),"\n",(0,r.jsxs)(n.p,{children:["With the logger plugin you can log all operations to the ",(0,r.jsx)(n.a,{href:"/rx-storage.html",children:"storage layer"})," of your ",(0,r.jsx)(n.a,{href:"/rx-database.html",children:"RxDatabase"}),"."]}),"\n",(0,r.jsxs)(n.p,{children:["This is useful to debug performance problems and for monitoring with Application Performance Monitoring (APM) tools like ",(0,r.jsx)(n.strong,{children:"Bugsnag"}),", ",(0,r.jsx)(n.strong,{children:"Datadog"}),", ",(0,r.jsx)(n.strong,{children:"Elastic"}),", ",(0,r.jsx)(n.strong,{children:"Sentry"})," and others."]}),"\n",(0,r.jsxs)(n.p,{children:["Notice that the logger plugin is not part of the RxDB core, it is part of ",(0,r.jsx)(n.a,{href:"/premium",children:"\ud83d\udc51 RxDB Premium"}),"."]}),"\n",(0,r.jsx)("p",{align:"center",children:(0,r.jsx)("img",{src:"./files/logger.png",alt:"RxDB logger example",width:"600px"})}),"\n",(0,r.jsx)(n.h2,{id:"using-the-logger-plugin",children:"Using the logger plugin"}),"\n",(0,r.jsxs)(n.p,{children:["The logger is a wrapper that can be wrapped around any ",(0,r.jsx)(n.a,{href:"/rx-storage.html",children:"RxStorage"}),". Once your storage is wrapped, you can create your database with the wrapped storage and the logging will automatically happen."]}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-ts",children:"\nimport {\n    wrappedLoggerStorage\n} from 'rxdb-premium/plugins/logger';\nimport {\n    getRxStorageIndexedDB\n} from 'rxdb-premium/plugins/storage-indexeddb';\n\n\n// wrap a storage with the logger\nconst loggingStorage = wrappedLoggerStorage({\n    storage: getRxStorageIndexedDB({})\n});\n\n// create your database with the wrapped storage\nconst db = await createRxDatabase({\n    name: 'mydatabase',\n    storage: loggingStorage\n});\n\n// create collections etc...\n"})}),"\n",(0,r.jsx)(n.h2,{id:"specify-what-to-be-logged",children:"Specify what to be logged"}),"\n",(0,r.jsxs)(n.p,{children:["By default, the plugin will log all operations and it will also run a ",(0,r.jsx)(n.code,{children:"console.time()/console.timeEnd()"})," around each operation. You can specify what to log so that your logs are less noisy. For this you provide a settings object when calling ",(0,r.jsx)(n.code,{children:"wrappedLoggerStorage()"}),"."]}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-ts",children:"const loggingStorage = wrappedLoggerStorage({\n    storage: getRxStorageIndexedDB({}),\n    settings: {\n        // can used to prefix all log strings, default=''\n        prefix: 'my-prefix',\n\n\n        /**\n         * Be default, all settings are true.\n         */\n\n        // if true, it will log timings with console.time() and console.timeEnd()\n        times: true,\n\n        // if false, it will not log meta storage instances like used in replication\n        metaStorageInstances: true,\n\n        // operations\n        bulkWrite: true,\n        findDocumentsById: true,\n        query: true,\n        count: true,\n        info: true,\n        getAttachmentData: true,\n        getChangedDocumentsSince: true,\n        cleanup: true,\n        close: true,\n        remove: true        \n    }\n});\n"})}),"\n",(0,r.jsx)(n.h2,{id:"using-custom-logging-functions",children:"Using custom logging functions"}),"\n",(0,r.jsx)(n.p,{children:"With the logger plugin you can also run custom log functions for all operations."}),"\n",(0,r.jsx)(n.pre,{children:(0,r.jsx)(n.code,{className:"language-ts",children:"const loggingStorage = wrappedLoggerStorage({\n    storage: getRxStorageIndexedDB({}),\n    onOperationStart: (operationsName, logId, args) => void,\n    onOperationEnd: (operationsName, logId, args) => void,\n    onOperationError: (operationsName, logId, args, error) => void\n});\n"})})]})}function d(e={}){const{wrapper:n}={...(0,o.a)(),...e.components};return n?(0,r.jsx)(n,{...e,children:(0,r.jsx)(c,{...e})}):c(e)}},1151:(e,n,t)=>{t.d(n,{Z:()=>g,a:()=>i});var r=t(7294);const o={},a=r.createContext(o);function i(e){const n=r.useContext(a);return r.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function g(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(o):e.components||o:i(e.components),r.createElement(a.Provider,{value:n},e.children)}}}]);