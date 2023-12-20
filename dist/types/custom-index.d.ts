/**
 * For some RxStorage implementations,
 * we need to use our custom crafted indexes
 * so we can easily iterate over them. And sort plain arrays of document data.
 *
 * We really often have to craft an index string for a given document.
 * Performance of everything in this file is very important
 * which is why the code sometimes looks strange.
 * Run performance tests before and after you touch anything here!
 */
import type { JsonSchema, RxDocumentData, RxJsonSchema } from './types/index.ts';
import { ObjectPathMonadFunction } from './plugins/utils/index.ts';
/**
 * Prepare all relevant information
 * outside of the returned function
 * from getIndexableStringMonad()
 * to save performance when the returned
 * function is called many times.
 */
type IndexMetaField<RxDocType> = {
    fieldName: string;
    schemaPart: JsonSchema;
    parsedLengths?: ParsedLengths;
    getValue: ObjectPathMonadFunction<RxDocType>;
    getIndexStringPart: (docData: RxDocumentData<RxDocType>) => string;
};
export declare function getIndexMeta<RxDocType>(schema: RxJsonSchema<RxDocumentData<RxDocType>>, index: string[]): IndexMetaField<RxDocType>[];
/**
 * Crafts an indexable string that can be used
 * to check if a document would be sorted below or above
 * another documents, dependent on the index values.
 * @monad for better performance
 *
 * IMPORTANT: Performance is really important here
 * which is why we code so 'strange'.
 * Always run performance tests when you want to
 * change something in this method.
 */
export declare function getIndexableStringMonad<RxDocType>(schema: RxJsonSchema<RxDocumentData<RxDocType>>, index: string[]): (docData: RxDocumentData<RxDocType>) => string;
declare type ParsedLengths = {
    minimum: number;
    maximum: number;
    nonDecimals: number;
    decimals: number;
    roundedMinimum: number;
};
export declare function getStringLengthOfIndexNumber(schemaPart: JsonSchema): ParsedLengths;
export declare function getIndexStringLength<RxDocType>(schema: RxJsonSchema<RxDocumentData<RxDocType>>, index: string[]): number;
export declare function getPrimaryKeyFromIndexableString(indexableString: string, primaryKeyLength: number): string;
export declare function getNumberIndexString(parsedLengths: ParsedLengths, fieldValue: number): string;
export declare function getStartIndexStringFromLowerBound(schema: RxJsonSchema<any>, index: string[], lowerBound: (string | boolean | number | null | undefined)[]): string;
export declare function getStartIndexStringFromUpperBound(schema: RxJsonSchema<any>, index: string[], upperBound: (string | boolean | number | null | undefined)[]): string;
/**
 * Used in storages where it is not possible
 * to define inclusiveEnd/inclusiveStart
 */
export declare function changeIndexableStringByOneQuantum(str: string, direction: 1 | -1): string;
export {};
