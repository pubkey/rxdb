import { DEFAULT_CLEANUP_POLICY } from "./cleanup-helper.js";
import { startCleanupForRxState } from "./cleanup-state.js";
import { cleanupRxCollection, startCleanupForRxCollection } from "./cleanup.js";
export var RxDBCleanupPlugin = {
  name: 'cleanup',
  rxdb: true,
  prototypes: {
    RxCollection: proto => {
      proto.cleanup = async function (minimumDeletedTime) {
        var cleanupPolicy = Object.assign({}, DEFAULT_CLEANUP_POLICY, this.database.cleanupPolicy ? this.database.cleanupPolicy : {});
        if (typeof minimumDeletedTime === 'undefined') {
          minimumDeletedTime = cleanupPolicy.minimumDeletedTime;
        }

        // run cleanup() until it returns true
        await cleanupRxCollection(this, cleanupPolicy);
      };
    }
  },
  hooks: {
    createRxCollection: {
      after: i => {
        startCleanupForRxCollection(i.collection);
      }
    },
    createRxState: {
      after: i => {
        startCleanupForRxState(i.state);
      }
    }
  }
};
export * from "./cleanup.js";
//# sourceMappingURL=index.js.map