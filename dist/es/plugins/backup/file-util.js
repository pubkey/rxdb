import * as fs from 'fs';
import * as path from 'path';
import { now } from '../../util';
/**
 * ensure that the given folder exists
 */

export var setMeta = function setMeta(options, meta) {
  try {
    var loc = metaFileLocation(options);
    return writeJsonToFile(loc, meta);
  } catch (e) {
    return Promise.reject(e);
  }
};
export var getMeta = function getMeta(options) {
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
export var writeJsonToFile = function writeJsonToFile(location, data) {
  try {
    return writeToFile(location, JSON.stringify(data));
  } catch (e) {
    return Promise.reject(e);
  }
};
export var writeToFile = function writeToFile(location, data) {
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
    var currentTime = now();
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
export function metaFileLocation(options) {
  return path.join(options.directory, 'backup_meta.json');
}
export function documentFolder(options, docId) {
  return path.join(options.directory, docId);
}
//# sourceMappingURL=file-util.js.map