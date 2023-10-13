import { startCleanupForRxCollection } from "./cleanup.js";
export var RxDBCleanupPlugin = {
  name: 'cleanup',
  rxdb: true,
  prototypes: {},
  hooks: {
    createRxCollection: {
      after: i => {
        startCleanupForRxCollection(i.collection);
      }
    }
  }
};
export * from "./cleanup.js";
//# sourceMappingURL=index.js.map