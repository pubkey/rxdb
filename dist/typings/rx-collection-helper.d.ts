import { RxCollection } from './types';
/**
 * wrappers for Pouch.put/get to handle keycompression etc
 */
export declare function _handleToPouch(col: RxCollection | any, docData: any): any;
export declare function _handleFromPouch(col: RxCollection | any, docData: any, noDecrypt?: boolean): any;
