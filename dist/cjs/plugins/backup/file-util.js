"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.clearFolder = clearFolder;
exports.deleteFolder = deleteFolder;
exports.documentFolder = documentFolder;
exports.ensureFolderExists = ensureFolderExists;
exports.getMeta = getMeta;
exports.metaFileLocation = metaFileLocation;
exports.prepareFolders = prepareFolders;
exports.setMeta = setMeta;
exports.writeJsonToFile = writeJsonToFile;
exports.writeToFile = writeToFile;
var fs = _interopRequireWildcard(require("node:fs"));
var path = _interopRequireWildcard(require("node:path"));
var _index = require("../../plugins/utils/index.js");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (var _t in e) "default" !== _t && {}.hasOwnProperty.call(e, _t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, _t)) && (i.get || i.set) ? o(f, _t, i) : f[_t] = e[_t]); return f; })(e, t); }
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
    var currentTime = (0, _index.now)();
    var metaData = {
      createdAt: currentTime,
      updatedAt: currentTime,
      collectionStates: {}
    };
    fs.writeFileSync(metaLoc, JSON.stringify(metaData), 'utf-8');
  }
  Object.keys(database.collections).forEach(collectionName => {
    ensureFolderExists(path.join(options.directory, collectionName));
  });
}
async function writeToFile(location, data) {
  if (typeof data !== 'string') {
    data = await (0, _index.blobToString)(data);
  }
  return new Promise(function (res, rej) {
    fs.writeFile(location, data, 'utf-8', err => {
      if (err) {
        rej(err);
      } else {
        res();
      }
    });
  });
}
function writeJsonToFile(location, data) {
  return writeToFile(location, JSON.stringify(data));
}
function metaFileLocation(options) {
  return path.join(options.directory, 'backup_meta.json');
}
function getMeta(options) {
  var loc = metaFileLocation(options);
  return new Promise((res, rej) => {
    fs.readFile(loc, 'utf-8', (err, data) => {
      if (err) {
        rej(err);
      } else {
        var metaContent = JSON.parse(data);
        res(metaContent);
      }
    });
  });
}
function setMeta(options, meta) {
  var loc = metaFileLocation(options);
  return writeJsonToFile(loc, meta);
}
function documentFolder(options, docId) {
  return path.join(options.directory, docId);
}
//# sourceMappingURL=file-util.js.map