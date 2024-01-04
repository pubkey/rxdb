"use strict";(self.webpackChunkrxdb=self.webpackChunkrxdb||[]).push([[8994],{4592:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>i,contentTitle:()=>l,default:()=>u,frontMatter:()=>s,metadata:()=>c,toc:()=>r});var a=t(5893),o=t(1151);const s={title:"RxDocument",slug:"rx-document.html"},l="RxDocument",c={id:"rx-document",title:"RxDocument",description:"A document is a single object which is stored in a collection. It can be compared to a single record in a relational database table. You get an RxDocument either as return on inserts, or as result-set of queries.",source:"@site/docs/rx-document.md",sourceDirName:".",slug:"/rx-document.html",permalink:"/rx-document.html",draft:!1,unlisted:!1,editUrl:"https://github.com/pubkey/rxdb/tree/master/docs-src/docs/rx-document.md",tags:[],version:"current",frontMatter:{title:"RxDocument",slug:"rx-document.html"},sidebar:"tutorialSidebar",previous:{title:"RxCollection",permalink:"/rx-collection.html"},next:{title:"RxQuery",permalink:"/rx-query.html"}},i={},r=[{value:"insert",id:"insert",level:2},{value:"find",id:"find",level:2},{value:"Functions",id:"functions",level:2},{value:"get()",id:"get",level:3},{value:"get$()",id:"get-1",level:3},{value:"proxy-get",id:"proxy-get",level:3},{value:"update()",id:"update",level:3},{value:"modify()",id:"modify",level:3},{value:"patch()",id:"patch",level:3},{value:"Prevent conflicts with the incremental methods",id:"prevent-conflicts-with-the-incremental-methods",level:3},{value:"getLatest()",id:"getlatest",level:3},{value:"Observe $",id:"observe-",level:3},{value:"remove()",id:"remove",level:3},{value:"deleted$",id:"deleted",level:3},{value:"get deleted",id:"get-deleted",level:3},{value:"toJSON()",id:"tojson",level:3},{value:"toMutableJSON()",id:"tomutablejson",level:3},{value:"NOTICE: All methods of RxDocument are bound to the instance",id:"notice-all-methods-of-rxdocument-are-bound-to-the-instance",level:2},{value:"isRxDocument",id:"isrxdocument",level:3}];function d(e){const n={a:"a",code:"code",h1:"h1",h2:"h2",h3:"h3",p:"p",pre:"pre",strong:"strong",...(0,o.a)(),...e.components};return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(n.h1,{id:"rxdocument",children:"RxDocument"}),"\n",(0,a.jsxs)(n.p,{children:["A document is a single object which is stored in a collection. It can be compared to a single record in a relational database table. You get an ",(0,a.jsx)(n.code,{children:"RxDocument"})," either as return on inserts, or as result-set of queries."]}),"\n",(0,a.jsx)(n.h2,{id:"insert",children:"insert"}),"\n",(0,a.jsx)(n.p,{children:"To insert a document into a collection, you have to call the collection's .insert()-function."}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-js",children:"myCollection.insert({\n  name: 'foo',\n  lastname: 'bar'\n});\n"})}),"\n",(0,a.jsx)(n.h2,{id:"find",children:"find"}),"\n",(0,a.jsxs)(n.p,{children:["To find documents in a collection, you have to call the collection's .find()-function. ",(0,a.jsx)(n.a,{href:"/rx-query.html",children:"See RxQuery"}),"."]}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-js",children:"myCollection.find().exec() // <- find all documents\n  .then(documents => console.dir(documents));\n"})}),"\n",(0,a.jsx)(n.h2,{id:"functions",children:"Functions"}),"\n",(0,a.jsx)(n.h3,{id:"get",children:"get()"}),"\n",(0,a.jsx)(n.p,{children:"This will get a single field of the document. If the field is encrypted, it will be automatically decrypted before returning."}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-js",children:"var name = myDocument.get('name'); // returns the name\n"})}),"\n",(0,a.jsx)(n.h3,{id:"get-1",children:"get$()"}),"\n",(0,a.jsx)(n.p,{children:"This function returns an observable of the given paths-value.\nThe current value of this path will be emitted each time the document changes."}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-js",children:"// get the live-updating value of 'name'\nvar isName;\nmyDocument.get$('name')\n  .subscribe(newName => {\n    isName = newName;\n  });\n\nawait myDocument.incrementalPatch({name: 'foobar2'});\nconsole.dir(isName); // isName is now 'foobar2'\n"})}),"\n",(0,a.jsx)(n.h3,{id:"proxy-get",children:"proxy-get"}),"\n",(0,a.jsxs)(n.p,{children:["All properties of a ",(0,a.jsx)(n.code,{children:"RxDocument"})," are assigned as getters so you can also directly access values instead of using the get()-function."]}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-js",children:"  // Identical to myDocument.get('name');\n  var name = myDocument.name;\n  // Can also get nested values.\n  var nestedValue = myDocument.whatever.nestedfield;\n\n  // Also usable with observables:\n  myDocument.firstName$.subscribe(newName => console.log('name is: ' + newName));\n  // > 'name is: Stefe'\n  await myDocument.incrementalPatch({firstName: 'Steve'});\n  // > 'name is: Steve'\n"})}),"\n",(0,a.jsx)(n.h3,{id:"update",children:"update()"}),"\n",(0,a.jsxs)(n.p,{children:["Updates the document based on the ",(0,a.jsx)(n.a,{href:"https://docs.mongodb.com/manual/reference/operator/update-field/",children:"mongo-update-syntax"}),", based on the ",(0,a.jsx)(n.a,{href:"https://github.com/kofrasa/mingo#updating-documents",children:"mingo library"}),"."]}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-js",children:"\n/**\n * If not done before, you have to add the update plugin.\n */\nimport { addRxPlugin } from 'rxdb';\nimport { RxDBUpdatePlugin } from 'rxdb/plugins/update';\naddRxPlugin(RxDBUpdatePlugin);\n\nawait myDocument.update({\n    $inc: {\n        age: 1 // increases age by 1\n    },\n    $set: {\n        firstName: 'foobar' // sets firstName to foobar\n    }\n});\n"})}),"\n",(0,a.jsx)(n.h3,{id:"modify",children:"modify()"}),"\n",(0,a.jsx)(n.p,{children:"Updates a documents data based on a function that mutates the current data and returns the new value."}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-js",children:"\nconst changeFunction = (oldData) => {\n    oldData.age = oldData.age + 1;\n    oldData.name = 'foooobarNew';\n    return oldData;\n}\nawait myDocument.modify(changeFunction);\nconsole.log(myDocument.name); // 'foooobarNew'\n"})}),"\n",(0,a.jsx)(n.h3,{id:"patch",children:"patch()"}),"\n",(0,a.jsx)(n.p,{children:"Overwrites the given attributes over the documents data."}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-js",children:"await myDocument.patch({\n  name: 'Steve',\n  age: undefined // setting an attribute to undefined will remove it\n});\nconsole.log(myDocument.name); // 'Steve'\n"})}),"\n",(0,a.jsx)(n.h3,{id:"prevent-conflicts-with-the-incremental-methods",children:"Prevent conflicts with the incremental methods"}),"\n",(0,a.jsxs)(n.p,{children:["Making a normal change to the non-latest version of a ",(0,a.jsx)(n.code,{children:"RxDocument"})," will lead to a ",(0,a.jsx)(n.code,{children:"409 CONFLICT"})," error because RxDB\nuses ",(0,a.jsx)(n.a,{href:"/transactions-conflicts-revisions.html",children:"revision checks"})," instead of transactions."]}),"\n",(0,a.jsxs)(n.p,{children:["To make a change to a document, no matter what the current state is, you can use the ",(0,a.jsx)(n.code,{children:"incremental"})," methods:"]}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-js",children:"// update\nawait myDocument.incrementalUpdate({\n    $inc: {\n        age: 1 // increases age by 1\n    }\n});\n\n// modify\nawait myDocument.incrementalModify(docData => {\n  docData.age = docData.age + 1;\n  return docData;\n});\n\n// patch\nawait myDocument.incrementalPatch({\n  age: 100\n});\n\n// remove\nawait myDocument.incrementalRemove({\n  age: 100\n});\n"})}),"\n",(0,a.jsx)(n.h3,{id:"getlatest",children:"getLatest()"}),"\n",(0,a.jsxs)(n.p,{children:["Returns the latest known state of the ",(0,a.jsx)(n.code,{children:"RxDocument"}),"."]}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-js",children:"const myDocument = await myCollection.findOne('foobar').exec();\nconst docAfterEdit = await myDocument.incrementalPatch({\n  age: 10\n});\nconst latestDoc = myDocument.getLatest();\nconsole.log(docAfterEdit === latestDoc); // > true\n"})}),"\n",(0,a.jsx)(n.h3,{id:"observe-",children:"Observe $"}),"\n",(0,a.jsxs)(n.p,{children:["Calling this will return an ",(0,a.jsx)(n.a,{href:"http://reactivex.io/rxjs/manual/overview.html#observable",children:"rxjs-Observable"})," which the current newest state of the RxDocument."]}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-js",children:"// get all changeEvents\nmyDocument.$\n  .subscribe(currentRxDocument => console.dir(currentRxDocument));\n"})}),"\n",(0,a.jsx)(n.h3,{id:"remove",children:"remove()"}),"\n",(0,a.jsxs)(n.p,{children:["This removes the document from the collection. Notice that this will not purge the document from the store but set ",(0,a.jsx)(n.code,{children:"_deleted:true"})," so that it will be no longer returned on queries.\nTo fully purge a document, use the ",(0,a.jsx)(n.a,{href:"/cleanup.html",children:"cleanup plugin"}),"."]}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-js",children:"myDocument.remove();\n"})}),"\n",(0,a.jsx)(n.h3,{id:"deleted",children:"deleted$"}),"\n",(0,a.jsx)(n.p,{children:"Emits a boolean value, depending on whether the RxDocument is deleted or not."}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-js",children:"let lastState = null;\nmyDocument.deleted$.subscribe(state => lastState = state);\n\nconsole.log(lastState);\n// false\n\nawait myDocument.remove();\n\nconsole.log(lastState);\n// true\n"})}),"\n",(0,a.jsx)(n.h3,{id:"get-deleted",children:"get deleted"}),"\n",(0,a.jsxs)(n.p,{children:["A getter to get the current value of ",(0,a.jsx)(n.code,{children:"deleted$"}),"."]}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-js",children:"console.log(myDocument.deleted);\n// false\n\nawait myDocument.remove();\n\nconsole.log(myDocument.deleted);\n// true\n"})}),"\n",(0,a.jsx)(n.h3,{id:"tojson",children:"toJSON()"}),"\n",(0,a.jsxs)(n.p,{children:["Returns the document's data as plain json object. This will return an ",(0,a.jsx)(n.strong,{children:"immutable"})," object. To get something that can be modified, use ",(0,a.jsx)(n.code,{children:"toMutableJSON()"})," instead."]}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-js",children:"const json = myDocument.toJSON();\nconsole.dir(json);\n/* { passportId: 'h1rg9ugdd30o',\n  firstName: 'Carolina',\n  lastName: 'Gibson',\n  age: 33 ...\n*/\n"})}),"\n",(0,a.jsxs)(n.p,{children:["You can also set ",(0,a.jsx)(n.code,{children:"withMetaFields: true"})," to get additional meta fields like the revision, attachments or the deleted flag."]}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-js",children:"const json = myDocument.toJSON(true);\nconsole.dir(json);\n/* { passportId: 'h1rg9ugdd30o',\n  firstName: 'Carolina',\n  lastName: 'Gibson',\n  _deleted: false,\n  _attachments: { ... },\n  _rev: '1-aklsdjfhaklsdjhf...'\n*/\n"})}),"\n",(0,a.jsx)(n.h3,{id:"tomutablejson",children:"toMutableJSON()"}),"\n",(0,a.jsxs)(n.p,{children:["Same as ",(0,a.jsx)(n.code,{children:"toJSON()"})," but returns a deep cloned object that can be mutated afterwards.\nRemember that deep cloning is performance expensive and should only be done when necessary."]}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-js",children:"const json = myDocument.toMutableJSON();\njson.firstName = 'Alice'; // The returned document can be mutated\n"})}),"\n",(0,a.jsx)(n.h2,{id:"notice-all-methods-of-rxdocument-are-bound-to-the-instance",children:"NOTICE: All methods of RxDocument are bound to the instance"}),"\n",(0,a.jsxs)(n.p,{children:["When you get a method from a ",(0,a.jsx)(n.code,{children:"RxDocument"}),", the method is automatically bound to the documents instance. This means you do not have to use things like ",(0,a.jsx)(n.code,{children:"myMethod.bind(myDocument)"})," like you would do in jsx."]}),"\n",(0,a.jsx)(n.h3,{id:"isrxdocument",children:"isRxDocument"}),"\n",(0,a.jsx)(n.p,{children:"Returns true if the given object is an instance of RxDocument. Returns false if not."}),"\n",(0,a.jsx)(n.pre,{children:(0,a.jsx)(n.code,{className:"language-js",children:"const is = isRxDocument(myObj);\n"})})]})}function u(e={}){const{wrapper:n}={...(0,o.a)(),...e.components};return n?(0,a.jsx)(n,{...e,children:(0,a.jsx)(d,{...e})}):d(e)}},1151:(e,n,t)=>{t.d(n,{Z:()=>c,a:()=>l});var a=t(7294);const o={},s=a.createContext(o);function l(e){const n=a.useContext(s);return a.useMemo((function(){return"function"==typeof e?e(n):{...n,...e}}),[n,e])}function c(e){let n;return n=e.disableParentContext?"function"==typeof e.components?e.components(o):e.components||o:l(e.components),a.createElement(s.Provider,{value:n},e.children)}}}]);