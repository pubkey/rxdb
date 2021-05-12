import _asyncToGenerator from "@babel/runtime/helpers/asyncToGenerator";
import _regeneratorRuntime from "@babel/runtime/regenerator";
import * as fs from 'fs';
import * as path from 'path';

/**
 * ensure that the given folder exists
 */
export function ensureFolderExists(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, {
      recursive: true
    });
  }
}
/**
 * deletes and recreates the folder
 */

export function clearFolder(folderPath) {
  deleteFolder(folderPath);
  ensureFolderExists(folderPath);
}
export function deleteFolder(folderPath) {
  // only remove if exists to not raise warning
  if (fs.existsSync(folderPath)) {
    fs.rmdirSync(folderPath, {
      recursive: true
    });
  }
}
export function prepareFolders(database, options) {
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
export function writeToFile(_x, _x2) {
  return _writeToFile.apply(this, arguments);
}

function _writeToFile() {
  _writeToFile = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(location, data) {
    return _regeneratorRuntime.wrap(function _callee$(_context) {
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

export function writeJsonToFile(_x3, _x4) {
  return _writeJsonToFile.apply(this, arguments);
}

function _writeJsonToFile() {
  _writeJsonToFile = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee2(location, data) {
    return _regeneratorRuntime.wrap(function _callee2$(_context2) {
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

export function metaFileLocation(options) {
  return path.join(options.directory, 'backup_meta.json');
}
export function getMeta(_x5) {
  return _getMeta.apply(this, arguments);
}

function _getMeta() {
  _getMeta = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee3(options) {
    var loc;
    return _regeneratorRuntime.wrap(function _callee3$(_context3) {
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

export function setMeta(_x6, _x7) {
  return _setMeta.apply(this, arguments);
}

function _setMeta() {
  _setMeta = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee4(options, meta) {
    var loc;
    return _regeneratorRuntime.wrap(function _callee4$(_context4) {
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

export function documentFolder(options, docId) {
  return path.join(options.directory, docId);
}
//# sourceMappingURL=file-util.js.map