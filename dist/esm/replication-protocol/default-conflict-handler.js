import { deepEqual } from "../plugins/utils/index.js";
import { stripAttachmentsDataFromDocument } from "../rx-storage-helper.js";
export var defaultConflictHandler = {
  isEqual(a, b) {
    /**
     * If the documents are deep equal,
     * we have no conflict.
     * On your custom conflict handler you might only
     * check some properties, like the updatedAt time,
     * for better performance, because deepEqual is expensive.
     */
    return deepEqual(stripAttachmentsDataFromDocument(a), stripAttachmentsDataFromDocument(b));
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