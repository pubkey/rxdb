import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";

/**
 * This file contains everything
 * that is supposed to run inside of the worker.
 */
import { expose } from 'threads/worker';
import { getFromMapOrThrow } from '../../util';
export function wrappedRxStorage(args) {
  var nextId = 0;
  var instanceById = new Map();
  var exposeMe = {
    /**
     * RxStorageInstance
     */
    createStorageInstance: function () {
      var _createStorageInstance = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(params) {
        var instanceId, instance;
        return _regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                instanceId = nextId++;
                _context.next = 3;
                return args.storage.createStorageInstance(params);

              case 3:
                instance = _context.sent;
                instanceById.set(instanceId, instance);
                return _context.abrupt("return", instanceId);

              case 6:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));

      function createStorageInstance(_x) {
        return _createStorageInstance.apply(this, arguments);
      }

      return createStorageInstance;
    }(),
    bulkWrite: function bulkWrite(instanceId, documentWrites) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.bulkWrite(documentWrites);
    },
    bulkAddRevisions: function bulkAddRevisions(instanceId, documents) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.bulkAddRevisions(documents);
    },
    findDocumentsById: function findDocumentsById(instanceId, ids, deleted) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.findDocumentsById(ids, deleted);
    },
    query: function query(instanceId, preparedQuery) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.query(preparedQuery);
    },
    getAttachmentData: function getAttachmentData(instanceId, documentId, attachmentId) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.getAttachmentData(documentId, attachmentId);
    },
    getChangedDocuments: function getChangedDocuments(instanceId, options) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.getChangedDocuments(options);
    },
    changeStream: function changeStream(instanceId) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.changeStream();
    },
    close: function close(instanceId) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.close();
    },
    remove: function remove(instanceId) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.remove();
    },

    /**
     * RxKeyObjectStorageInstance
     */
    createKeyObjectStorageInstance: function () {
      var _createKeyObjectStorageInstance = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(params) {
        var instanceId, instance;
        return _regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                instanceId = nextId++;
                _context2.next = 3;
                return args.storage.createKeyObjectStorageInstance(params);

              case 3:
                instance = _context2.sent;
                instanceById.set(instanceId, instance);
                return _context2.abrupt("return", instanceId);

              case 6:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2);
      }));

      function createKeyObjectStorageInstance(_x2) {
        return _createKeyObjectStorageInstance.apply(this, arguments);
      }

      return createKeyObjectStorageInstance;
    }(),
    bulkWriteLocal: function bulkWriteLocal(instanceId, documentWrites) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.bulkWrite(documentWrites);
    },
    findLocalDocumentsById: function findLocalDocumentsById(instanceId, ids) {
      var instance = getFromMapOrThrow(instanceById, instanceId);
      return instance.findLocalDocumentsById(ids);
    }
  };
  expose(exposeMe);
}
//# sourceMappingURL=in-worker.js.map