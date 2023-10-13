export var DEFAULT_CLEANUP_POLICY = {
  minimumDeletedTime: 1000 * 60 * 60 * 24 * 31,
  // one month
  minimumCollectionAge: 1000 * 60,
  // 60 seconds
  runEach: 1000 * 60 * 5,
  // 5 minutes
  awaitReplicationsInSync: true,
  waitForLeadership: true
};
//# sourceMappingURL=cleanup-helper.js.map