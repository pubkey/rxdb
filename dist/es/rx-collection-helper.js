import { generateId } from './util';
import { newRxError } from './rx-error';
/**
 * wrappers for Pouch.put/get to handle keycompression etc
 */

export function _handleToPouch(col, data) {
  data = col._crypter.encrypt(data);
  data = col.schema.swapPrimaryToId(data);
  if (col.schema.doKeyCompression()) data = col._keyCompressor.compress(data);
  return data;
}
export function _handleFromPouch(col, data) {
  var noDecrypt = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
  data = col.schema.swapIdToPrimary(data);
  if (col.schema.doKeyCompression()) data = col._keyCompressor.decompress(data);
  if (noDecrypt) return data;
  data = col._crypter.decrypt(data);
  return data;
}
/**
 * fills in the _id and the
 * default data.
 * This also clones the data
 */

export function fillObjectDataBeforeInsert(collection, data) {
  var useJson = collection.schema.fillObjectWithDefaults(data);

  if (useJson._id && collection.schema.primaryPath !== '_id') {
    throw newRxError('COL2', {
      data: data
    });
  } // fill _id


  if (collection.schema.primaryPath === '_id' && !useJson._id) {
    useJson._id = generateId();
  }

  return useJson;
}
//# sourceMappingURL=rx-collection-helper.js.map