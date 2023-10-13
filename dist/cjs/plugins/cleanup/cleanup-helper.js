"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DEFAULT_CLEANUP_POLICY = void 0;
var DEFAULT_CLEANUP_POLICY = exports.DEFAULT_CLEANUP_POLICY = {
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