"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ensureFolderExists = ensureFolderExists;
exports.clearFolder = clearFolder;
exports.deleteFolder = deleteFolder;
exports.prepareFolders = prepareFolders;
exports.writeToFile = writeToFile;
exports.writeJsonToFile = writeJsonToFile;
exports.metaFileLocation = metaFileLocation;
exports.getMeta = getMeta;
exports.setMeta = setMeta;
exports.documentFolder = documentFolder;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var fs = _interopRequireWildcard(require("fs"));

var path = _interopRequireWildcard(require("path"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

/**
 * ensure that the given folder exists
 */
function ensureFolderExists(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, {
      recursive: true
    });
  }
}
/**
 * deletes and recreates the folder
 */


function clearFolder(folderPath) {
  deleteFolder(folderPath);
  ensureFolderExists(folderPath);
}

function deleteFolder(folderPath) {
  // only remove if exists to not raise warning
  if (fs.existsSync(folderPath)) {
    fs.rmdirSync(folderPath, {
      recursive: true
    });
  }
}

function prepareFolders(database, options) {
  ensureFolderExists(options.directory);
  var metaLoc = metaFileLocation(options);

  if (!fs.existsSync(metaLoc)) {
    var now = new Date().getTime();
    var metaData = {
      createdAt: now,
      updatedAt: now,
      collectionStates: {}
    };
    fs.writeFileSync(metaLoc, JSON.stringify(metaData), 'utf-8');
  }

  Object.keys(database.collections).forEach(function (collectionName) {
    ensureFolderExists(path.join(options.directory, collectionName));
  });
}

function writeToFile(_x, _x2) {
  return _writeToFile.apply(this, arguments);
}

function _writeToFile() {
  _writeToFile = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee(location, data) {
    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            return _context.abrupt("return", new Promise(function (res, rej) {
              fs.writeFile(location, data, 'utf-8', function (err) {
                if (err) {
                  rej(err);
                } else {
                  res();
                }
              });
            }));

          case 1:
          case "end":
            return _context.stop();
        }
      }
    }, _callee);
  }));
  return _writeToFile.apply(this, arguments);
}

function writeJsonToFile(_x3, _x4) {
  return _writeJsonToFile.apply(this, arguments);
}

function _writeJsonToFile() {
  _writeJsonToFile = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(location, data) {
    return _regenerator["default"].wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            return _context2.abrupt("return", writeToFile(location, JSON.stringify(data)));

          case 1:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));
  return _writeJsonToFile.apply(this, arguments);
}

function metaFileLocation(options) {
  return path.join(options.directory, 'backup_meta.json');
}

function getMeta(_x5) {
  return _getMeta.apply(this, arguments);
}

function _getMeta() {
  _getMeta = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee3(options) {
    var loc;
    return _regenerator["default"].wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            loc = metaFileLocation(options);
            return _context3.abrupt("return", new Promise(function (res, rej) {
              fs.readFile(loc, 'utf-8', function (err, data) {
                if (err) {
                  rej(err);
                } else {
                  var metaContent = JSON.parse(data);
                  res(metaContent);
                }
              });
            }));

          case 2:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3);
  }));
  return _getMeta.apply(this, arguments);
}

function setMeta(_x6, _x7) {
  return _setMeta.apply(this, arguments);
}

function _setMeta() {
  _setMeta = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee4(options, meta) {
    var loc;
    return _regenerator["default"].wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            loc = metaFileLocation(options);
            return _context4.abrupt("return", writeJsonToFile(loc, meta));

          case 2:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4);
  }));
  return _setMeta.apply(this, arguments);
}

function documentFolder(options, docId) {
  return path.join(options.directory, docId);
}

//# sourceMappingURL=file-util.js.map