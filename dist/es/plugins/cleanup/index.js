import { startCleanupForRxCollection } from './cleanup';
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
export * from './cleanup';
//# sourceMappingURL=index.js.map