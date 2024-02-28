"use strict";(self.webpackChunkrxdb=self.webpackChunkrxdb||[]).push([[7408],{5943:(e,t,s)=>{s.r(t),s.d(t,{assets:()=>l,contentTitle:()=>a,default:()=>h,frontMatter:()=>n,metadata:()=>o,toc:()=>c});var r=s(4848),i=s(8453);const n={title:"OPFS RxStorage \ud83d\udc51",slug:"rx-storage-opfs.html",description:"Origin Private File System (OPFS) Database with the RxDB OPFS-RxStorage"},a="Origin Private File System (OPFS) Database with the RxDB OPFS-RxStorage",o={id:"rx-storage-opfs",title:"OPFS RxStorage \ud83d\udc51",description:"Origin Private File System (OPFS) Database with the RxDB OPFS-RxStorage",source:"@site/docs/rx-storage-opfs.md",sourceDirName:".",slug:"/rx-storage-opfs.html",permalink:"/rx-storage-opfs.html",draft:!1,unlisted:!1,tags:[],version:"current",frontMatter:{title:"OPFS RxStorage \ud83d\udc51",slug:"rx-storage-opfs.html",description:"Origin Private File System (OPFS) Database with the RxDB OPFS-RxStorage"},sidebar:"tutorialSidebar",previous:{title:"Dexie.js RxStorage",permalink:"/rx-storage-dexie.html"},next:{title:"Node.js Filesystem RxStorage \ud83d\udc51",permalink:"/rx-storage-filesystem-node.html"}},l={},c=[{value:"What is OPFS",id:"what-is-opfs",level:2},{value:"OPFS limitations",id:"opfs-limitations",level:3},{value:"How the OPFS API works",id:"how-the-opfs-api-works",level:2},{value:"OPFS performance",id:"opfs-performance",level:2},{value:"Using OPFS as RxStorage in RxDB",id:"using-opfs-as-rxstorage-in-rxdb",level:2},{value:"Using OPFS in the main thread instead of a worker",id:"using-opfs-in-the-main-thread-instead-of-a-worker",level:2},{value:"Building a custom <code>worker.js</code>",id:"building-a-custom-workerjs",level:2},{value:"Setting <code>usesRxDatabaseInWorker</code> when a RxDatabase is also used inside of the worker",id:"setting-usesrxdatabaseinworker-when-a-rxdatabase-is-also-used-inside-of-the-worker",level:2},{value:"Setting <code>jsonPositionSize</code> to increase the maximum database size.",id:"setting-jsonpositionsize-to-increase-the-maximum-database-size",level:2},{value:"OPFS in Electron, React-Native or Capacitor.js",id:"opfs-in-electron-react-native-or-capacitorjs",level:2},{value:"Difference between <code>File System Access API</code> and <code>Origin Private File System (OPFS)</code>",id:"difference-between-file-system-access-api-and-origin-private-file-system-opfs",level:2},{value:"Learn more about OPFS:",id:"learn-more-about-opfs",level:2}];function d(e){const t={a:"a",code:"code",em:"em",h1:"h1",h2:"h2",h3:"h3",li:"li",p:"p",pre:"pre",strong:"strong",ul:"ul",...(0,i.R)(),...e.components};return(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)(t.h1,{id:"origin-private-file-system-opfs-database-with-the-rxdb-opfs-rxstorage",children:"Origin Private File System (OPFS) Database with the RxDB OPFS-RxStorage"}),"\n",(0,r.jsxs)(t.p,{children:["With the ",(0,r.jsx)(t.a,{href:"https://rxdb.info/",children:"RxDB"})," OPFS storage you can build a fully featured database on top of the ",(0,r.jsx)(t.a,{href:"https://web.dev/opfs",children:"Origin Private File System"})," (OPFS) browser API. Compared to other storage solutions, it has a way better performance."]}),"\n",(0,r.jsx)(t.h2,{id:"what-is-opfs",children:"What is OPFS"}),"\n",(0,r.jsxs)(t.p,{children:["The ",(0,r.jsx)(t.strong,{children:"Origin Private File System (OPFS)"})," is a native browser storage API that allows web applications to manage files in a private, sandboxed, ",(0,r.jsx)(t.strong,{children:"origin-specific virtual filesystem"}),". Unlike ",(0,r.jsx)(t.a,{href:"/rx-storage-indexeddb.html",children:"IndexedDB"})," and ",(0,r.jsx)(t.a,{href:"/articles/localstorage.html",children:"LocalStorage"}),", which are optimized as object/key-value storage, OPFS provides more granular control for file operations, enabling byte-by-byte access, file streaming, and even low-level manipulations.\nOPFS is ideal for applications requiring ",(0,r.jsx)(t.strong,{children:"high-performance"})," file operations (",(0,r.jsx)(t.strong,{children:"3x-4x faster compared to IndexedDB"}),") inside of a client-side application, offering advantages like improved speed, more efficient use of resources, and enhanced security and privacy features."]}),"\n",(0,r.jsx)(t.h3,{id:"opfs-limitations",children:"OPFS limitations"}),"\n",(0,r.jsxs)(t.p,{children:["From the beginning of 2023, the Origin Private File System API is supported by ",(0,r.jsx)(t.a,{href:"https://caniuse.com/native-filesystem-api",children:"all modern browsers"})," like Safari, Chrome, Edge and Firefox. Only Internet Explorer is not supported and likely will never get support."]}),"\n",(0,r.jsxs)(t.p,{children:["It is important to know that the most performant synchronous methods like ",(0,r.jsx)(t.a,{href:"https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/read",children:(0,r.jsx)(t.code,{children:"read()"})})," and ",(0,r.jsx)(t.a,{href:"https://developer.mozilla.org/en-US/docs/Web/API/FileSystemSyncAccessHandle/write",children:(0,r.jsx)(t.code,{children:"write()"})})," of the OPFS API are ",(0,r.jsxs)(t.strong,{children:["only available inside of a ",(0,r.jsx)(t.a,{href:"/rx-storage-worker.html",children:"WebWorker"})]}),".\nThey cannot be used in the main thread, an iFrame or even a ",(0,r.jsx)(t.a,{href:"/rx-storage-shared-worker.html",children:"SharedWorker"}),".\nThe OPFS ",(0,r.jsx)(t.a,{href:"https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createSyncAccessHandle",children:(0,r.jsx)(t.code,{children:"createSyncAccessHandle()"})})," method that gives you access to the synchronous methods is not exposed in the main thread, only in a Worker."]}),"\n",(0,r.jsxs)(t.p,{children:["While there is no concrete ",(0,r.jsx)(t.strong,{children:"data size limit"})," defined by the API, browsers will refuse to store more data at some point.\nIf no more data can be written, a ",(0,r.jsx)(t.code,{children:"QuotaExceededError"})," is thrown which should be handled by the application, like showing an error message to the user."]}),"\n",(0,r.jsx)(t.h2,{id:"how-the-opfs-api-works",children:"How the OPFS API works"}),"\n",(0,r.jsxs)(t.p,{children:["The OPFS API is pretty straightforward to use. First you get the root filesystem. Then you can create files and directories on that. Notice that whenever you ",(0,r.jsx)(t.em,{children:"synchronously"})," write to, or read from a file, an ",(0,r.jsx)(t.code,{children:"ArrayBuffer"})," must be used that contains the data. It is not possible to synchronously write plain strings or objects into the file. Therefore the ",(0,r.jsx)(t.code,{children:"TextEncoder"})," and ",(0,r.jsx)(t.code,{children:"TextDecoder"})," API must be used."]}),"\n",(0,r.jsxs)(t.p,{children:["Also notice that some of the methods of ",(0,r.jsx)(t.code,{children:"FileSystemSyncAccessHandle"})," ",(0,r.jsx)(t.a,{href:"https://developer.chrome.com/blog/sync-methods-for-accesshandles",children:"have been asynchronous"})," in the past, but are synchronous since Chromium 108. To make it less confusing, we just use ",(0,r.jsx)(t.code,{children:"await"})," in front of them, so it will work in both cases."]}),"\n",(0,r.jsx)(t.pre,{children:(0,r.jsx)(t.code,{className:"language-ts",children:"// Access the root directory of the origin's private file system.\nconst root = await navigator.storage.getDirectory();\n\n// Create a subdirectory.\nconst diaryDirectory = await root.getDirectoryHandle('subfolder', {\n  create: true,\n});  \n\n// Create a new file named 'example.txt'.\nconst fileHandle = await diaryDirectory.getFileHandle('example.txt', {\n  create: true,\n});\n\n// Create a FileSystemSyncAccessHandle on the file.\nconst accessHandle = await fileHandle.createSyncAccessHandle();\n\n// Write a sentence to the file.\nlet writeBuffer = new TextEncoder().encode('Hello from RxDB');\nconst writeSize = accessHandle.write(writeBuffer);\n\n// Read file and transform data to string.\nconst readBuffer = new Uint8Array(writeSize);\nconst readSize = accessHandle.read(readBuffer, { at: 0 });  \nconst contentAsString = new TextDecoder().decode(readBuffer);\n\n// Write an exclamation mark to the end of the file.\nwriteBuffer = new TextEncoder().encode('!');\naccessHandle.write(writeBuffer, { at: readSize });\n\n// Truncate file to 10 bytes.\nawait accessHandle.truncate(10);\n\n// Get the new size of the file.\nconst fileSize = await accessHandle.getSize();\n\n// Persist changes to disk.\nawait accessHandle.flush();\n\n// Always close FileSystemSyncAccessHandle if done, so others can open the file again.\nawait accessHandle.close();\n"})}),"\n",(0,r.jsxs)(t.p,{children:["A more detailed description of the OPFS API can be found ",(0,r.jsx)(t.a,{href:"https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system",children:"on MDN"}),"."]}),"\n",(0,r.jsx)(t.h2,{id:"opfs-performance",children:"OPFS performance"}),"\n",(0,r.jsxs)(t.p,{children:["Because the Origin Private File System API provides low-level access to binary files, it is much faster compared to ",(0,r.jsx)(t.a,{href:"/slow-indexeddb.html",children:"IndexedDB"})," or ",(0,r.jsx)(t.a,{href:"/articles/localstorage.html",children:"localStorage"}),". According to the ",(0,r.jsx)(t.a,{href:"https://pubkey.github.io/client-side-databases/database-comparison/index.html",children:"storage performance test"}),", OPFS is up to 2x times faster on plain inserts when a new file is created on each write. Reads are even faster."]}),"\n",(0,r.jsxs)(t.p,{children:["A good comparison about real world scenarios, are the ",(0,r.jsx)(t.a,{href:"/rx-storage-performance.html",children:"performance results"})," of the various RxDB storages. Here it shows that reads are up to 4x faster compared to IndexedDB, even with complex queries:"]}),"\n",(0,r.jsx)("p",{align:"center",children:(0,r.jsx)("img",{src:"./files/rx-storage-performance-browser.png",alt:"RxStorage performance - browser",width:"700"})}),"\n",(0,r.jsx)(t.h2,{id:"using-opfs-as-rxstorage-in-rxdb",children:"Using OPFS as RxStorage in RxDB"}),"\n",(0,r.jsxs)(t.p,{children:["The OPFS ",(0,r.jsx)(t.a,{href:"/rx-storage.html",children:"RxStorage"})," itself must run inside a WebWorker. Therefore we use the ",(0,r.jsx)(t.a,{href:"/rx-storage-worker.html",children:"Worker RxStorage"})," and let it point to the prebuild ",(0,r.jsx)(t.code,{children:"opfs.worker.js"})," file that comes shipped with RxDB Premium \ud83d\udc51."]}),"\n",(0,r.jsxs)(t.p,{children:["Notice that the OPFS RxStorage is part of the ",(0,r.jsx)(t.a,{href:"/premium",children:"RxDB Premium \ud83d\udc51"})," plugin that must be purchased."]}),"\n",(0,r.jsx)(t.pre,{children:(0,r.jsx)(t.code,{className:"language-ts",children:"import {\n    createRxDatabase\n} from 'rxdb';\nimport { getRxStorageWorker } from 'rxdb-premium/plugins/storage-worker';\n\nconst database = await createRxDatabase({\n    name: 'mydatabase',\n    storage: getRxStorageWorker(\n        {\n            /**\n             * This file must be statically served from a webserver.\n             * You might want to first copy it somewhere outside of\n             * your node_modules folder.\n             */\n            workerInput: 'node_modules/rxdb-premium/dist/workers/opfs.worker.js'\n        }\n    )\n});\n"})}),"\n",(0,r.jsx)(t.h2,{id:"using-opfs-in-the-main-thread-instead-of-a-worker",children:"Using OPFS in the main thread instead of a worker"}),"\n",(0,r.jsxs)(t.p,{children:["The ",(0,r.jsx)(t.code,{children:"createSyncAccessHandle"})," method from the Filesystem API is only available inside of a Webworker. Therefore you cannot use ",(0,r.jsx)(t.code,{children:"getRxStorageOPFS()"})," in the main thread. But there is a slightly slower way to access the virtual filesystem from the main thread. RxDB support the ",(0,r.jsx)(t.code,{children:"getRxStorageOPFSMainThread()"})," for that. Notice that this uses the ",(0,r.jsx)(t.a,{href:"https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createWritable",children:"createWritable"})," function which is not supported in safari."]}),"\n",(0,r.jsx)(t.p,{children:"Using OPFS from the main thread can have benefits because not having to cross the worker bridge can reduce latence in reads and writes."}),"\n",(0,r.jsx)(t.pre,{children:(0,r.jsx)(t.code,{className:"language-ts",children:"import { createRxDatabase } from 'rxdb';\nimport { getRxStorageOPFSMainThread } from 'rxdb-premium/plugins/storage-worker';\n\nconst database = await createRxDatabase({\n    name: 'mydatabase',\n    storage: getRxStorageOPFSMainThread()\n});\n"})}),"\n",(0,r.jsxs)(t.h2,{id:"building-a-custom-workerjs",children:["Building a custom ",(0,r.jsx)(t.code,{children:"worker.js"})]}),"\n",(0,r.jsxs)(t.p,{children:["When you want to run additional plugins like storage wrappers or replication ",(0,r.jsx)(t.strong,{children:"inside"})," of the worker, you have to build your own ",(0,r.jsx)(t.code,{children:"worker.js"})," file. You can do that similar to other workers by calling ",(0,r.jsx)(t.code,{children:"exposeWorkerRxStorage"})," like described in the ",(0,r.jsx)(t.a,{href:"/rx-storage-worker.html",children:"worker storage plugin"}),"."]}),"\n",(0,r.jsx)(t.pre,{children:(0,r.jsx)(t.code,{className:"language-ts",children:"// inside of the worker.js file\nimport { getRxStorageOPFS } from 'rxdb-premium/plugins/storage-opfs';\nimport { exposeWorkerRxStorage } from 'rxdb-premium/plugins/storage-worker';\n\nconst storage = getRxStorageOPFS();\nexposeWorkerRxStorage({\n    storage\n});\n"})}),"\n",(0,r.jsxs)(t.h2,{id:"setting-usesrxdatabaseinworker-when-a-rxdatabase-is-also-used-inside-of-the-worker",children:["Setting ",(0,r.jsx)(t.code,{children:"usesRxDatabaseInWorker"})," when a RxDatabase is also used inside of the worker"]}),"\n",(0,r.jsxs)(t.p,{children:["When you use the OPFS inside of a worker, it will internally use strings to represent operation results. This has the benefit that transferring strings from the worker to the main thread, is way faster compared to complex json objects. The ",(0,r.jsx)(t.code,{children:"getRxStorageWorker()"})," will automatically decode these strings on the main thread so that the data can be used by the RxDatabase."]}),"\n",(0,r.jsxs)(t.p,{children:["But using a RxDatabase ",(0,r.jsx)(t.strong,{children:"inside"})," of your worker can make sense for example when you want to move the ",(0,r.jsx)(t.a,{href:"/replication.html",children:"replication"})," with a server. To enable this, you have to set ",(0,r.jsx)(t.code,{children:"usesRxDatabaseInWorker"})," to ",(0,r.jsx)(t.code,{children:"true"}),":"]}),"\n",(0,r.jsx)(t.pre,{children:(0,r.jsx)(t.code,{className:"language-ts",children:"// inside of the worker.js file\nimport { getRxStorageOPFS } from 'rxdb-premium/plugins/storage-opfs';\nconst storage = getRxStorageOPFS({\n  usesRxDatabaseInWorker: true\n});\n"})}),"\n",(0,r.jsxs)(t.h2,{id:"setting-jsonpositionsize-to-increase-the-maximum-database-size",children:["Setting ",(0,r.jsx)(t.code,{children:"jsonPositionSize"})," to increase the maximum database size."]}),"\n",(0,r.jsxs)(t.p,{children:["By default the ",(0,r.jsx)(t.code,{children:"jsonPositionSize"})," value is set to ",(0,r.jsx)(t.code,{children:"8"})," which allows the database to get up to 100 megabytes in size (per collection).\nThis is ok for most use cases but you might want to just increase ",(0,r.jsx)(t.code,{children:"jsonPositionSize"})," to ",(0,r.jsx)(t.code,{children:"14"}),".\nIn the next major RxDB version the default will be set to ",(0,r.jsx)(t.code,{children:"14"}),", but this was not possible without introducing a breaking change."]}),"\n",(0,r.jsxs)(t.p,{children:["NOTICE: If you have already stored data, you cannot just change the ",(0,r.jsx)(t.code,{children:"jsonPositionSize"})," value because your stored binary data will not be compatible anymore."]}),"\n",(0,r.jsxs)(t.p,{children:["Also there is a ",(0,r.jsx)(t.code,{children:"opfs-big.worker.js"})," file that has ",(0,r.jsx)(t.code,{children:"jsonPositionSize"})," set to ",(0,r.jsx)(t.code,{children:"14"})," already."]}),"\n",(0,r.jsx)(t.h2,{id:"opfs-in-electron-react-native-or-capacitorjs",children:"OPFS in Electron, React-Native or Capacitor.js"}),"\n",(0,r.jsx)(t.p,{children:"Origin Private File System is a browser API that is only accessible in browsers. Other JavaScript like React-Native or Node.js, do not support it."}),"\n",(0,r.jsxs)(t.p,{children:[(0,r.jsx)(t.strong,{children:"Electron"})," has two JavaScript contexts: the browser (chromium) context and the Node.js context. While you could use the OPFS API in the browser context, it is not recommended. Instead you should use the Filesystem API of Node.js and then only transfer the relevant data with the ",(0,r.jsx)(t.a,{href:"https://www.electronjs.org/de/docs/latest/api/ipc-renderer",children:"ipcRenderer"}),". With RxDB that is pretty easy to configure:"]}),"\n",(0,r.jsxs)(t.ul,{children:["\n",(0,r.jsxs)(t.li,{children:["In the ",(0,r.jsx)(t.code,{children:"main.js"}),", expose the ",(0,r.jsx)(t.a,{href:"/rx-storage-filesystem-node.html",children:"Node Filesystem"})," storage with the ",(0,r.jsx)(t.code,{children:"exposeIpcMainRxStorage()"})," that comes with the ",(0,r.jsx)(t.a,{href:"/electron.html",children:"electron plugin"})]}),"\n",(0,r.jsxs)(t.li,{children:["In the browser context, access the main storage with the ",(0,r.jsx)(t.code,{children:"getRxStorageIpcRenderer()"})," method."]}),"\n"]}),"\n",(0,r.jsxs)(t.p,{children:[(0,r.jsx)(t.strong,{children:"React Native"})," (and Expo) does not have an OPFS API. You could use the ReactNative Filesystem to directly write data. But to get a fully featured database like RxDB it is easier to use the ",(0,r.jsx)(t.a,{href:"/rx-storage-sqlite.html",children:"SQLite RxStorage"})," which starts an SQLite database inside of the ReactNative app and uses that to do the database operations."]}),"\n",(0,r.jsxs)(t.p,{children:[(0,r.jsx)(t.strong,{children:"Capacitor.js"})," is able to access the OPFS API."]}),"\n",(0,r.jsxs)(t.h2,{id:"difference-between-file-system-access-api-and-origin-private-file-system-opfs",children:["Difference between ",(0,r.jsx)(t.code,{children:"File System Access API"})," and ",(0,r.jsx)(t.code,{children:"Origin Private File System (OPFS)"})]}),"\n",(0,r.jsxs)(t.p,{children:["Often developers are confused with the differences between the ",(0,r.jsx)(t.code,{children:"File System Access API"})," and the ",(0,r.jsx)(t.code,{children:"Origin Private File System (OPFS)"}),"."]}),"\n",(0,r.jsxs)(t.ul,{children:["\n",(0,r.jsxs)(t.li,{children:["The ",(0,r.jsx)(t.code,{children:"File System Access API"})," provides access to the files on the device file system, like the ones shown in the file explorer of the operating system. To use the File System API, the user has to actively select the files from a filepicker."]}),"\n",(0,r.jsxs)(t.li,{children:[(0,r.jsx)(t.code,{children:"Origin Private File System (OPFS)"})," is a sub-part of the ",(0,r.jsx)(t.code,{children:"File System Standard"})," and it only describes the things you can do with the filesystem root from ",(0,r.jsx)(t.code,{children:"navigator.storage.getDirectory()"}),". OPFS writes to a ",(0,r.jsx)(t.strong,{children:"sandboxed"})," filesystem, not visible to the user. Therefore the user does not have to actively select or allow the data access."]}),"\n"]}),"\n",(0,r.jsx)(t.h2,{id:"learn-more-about-opfs",children:"Learn more about OPFS:"}),"\n",(0,r.jsxs)(t.ul,{children:["\n",(0,r.jsx)(t.li,{children:(0,r.jsx)(t.a,{href:"https://webkit.org/blog/12257/the-file-system-access-api-with-origin-private-file-system/",children:"WebKit: The File System API with Origin Private File System"})}),"\n",(0,r.jsx)(t.li,{children:(0,r.jsx)(t.a,{href:"https://caniuse.com/native-filesystem-api",children:"Browser Support"})}),"\n",(0,r.jsx)(t.li,{children:(0,r.jsx)(t.a,{href:"https://pubkey.github.io/client-side-databases/database-comparison/index.html",children:"Performance Test Tool"})}),"\n"]})]})}function h(e={}){const{wrapper:t}={...(0,i.R)(),...e.components};return t?(0,r.jsx)(t,{...e,children:(0,r.jsx)(d,{...e})}):d(e)}},8453:(e,t,s)=>{s.d(t,{R:()=>a,x:()=>o});var r=s(6540);const i={},n=r.createContext(i);function a(e){const t=r.useContext(n);return r.useMemo((function(){return"function"==typeof e?e(t):{...t,...e}}),[t,e])}function o(e){let t;return t=e.disableParentContext?"function"==typeof e.components?e.components(i):e.components||i:a(e.components),r.createElement(n.Provider,{value:t},e.children)}}}]);