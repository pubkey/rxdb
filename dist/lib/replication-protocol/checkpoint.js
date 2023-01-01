"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getCheckpointKey = getCheckpointKey;
exports.getLastCheckpointDoc = getLastCheckpointDoc;
exports.setCheckpoint = setCheckpoint;
var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));
var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));
var _rxSchemaHelper = require("../rx-schema-helper");
var _rxStorageHelper = require("../rx-storage-helper");
var _utils = require("../plugins/utils");
var _metaInstance = require("./meta-instance");
function getLastCheckpointDoc(_x, _x2) {
  return _getLastCheckpointDoc.apply(this, arguments);
}
/**
 * Sets the checkpoint,
 * automatically resolves conflicts that appear.
 */
function _getLastCheckpointDoc() {
  _getLastCheckpointDoc = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(state, direction) {
    var checkpointDocId, checkpointResult, checkpointDoc;
    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) switch (_context.prev = _context.next) {
        case 0:
          checkpointDocId = (0, _rxSchemaHelper.getComposedPrimaryKeyOfDocumentData)(_metaInstance.RX_REPLICATION_META_INSTANCE_SCHEMA, {
            isCheckpoint: '1',
            itemId: direction,
            replicationIdentifier: state.checkpointKey
          });
          _context.next = 3;
          return state.input.metaInstance.findDocumentsById([checkpointDocId], false);
        case 3:
          checkpointResult = _context.sent;
          checkpointDoc = checkpointResult[checkpointDocId];
          state.lastCheckpointDoc[direction] = checkpointDoc;
          if (!checkpointDoc) {
            _context.next = 10;
            break;
          }
          return _context.abrupt("return", checkpointDoc.data);
        case 10:
          return _context.abrupt("return", undefined);
        case 11:
        case "end":
          return _context.stop();
      }
    }, _callee);
  }));
  return _getLastCheckpointDoc.apply(this, arguments);
}
function setCheckpoint(_x3, _x4, _x5) {
  return _setCheckpoint.apply(this, arguments);
}
function _setCheckpoint() {
  _setCheckpoint = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(state, direction, checkpoint) {
    var previousCheckpointDoc, newDoc, result, error;
    return _regenerator["default"].wrap(function _callee2$(_context2) {
      while (1) switch (_context2.prev = _context2.next) {
        case 0:
          previousCheckpointDoc = state.lastCheckpointDoc[direction];
          if (!(checkpoint &&
          /**
           * If the replication is already canceled,
           * we do not write a checkpoint
           * because that could mean we write a checkpoint
           * for data that has been fetched from the master
           * but not been written to the child.
           */
          !state.events.canceled.getValue() && (
          /**
           * Only write checkpoint if it is different from before
           * to have less writes to the storage.
           */

          !previousCheckpointDoc || JSON.stringify(previousCheckpointDoc.data) !== JSON.stringify(checkpoint)))) {
            _context2.next = 25;
            break;
          }
          newDoc = {
            id: '',
            isCheckpoint: '1',
            itemId: direction,
            replicationIdentifier: state.checkpointKey,
            _deleted: false,
            _attachments: {},
            data: checkpoint,
            _meta: (0, _utils.getDefaultRxDocumentMeta)(),
            _rev: (0, _utils.getDefaultRevision)()
          };
          newDoc.id = (0, _rxSchemaHelper.getComposedPrimaryKeyOfDocumentData)(_metaInstance.RX_REPLICATION_META_INSTANCE_SCHEMA, newDoc);
        case 4:
          if (!true) {
            _context2.next = 25;
            break;
          }
          /**
           * Instead of just storign the new checkpoint,
           * we have to stack up the checkpoint with the previous one.
           * This is required for plugins like the sharding RxStorage
           * where the changeStream events only contain a Partial of the
           * checkpoint.
           */
          if (previousCheckpointDoc) {
            newDoc.data = (0, _rxStorageHelper.stackCheckpoints)([previousCheckpointDoc.data, newDoc.data]);
          }
          newDoc._meta.lwt = (0, _utils.now)();
          newDoc._rev = (0, _utils.createRevision)(state.input.identifier, previousCheckpointDoc);
          _context2.next = 10;
          return state.input.metaInstance.bulkWrite([{
            previous: previousCheckpointDoc,
            document: newDoc
          }], 'replication-set-checkpoint');
        case 10:
          result = _context2.sent;
          if (!result.success[newDoc.id]) {
            _context2.next = 16;
            break;
          }
          state.lastCheckpointDoc[direction] = (0, _utils.getFromObjectOrThrow)(result.success, newDoc.id);
          return _context2.abrupt("return");
        case 16:
          error = (0, _utils.getFromObjectOrThrow)(result.error, newDoc.id);
          if (!(error.status !== 409)) {
            _context2.next = 21;
            break;
          }
          throw error;
        case 21:
          previousCheckpointDoc = (0, _utils.ensureNotFalsy)(error.documentInDb);
          newDoc._rev = (0, _utils.createRevision)(state.input.identifier, previousCheckpointDoc);
        case 23:
          _context2.next = 4;
          break;
        case 25:
        case "end":
          return _context2.stop();
      }
    }, _callee2);
  }));
  return _setCheckpoint.apply(this, arguments);
}
function getCheckpointKey(input) {
  var hash = (0, _utils.fastUnsecureHash)([input.identifier, input.forkInstance.databaseName, input.forkInstance.collectionName].join('||'));
  return 'rx-storage-replication-' + hash;
}
//# sourceMappingURL=checkpoint.js.map