import { ensureRxStorageInstanceParamsAreCorrect } from "../../rx-storage-helper.js";
import { RXDB_VERSION } from "../utils/utils-rxdb-version.js";
import { createFoundationDBStorageInstance } from "./rx-storage-instance-foundationdb.js";
var versionSet;
export function getRxStorageFoundationDB(settings) {
  if (versionSet && versionSet !== settings.apiVersion) {
    throw new Error('foundationdb already initialized with api version ' + versionSet);
  } else if (!versionSet) {
    versionSet = settings.apiVersion;
    var {
      setAPIVersion
    } = require('foundationdb');
    setAPIVersion(settings.apiVersion);
  }
  var storage = {
    name: 'foundationdb',
    rxdbVersion: RXDB_VERSION,
    createStorageInstance(params) {
      ensureRxStorageInstanceParamsAreCorrect(params);
      var useSettings = Object.assign({}, settings, params.options);
      if (!useSettings.batchSize) {
        useSettings.batchSize = 50;
      }
      return createFoundationDBStorageInstance(this, params, useSettings);
    }
  };
  return storage;
}
export * from "./foundationdb-types.js";
export * from "./foundationdb-helpers.js";
//# sourceMappingURL=index.js.map