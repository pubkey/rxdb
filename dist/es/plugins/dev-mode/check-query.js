import { newRxTypeError } from '../../rx-error';
/**
 * accidentially passing a non-valid object into the query params
 * is very hard to debug especially when queries are observed
 * This is why we do some checks here in dev-mode
 */

export function checkQuery(args) {
  var isPlainObject = Object.prototype.toString.call(args.queryObj) === '[object Object]';

  if (!isPlainObject) {
    throw newRxTypeError('QU11', {
      op: args.op,
      collection: args.collection.name,
      queryObj: args.queryObj
    });
  }

  var validKeys = ['selector', 'limit', 'skip', 'sort'];
  Object.keys(args.queryObj).forEach(function (key) {
    if (!validKeys.includes(key)) {
      throw newRxTypeError('QU11', {
        op: args.op,
        collection: args.collection.name,
        queryObj: args.queryObj,
        key: key
      });
    }
  });
}
//# sourceMappingURL=check-query.js.map