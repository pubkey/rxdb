"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.defaultConflictHandler = void 0;
var _index = require("../plugins/utils/index.js");
var _rxStorageHelper = require("../rx-storage-helper.js");
var defaultConflictHandler = exports.defaultConflictHandler = {
  isEqual(a, b) {
    /**
     * If the documents are deep equal,
     * we have no conflict.
     * On your custom conflict handler you might only
     * check some properties, like the updatedAt time,
     * for better performance, because deepEqual is expensive.
     */
    return (0, _index.deepEqual)((0, _rxStorageHelper.stripAttachmentsDataFromDocument)(a), (0, _rxStorageHelper.stripAttachmentsDataFromDocument)(b));
  },
  resolve(i) {
    /**
     * The default conflict handler will always
     * drop the fork state and use the master state instead.
     */
    return i.realMasterState;
  }
};
//# sourceMappingURL=default-conflict-handler.js.map