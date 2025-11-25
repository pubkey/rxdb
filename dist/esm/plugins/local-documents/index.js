import { getLocal, getLocal$, insertLocal, upsertLocal } from "./local-documents.js";
import { closeStateByParent, removeLocalDocumentsStorageInstance } from "./local-documents-helper.js";
import { createLocalDocStateByParent } from "./rx-local-document.js";
export * from "./local-documents-helper.js";
export * from "./local-documents.js";
export * from "./rx-local-document.js";
export var RxDBLocalDocumentsPlugin = {
  name: 'local-documents',
  rxdb: true,
  prototypes: {
    RxCollection: proto => {
      proto.insertLocal = insertLocal;
      proto.upsertLocal = upsertLocal;
      proto.getLocal = getLocal;
      proto.getLocal$ = getLocal$;
    },
    RxDatabase: proto => {
      proto.insertLocal = insertLocal;
      proto.upsertLocal = upsertLocal;
      proto.getLocal = getLocal;
      proto.getLocal$ = getLocal$;
    }
  },
  hooks: {
    createRxDatabase: {
      before: args => {
        if (args.creator.localDocuments) {
          /**
           * We do not have to await
           * the creation to speed up initial page load.
           */
          /* await */
          createLocalDocStateByParent(args.database);
        }
      }
    },
    createRxCollection: {
      before: args => {
        if (args.creator.localDocuments) {
          /**
           * We do not have to await
           * the creation to speed up initial page load.
           */
          /* await */
          createLocalDocStateByParent(args.collection);
        }
      }
    },
    preCloseRxDatabase: {
      after: db => {
        return closeStateByParent(db);
      }
    },
    postCloseRxCollection: {
      after: collection => closeStateByParent(collection)
    },
    postRemoveRxDatabase: {
      after: args => {
        return removeLocalDocumentsStorageInstance(args.storage, args.databaseName, '');
      }
    },
    postRemoveRxCollection: {
      after: args => {
        return removeLocalDocumentsStorageInstance(args.storage, args.databaseName, args.collectionName);
      }
    }
  },
  overwritable: {}
};
//# sourceMappingURL=index.js.map