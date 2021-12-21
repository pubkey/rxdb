"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.clearFolder = clearFolder;
exports.deleteFolder = deleteFolder;
exports.documentFolder = documentFolder;
exports.ensureFolderExists = ensureFolderExists;
exports.getMeta = void 0;
exports.metaFileLocation = metaFileLocation;
exports.prepareFolders = prepareFolders;
exports.writeToFile = exports.writeJsonToFile = exports.setMeta = void 0;

var fs = _interopRequireWildcard(require("fs"));

var path = _interopRequireWildcard(require("path"));

var _util = require("../../util");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { "default": obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

var setMeta = function setMeta(options, meta) {
  try {
    var loc = metaFileLocation(options);
    return writeJsonToFile(loc, meta);
  } catch (e) {
    return Promise.reject(e);
  }
};

exports.setMeta = setMeta;

var getMeta = function getMeta(options) {
  try {
    var loc = metaFileLocation(options);
    return Promise.resolve(new Promise(function (res, rej) {
      fs.readFile(loc, 'utf-8', function (err, data) {
        if (err) {
          rej(err);
        } else {
          var metaContent = JSON.parse(data);
          res(metaContent);
        }
      });
    }));
  } catch (e) {
    return Promise.reject(e);
  }
};

exports.getMeta = getMeta;

var writeJsonToFile = function writeJsonToFile(location, data) {
  try {
    return writeToFile(location, JSON.stringify(data));
  } catch (e) {
    return Promise.reject(e);
  }
};

exports.writeJsonToFile = writeJsonToFile;

var writeToFile = function writeToFile(location, data) {
  try {
    return Promise.resolve(new Promise(function (res, rej) {
      fs.writeFile(location, data, 'utf-8', function (err) {
        if (err) {
          rej(err);
        } else {
          res();
        }
      });
    }));
  } catch (e) {
    return Promise.reject(e);
  }
};

exports.writeToFile = writeToFile;

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
    var currentTime = (0, _util.now)();
    var metaData = {
      createdAt: currentTime,
      updatedAt: currentTime,
      collectionStates: {}
    };
    fs.writeFileSync(metaLoc, JSON.stringify(metaData), 'utf-8');
  }

  Object.keys(database.collections).forEach(function (collectionName) {
    ensureFolderExists(path.join(options.directory, collectionName));
  });
}

function metaFileLocation(options) {
  return path.join(options.directory, 'backup_meta.json');
}

function documentFolder(options, docId) {
  return path.join(options.directory, docId);
}
//# sourceMappingURL=file-util.js.map