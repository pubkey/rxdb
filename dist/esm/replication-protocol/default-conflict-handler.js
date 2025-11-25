import { deepEqual, flatClone } from "../plugins/utils/index.js";
import { stripAttachmentsDataFromDocument } from "../rx-storage-helper.js";
export var defaultConflictHandler = {
  isEqual(a, b, _ctx) {
    a = addAttachmentsIfNotExists(a);
    b = addAttachmentsIfNotExists(b);

    /**
     * If the documents are deep equal,
     * we have no conflict.
     * On your custom conflict handler you might only
     * check some properties, like the updatedAt time,
     * for better performance, because deepEqual is expensive.
    */
    var ret = deepEqual(stripAttachmentsDataFromDocument(a), stripAttachmentsDataFromDocument(b));
    return ret;
  },
  resolve(i) {
    /**
     * The default conflict handler will always
     * drop the fork state and use the master state instead.
     */
    return i.realMasterState;
  }
};
function addAttachmentsIfNotExists(d) {
  if (!d._attachments) {
    d = flatClone(d);
    d._attachments = {};
  }
  return d;
}
//# sourceMappingURL=default-conflict-handler.js.map