import {
    RxCollection
} from './types';
import {
    clone
} from './util';

/**
 * wrappers for Pouch.put/get to handle keycompression etc
 */
export function _handleToPouch(
    col: RxCollection | any,
    docData: any
) {
    let data = clone(docData);
    data = (col._crypter as any).encrypt(data);
    data = col.schema.swapPrimaryToId(data);
    if (col.schema.doKeyCompression())
        data = col._keyCompressor.compress(data);
    return data;
}
export function _handleFromPouch(
    col: RxCollection | any,
    docData: any,
    noDecrypt = false
) {
    let data = clone(docData);
    data = col.schema.swapIdToPrimary(data);
    if (col.schema.doKeyCompression())
        data = col._keyCompressor.decompress(data);
    if (noDecrypt) return data;


    data = (col._crypter as any).decrypt(data);
    return data;
}
