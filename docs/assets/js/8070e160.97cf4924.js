"use strict";(self.webpackChunkrxdb=self.webpackChunkrxdb||[]).push([[2651],{9759:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>l,contentTitle:()=>r,default:()=>h,frontMatter:()=>s,metadata:()=>o,toc:()=>d});var a=t(5893),i=t(1151);const s={title:"\ud83d\ude80 Quickstart",slug:"quickstart.html"},r="RxDB Quickstart",o={id:"quickstart",title:"\ud83d\ude80 Quickstart",description:"Welcome to the RxDB Quickstart. Here we'll create a simple realtime TODO-app with RxDB to demonstrate the basic concepts.",source:"@site/docs/quickstart.md",sourceDirName:".",slug:"/quickstart.html",permalink:"/quickstart.html",draft:!1,unlisted:!1,editUrl:"https://github.com/pubkey/rxdb/tree/master/docs-src/docs/quickstart.md",tags:[],version:"current",frontMatter:{title:"\ud83d\ude80 Quickstart",slug:"quickstart.html"},sidebar:"tutorialSidebar",next:{title:"Installation",permalink:"/install.html"}},l={},d=[{value:"Installation",id:"installation",level:2},{value:"Enable dev-mode",id:"enable-dev-mode",level:2},{value:"Creating an RxDatabase",id:"creating-an-rxdatabase",level:2},{value:"Choose an RxStorage adapter",id:"choose-an-rxstorage-adapter",level:3},{value:"Create the RxDatabase",id:"create-the-rxdatabase",level:3},{value:"Create an RxCollection",id:"create-an-rxcollection",level:3},{value:"Creating a schema for a collection",id:"creating-a-schema-for-a-collection",level:4},{value:"Adding an RxCollection to the RxDatabase",id:"adding-an-rxcollection-to-the-rxdatabase",level:4},{value:"Write Operations",id:"write-operations",level:2},{value:"Inserting a document",id:"inserting-a-document",level:3},{value:"Updating a document",id:"updating-a-document",level:3},{value:"Delete a document",id:"delete-a-document",level:3},{value:"Query Operations",id:"query-operations",level:2},{value:"Simple Query",id:"simple-query",level:3},{value:"Observing data",id:"observing-data",level:2},{value:"Observing queries",id:"observing-queries",level:3},{value:"Subscribe to a document value",id:"subscribe-to-a-document-value",level:3},{value:"Replication",id:"replication",level:3},{value:"Next steps",id:"next-steps",level:2}];function c(e){const n={a:"a",code:"code",h1:"h1",h2:"h2",h3:"h3",h4:"h4",li:"li",p:"p",pre:"pre",strong:"strong",ul:"ul",...(0,i.a)(),...e.components};return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(n.h1,{id:"rxdb-quickstart",children:"RxDB Quickstart"}),"\n",(0,a.jsx)(n.p,{children:"Welcome to the RxDB Quickstart. Here we'll create a simple realtime TODO-app with RxDB to demonstrate the basic concepts."}),"\n",(0,a.jsx)(n.h2,{id:"installation",children:"Installation"}),"\n",(0,a.jsx)(n.p,{children:"RxDB is distributed via npm and uses rxjs as a dependency. Install both with:"}),"\n",(0,a.jsx)(n.p,{children:(0,a.jsx)(n.code,{children:"npm install rxjs rxdb --save"})}),"\n",(0,a.jsx)(n.h2,{id:"enable-dev-mode",children:"Enable dev-mode"}),"\n",(0,a.jsxs)(n.p,{children:["When you use RxDB in development, you should enable the ",(0,a.jsx)(n.a,{href:"/dev-mode.html",children:"dev-mode plugin"})," which adds helpful checks and validations and tells you if you do something wrong."]}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-ts",children:"import { addRxPlugin } from 'rxdb';\nimport { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';\naddRxPlugin(RxDBDevModePlugin);\n"})}),"\n",(0,a.jsx)(n.h2,{id:"creating-an-rxdatabase",children:"Creating an RxDatabase"}),"\n",(0,a.jsx)(n.h3,{id:"choose-an-rxstorage-adapter",children:"Choose an RxStorage adapter"}),"\n",(0,a.jsxs)(n.p,{children:["RxDB can be used in a range of JavaScript runtime environments, and depending on the runtime the appropriate ",(0,a.jsx)(n.a,{href:"/rx-storage.html",children:"RxStorage adapter"})," must be used. For ",(0,a.jsx)(n.strong,{children:"browser"})," applications it is recommended to start with the ",(0,a.jsx)(n.a,{href:"/rx-storage-dexie.html",children:"Dexie.js RxStorage adapter"})," which is bundled with RxDB."]}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-ts",children:"import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';\n"})}),"\n",(0,a.jsx)(n.h3,{id:"create-the-rxdatabase",children:"Create the RxDatabase"}),"\n",(0,a.jsxs)(n.p,{children:["You can now create the ",(0,a.jsx)(n.a,{href:"/rx-database.html",children:"RxDatabase"})," instance:"]}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-ts",children:"import { createRxDatabase } from 'rxdb';\nimport { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';\n\nconst myDatabase = await createRxDatabase({\n  name: 'mydatabase',\n  storage: getRxStorageDexie()\n});\n"})}),"\n",(0,a.jsx)(n.h3,{id:"create-an-rxcollection",children:"Create an RxCollection"}),"\n",(0,a.jsxs)(n.p,{children:["An RxDatabase contains ",(0,a.jsx)(n.a,{href:"/rx-collection.html",children:"RxCollection"}),"s for storing and querying data. A collection is similar to a SQL table, and individual records are stored in the collection as JSON documents. An RxDatabase can have as many collections as you need."]}),"\n",(0,a.jsx)(n.h4,{id:"creating-a-schema-for-a-collection",children:"Creating a schema for a collection"}),"\n",(0,a.jsxs)(n.p,{children:["RxDB uses ",(0,a.jsx)(n.a,{href:"https://json-schema.org",children:"JSON Schema"})," to describe the documents stored in each collection. For our example app we create a simple schema that describes a todo document:"]}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-ts",children:"const todoSchema = {\n    version: 0,\n    primaryKey: 'id',\n    type: 'object',\n    properties: {\n        id: {\n            type: 'string',\n            maxLength: 100 // <- the primary key must have set maxLength\n        },\n        name: {\n            type: 'string'\n        },\n        done: {\n            type: 'boolean'\n        },\n        timestamp: {\n            type: 'string',\n            format: 'date-time'\n        }\n    },\n    required: ['id', 'name', 'done', 'timestamp']\n}\n"})}),"\n",(0,a.jsx)(n.h4,{id:"adding-an-rxcollection-to-the-rxdatabase",children:"Adding an RxCollection to the RxDatabase"}),"\n",(0,a.jsxs)(n.p,{children:["With this schema we can now add the ",(0,a.jsx)(n.code,{children:"todos"})," collection to the database:"]}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-ts",children:"await myDatabase.addCollections({\n  todos: {\n    schema: todoSchema\n  }\n});\n"})}),"\n",(0,a.jsx)(n.h2,{id:"write-operations",children:"Write Operations"}),"\n",(0,a.jsx)(n.p,{children:"Now that we have an RxCollection we can store some documents in it."}),"\n",(0,a.jsx)(n.h3,{id:"inserting-a-document",children:"Inserting a document"}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-ts",children:"const myDocument = await myDatabase.todos.insert({\n    id: 'todo1',\n    name: 'Learn RxDB',\n    done: false,\n    timestamp: new Date().toISOString()\n});\n"})}),"\n",(0,a.jsx)(n.h3,{id:"updating-a-document",children:"Updating a document"}),"\n",(0,a.jsxs)(n.p,{children:["There are multiple ways to update an RxDocument. The simplest is with ",(0,a.jsx)(n.code,{children:"patch"}),":"]}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-ts",children:"await myDocument.patch({\n    done: true\n});\n"})}),"\n",(0,a.jsxs)(n.p,{children:["You can also use ",(0,a.jsx)(n.code,{children:"modify"})," which takes a plain JavaScript function that mutates the document state and returns the mutated version."]}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-ts",children:"await myDocument.modify(docData => {\n    docData.done = true;\n    return docData;\n});\n"})}),"\n",(0,a.jsx)(n.h3,{id:"delete-a-document",children:"Delete a document"}),"\n",(0,a.jsxs)(n.p,{children:["You can soft delete an RxDocument by calling ",(0,a.jsx)(n.code,{children:"myDocument.remove()"}),". This will set the document's state to ",(0,a.jsx)(n.code,{children:"DELETED"})," which ensures that it will not be returned in query results. RxDB keeps deleted documents in the database so that it is able to sync the deleted state to other instances during database ",(0,a.jsx)(n.a,{href:"/replication.html",children:"replication"}),". Deleted documents can be purged in a later point with the ",(0,a.jsx)(n.a,{href:"/cleanup.html",children:"cleanup plugin"})," if needed."]}),"\n",(0,a.jsx)(n.h2,{id:"query-operations",children:"Query Operations"}),"\n",(0,a.jsx)(n.h3,{id:"simple-query",children:"Simple Query"}),"\n",(0,a.jsxs)(n.p,{children:["Like many NoSQL databases, RxDB uses the ",(0,a.jsx)(n.a,{href:"https://github.com/cloudant/mango",children:"Mango syntax"})," for query operations. To run a query, you first create an RxQuery object with ",(0,a.jsx)(n.code,{children:"myCollection.find()"})," and then call ",(0,a.jsx)(n.code,{children:".exec()"})," on that object to fetch the query results."]}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-ts",children:"const foundDocuments = await myDatabase.todos.find({\n    selector: {\n        done: {\n            $eq: false\n        }\n    }\n}).exec();\n"})}),"\n",(0,a.jsxs)(n.p,{children:["More Mango query examples can be found ",(0,a.jsx)(n.a,{href:"./rx-query.html#examples",children:"here"}),". In addition to the ",(0,a.jsx)(n.code,{children:".find()"})," RxQuery, RxDB has additional query methods for fetching the documents you need:"]}),"\n",(0,a.jsxs)(n.ul,{children:["\n",(0,a.jsx)(n.li,{children:(0,a.jsx)(n.a,{href:"/rx-collection.html#findone",children:"findOne()"})}),"\n",(0,a.jsx)(n.li,{children:(0,a.jsx)(n.a,{href:"/rx-collection.html#findByIds",children:"findByIds()"})}),"\n"]}),"\n",(0,a.jsx)(n.h2,{id:"observing-data",children:"Observing data"}),"\n",(0,a.jsxs)(n.p,{children:["You might want to subscribe to data changes so that your UI is always up-to-date with the data stored on disc. RxDB allows you to subscribe to data changes even when the change happens in another part of your application, another browser tab, or during database ",(0,a.jsx)(n.a,{href:"/replication.html",children:"replication/synchronization"}),"."]}),"\n",(0,a.jsx)(n.h3,{id:"observing-queries",children:"Observing queries"}),"\n",(0,a.jsxs)(n.p,{children:["To observe changes to records returned from a query, instead of calling ",(0,a.jsx)(n.code,{children:".exec()"})," you get the observable of the RxQuery object via ",(0,a.jsx)(n.code,{children:".$"})," and then subscribe to it."]}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-ts",children:"const observable = myDatabase.todos.find({\n    selector: {\n        done: {\n            $eq: false\n        }\n    }\n}).$;\nobservable.subscribe(notDone => {\n    console.log('Currently have ' + notDone.length + 'things to do');\n});\n"})}),"\n",(0,a.jsx)(n.h3,{id:"subscribe-to-a-document-value",children:"Subscribe to a document value"}),"\n",(0,a.jsxs)(n.p,{children:["You can also subscribe to the fields of a single RxDocument. Add the ",(0,a.jsx)(n.code,{children:"$"})," sign to the desired field and then subscribe to the returned observable."]}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-ts",children:"myDocument.done$.subscribe(isDone => {\n    console.log('done: ' + isDone);\n});\n"})}),"\n",(0,a.jsx)(n.h3,{id:"replication",children:"Replication"}),"\n",(0,a.jsxs)(n.p,{children:["RxDB has multiple ",(0,a.jsx)(n.a,{href:"/replication.html",children:"replication plugins"})," to replicated database state with a server.\nThe easiest way to replicate data between your clients devices it the ",(0,a.jsx)(n.a,{href:"/replication-webrtc.html",children:"WebRTC replication plugin"})," that replicates data between devices without a centralized server. This makes it easy to try out replication without having to host anything."]}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-ts",children:"import {\n    replicateWebRTC,\n    getConnectionHandlerSimplePeer\n} from 'rxdb/plugins/replication-webrtc';\nreplicateWebRTC({\n    collection: myDatabase.todos,\n    connectionHandlerCreator: getConnectionHandlerSimplePeer({}),\n    topic: '', // <- set any app-specific room id here.\n    secret: 'mysecret',\n    pull: {},\n    push: {},\n})\n"})}),"\n",(0,a.jsx)(n.h2,{id:"next-steps",children:"Next steps"}),"\n",(0,a.jsxs)(n.p,{children:["You are now ready to dive deeper into RxDB.\nThere is a full implementation of the ",(0,a.jsx)(n.a,{href:"https://github.com/pubkey/rxdb-quickstart",children:"quickstart guide here"})," so you can clone that repository and play with the code.\nAlso please continue reading the documentation, join the community on our ",(0,a.jsx)(n.a,{href:"./chat",children:"Discord chat"}),", and star the ",(0,a.jsx)(n.a,{href:"https://github.com/pubkey/rxdb",children:"GitHub repo"}),". If you are using RxDB in a production environment and able to support its continued development, please take a look at the ",(0,a.jsx)(n.a,{href:"/premium",children:"\ud83d\udc51 Premium package"})," which includes additional plugins and utilities."]})]})}function h(e={}){const{wrapper:n}={...(0,i.a)(),...e.components};return n?(0,a.jsx)(n,{...e,children:(0,a.jsx)(c,{...e})}):c(e)}},1151:(e,n,t)=>{t.d(n,{Z:()=>o,a:()=>r});var a=t(7294);const i={},s=a.createContext(i);function r(e){const n=a.useContext(s);return a.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function o(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(i):e.components||i:r(e.components),a.createElement(s.Provider,{value:n},e.children)}}}]);