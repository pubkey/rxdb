import { runAsyncPluginHooks } from "../../hooks.js";
import { DEFAULT_CLEANUP_POLICY } from "./cleanup-helper.js";
import { startCleanupForRxState } from "./cleanup-state.js";
import { startCleanupForRxCollection } from "./cleanup.js";
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
        var isDone = false;
        while (!isDone && !this.closed) {
          isDone = await this.storageInstance.cleanup(minimumDeletedTime);
        }
        await runAsyncPluginHooks('postCleanup', {
          collectionName: this.name,
          databaseName: this.database.name
        });
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