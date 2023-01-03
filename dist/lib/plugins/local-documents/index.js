"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  RxDBLocalDocumentsPlugin: true
};
exports.RxDBLocalDocumentsPlugin = void 0;
var _localDocuments = require("./local-documents");
Object.keys(_localDocuments).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _localDocuments[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _localDocuments[key];
    }
  });
});
var _localDocumentsHelper = require("./local-documents-helper");
Object.keys(_localDocumentsHelper).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _localDocumentsHelper[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _localDocumentsHelper[key];
    }
  });
});
var _rxLocalDocument = require("./rx-local-document");
Object.keys(_rxLocalDocument).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _rxLocalDocument[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxLocalDocument[key];
    }
  });
});
var RxDBLocalDocumentsPlugin = {
  name: 'local-documents',
  rxdb: true,
  prototypes: {
    RxCollection: proto => {
      proto.insertLocal = _localDocuments.insertLocal;
      proto.upsertLocal = _localDocuments.upsertLocal;
      proto.getLocal = _localDocuments.getLocal;
      proto.getLocal$ = _localDocuments.getLocal$;
    },
    RxDatabase: proto => {
      proto.insertLocal = _localDocuments.insertLocal;
      proto.upsertLocal = _localDocuments.upsertLocal;
      proto.getLocal = _localDocuments.getLocal;
      proto.getLocal$ = _localDocuments.getLocal$;
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
          (0, _localDocumentsHelper.createLocalDocStateByParent)(args.database);
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
          (0, _localDocumentsHelper.createLocalDocStateByParent)(args.collection);
        }
      }
    },
    preDestroyRxDatabase: {
      after: db => {
        return (0, _localDocumentsHelper.closeStateByParent)(db);
      }
    },
    postDestroyRxCollection: {
      after: collection => (0, _localDocumentsHelper.closeStateByParent)(collection)
    },
    postRemoveRxDatabase: {
      after: args => {
        return (0, _localDocumentsHelper.removeLocalDocumentsStorageInstance)(args.storage, args.databaseName, '');
      }
    },
    postRemoveRxCollection: {
      after: args => {
        return (0, _localDocumentsHelper.removeLocalDocumentsStorageInstance)(args.storage, args.databaseName, args.collectionName);
      }
    }
  },
  overwritable: {}
};
exports.RxDBLocalDocumentsPlugin = RxDBLocalDocumentsPlugin;
//# sourceMappingURL=index.js.map