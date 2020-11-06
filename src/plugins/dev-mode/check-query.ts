import { RxPluginPreCreateRxQueryArgs, MangoQuery } from '../../types';
import { newRxTypeError } from '../../rx-error';

/**
 * accidentially passing a non-valid object into the query params
 * is very hard to debug especially when queries are observed
 * This is why we do some checks here in dev-mode
 */
export function checkQuery(args: RxPluginPreCreateRxQueryArgs) {
    const isPlainObject = Object.prototype.toString.call(args.queryObj) === '[object Object]';
    if (!isPlainObject) {
        throw newRxTypeError('QU11', {
            op: args.op,
            collection: args.collection.name,
            queryObj: args.queryObj
        });
    }

    const validKeys: (keyof MangoQuery)[] = [
        'selector',
        'limit',
        'skip',
        'sort'
    ];
    Object.keys(args.queryObj).forEach(key => {
        if (!(validKeys as string[]).includes(key)) {
            throw newRxTypeError('QU11', {
                op: args.op,
                collection: args.collection.name,
                queryObj: args.queryObj,
                key
            });
        }
    });
}
