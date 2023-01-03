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
var fs = _interopRequireWildcard(require("fs"));
var path = _interopRequireWildcard(require("path"));
var _utils = require("../../plugins/utils");
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
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
    var currentTime = (0, _utils.now)();
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
    data = await _utils.blobBufferUtil.toString(data);
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