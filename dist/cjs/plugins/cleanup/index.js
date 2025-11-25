"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  RxDBCleanupPlugin: true
};
exports.RxDBCleanupPlugin = void 0;
var _cleanupHelper = require("./cleanup-helper.js");
var _cleanupState = require("./cleanup-state.js");
var _cleanup = require("./cleanup.js");
Object.keys(_cleanup).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _cleanup[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _cleanup[key];
    }
  });
});
var RxDBCleanupPlugin = exports.RxDBCleanupPlugin = {
  name: 'cleanup',
  rxdb: true,
  prototypes: {
    RxCollection: proto => {
      proto.cleanup = async function (minimumDeletedTime) {
        var cleanupPolicy = Object.assign({}, _cleanupHelper.DEFAULT_CLEANUP_POLICY, this.database.cleanupPolicy ? this.database.cleanupPolicy : {});
        if (typeof minimumDeletedTime === 'undefined') {
          minimumDeletedTime = cleanupPolicy.minimumDeletedTime;
        }

        // run cleanup() until it returns true
        await (0, _cleanup.cleanupRxCollection)(this, cleanupPolicy);
      };
    }
  },
  hooks: {
    createRxCollection: {
      after: i => {
        (0, _cleanup.startCleanupForRxCollection)(i.collection);
      }
    },
    createRxState: {
      after: i => {
        (0, _cleanupState.startCleanupForRxState)(i.state);
      }
    }
  }
};
//# sourceMappingURL=index.js.map