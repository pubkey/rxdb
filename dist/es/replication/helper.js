import { createRevision, flatClone, getDefaultRevision, now } from '../util';
export function docStateToWriteDoc(docState, previous) {
  var docData = Object.assign({}, docState, {
    _attachments: {},
    _meta: {
      lwt: now()
    },
    _rev: getDefaultRevision()
  });
  docData._rev = createRevision(docData, previous);
  return docData;
}
export function writeDocToDocState(writeDoc) {
  var ret = flatClone(writeDoc);
  delete ret._attachments;
  delete ret._meta;
  delete ret._rev;
  return ret;
}
//# sourceMappingURL=helper.js.map