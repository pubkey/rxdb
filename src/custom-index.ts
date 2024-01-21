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

import {
    getSchemaByObjectPath
} from './rx-schema-helper.ts';
import type {
    JsonSchema,
    RxDocumentData,
    RxJsonSchema
} from './types/index.ts';
import {
    ensureNotFalsy,
    objectPathMonad,
    ObjectPathMonadFunction
} from './plugins/utils/index.ts';
import {
    INDEX_MAX,
    INDEX_MIN
} from './query-planner.ts';


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
    /*
     * Only in number fields.
     */
    parsedLengths?: ParsedLengths;
    getValue: ObjectPathMonadFunction<RxDocType>;
    getIndexStringPart: (docData: RxDocumentData<RxDocType>) => string;
};

export function getIndexMeta<RxDocType>(
    schema: RxJsonSchema<RxDocumentData<RxDocType>>,
    index: string[]
): IndexMetaField<RxDocType>[] {
    const fieldNameProperties: IndexMetaField<RxDocType>[] = index.map(fieldName => {
        const schemaPart = getSchemaByObjectPath(
            schema,
            fieldName
        );
        if (!schemaPart) {
            throw new Error('not in schema: ' + fieldName);
        }
        const type = schemaPart.type;
        let parsedLengths: ParsedLengths | undefined;
        if (type === 'number' || type === 'integer') {
            parsedLengths = getStringLengthOfIndexNumber(
                schemaPart
            );
        }

        const getValue = objectPathMonad(fieldName);
        const maxLength = schemaPart.maxLength ? schemaPart.maxLength : 0;

        let getIndexStringPart: (docData: RxDocumentData<RxDocType>) => string;
        if (type === 'string') {
            getIndexStringPart = docData => {
                let fieldValue = getValue(docData);
                if (!fieldValue) {
                    fieldValue = '';
                }
                return fieldValue.padEnd(maxLength, ' ');
            };
        } else if (type === 'boolean') {
            getIndexStringPart = docData => {
                const fieldValue = getValue(docData);
                return fieldValue ? '1' : '0';
            };
        } else { // number
            getIndexStringPart = docData => {
                const fieldValue = getValue(docData);
                return getNumberIndexString(
                    parsedLengths as any,
                    fieldValue
                );
            };
        }

        const ret: IndexMetaField<RxDocType> = {
            fieldName,
            schemaPart,
            parsedLengths,
            getValue,
            getIndexStringPart
        };
        return ret;
    });
    return fieldNameProperties;
}


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
export function getIndexableStringMonad<RxDocType>(
    schema: RxJsonSchema<RxDocumentData<RxDocType>>,
    index: string[]
): (docData: RxDocumentData<RxDocType>) => string {
    const fieldNameProperties = getIndexMeta(schema, index);
    const fieldNamePropertiesAmount = fieldNameProperties.length;
    const indexPartsFunctions = fieldNameProperties.map(r => r.getIndexStringPart);


    /**
     * @hotPath Performance of this function is very critical!
     */
    const ret = function (docData: RxDocumentData<RxDocType>): string {
        let str = '';
        for (let i = 0; i < fieldNamePropertiesAmount; ++i) {
            str += indexPartsFunctions[i](docData);
        }
        return str;
    };
    return ret;
}


declare type ParsedLengths = {
    minimum: number;
    maximum: number;
    nonDecimals: number;
    decimals: number;
    roundedMinimum: number;
};
export function getStringLengthOfIndexNumber(
    schemaPart: JsonSchema
): ParsedLengths {
    const minimum = Math.floor(schemaPart.minimum as number);
    const maximum = Math.ceil(schemaPart.maximum as number);
    const multipleOf: number = schemaPart.multipleOf as number;

    const valueSpan = maximum - minimum;
    const nonDecimals = valueSpan.toString().length;

    const multipleOfParts = multipleOf.toString().split('.');
    let decimals = 0;
    if (multipleOfParts.length > 1) {
        decimals = multipleOfParts[1].length;
    }
    return {
        minimum,
        maximum,
        nonDecimals,
        decimals,
        roundedMinimum: minimum
    };
}

export function getIndexStringLength<RxDocType>(
    schema: RxJsonSchema<RxDocumentData<RxDocType>>,
    index: string[]
): number {
    const fieldNameProperties = getIndexMeta(schema, index);
    let length = 0;
    fieldNameProperties.forEach(props => {
        const schemaPart = props.schemaPart;
        const type = schemaPart.type;

        if (type === 'string') {
            length += schemaPart.maxLength as number;
        } else if (type === 'boolean') {
            length += 1;
        } else {
            const parsedLengths = props.parsedLengths as ParsedLengths;
            length = length + parsedLengths.nonDecimals + parsedLengths.decimals;
        }

    });
    return length;
}


export function getPrimaryKeyFromIndexableString(
    indexableString: string,
    primaryKeyLength: number
): string {
    const paddedPrimaryKey = indexableString.slice(primaryKeyLength * -1);
    // we can safely trim here because the primary key is not allowed to start or end with a space char.
    const primaryKey = paddedPrimaryKey.trim();
    return primaryKey;
}


export function getNumberIndexString(
    parsedLengths: ParsedLengths,
    fieldValue: number
): string {
    /**
     * Ensure that the given value is in the boundaries
     * of the schema, otherwise it would create a broken index string.
     * This can happen for example if you have a minimum of 0
     * and run a query like
     * selector {
     *  numField: { $gt: -1000 }
     * }
     */
    if (typeof fieldValue === 'undefined') {
        fieldValue = 0;
    }
    if (fieldValue < parsedLengths.minimum) {
        fieldValue = parsedLengths.minimum;
    }
    if (fieldValue > parsedLengths.maximum) {
        fieldValue = parsedLengths.maximum;
    }

    const nonDecimalsValueAsString = (Math.floor(fieldValue) - parsedLengths.roundedMinimum).toString();
    let str = nonDecimalsValueAsString.padStart(parsedLengths.nonDecimals, '0');

    if (parsedLengths.decimals > 0) {
        const splitByDecimalPoint = fieldValue.toString().split('.');
        const decimalValueAsString = splitByDecimalPoint.length > 1 ? splitByDecimalPoint[1] : '0';
        str += decimalValueAsString.padEnd(parsedLengths.decimals, '0');
    }
    return str;
}

export function getStartIndexStringFromLowerBound(
    schema: RxJsonSchema<any>,
    index: string[],
    lowerBound: (string | boolean | number | null | undefined)[]
): string {
    let str = '';
    index.forEach((fieldName, idx) => {
        const schemaPart = getSchemaByObjectPath(
            schema,
            fieldName
        );
        const bound = lowerBound[idx];
        const type = schemaPart.type;

        switch (type) {
            case 'string':
                const maxLength = ensureNotFalsy(schemaPart.maxLength, 'maxLength not set');
                if (typeof bound === 'string') {
                    str += (bound as string).padEnd(maxLength, ' ');
                } else {
                    // str += ''.padStart(maxLength, inclusiveStart ? ' ' : INDEX_MAX);
                    str += ''.padEnd(maxLength, ' ');
                }
                break;
            case 'boolean':
                if (bound === null) {
                    str += '0';
                } else if (bound === INDEX_MIN) {
                    str += '0';
                } else if (bound === INDEX_MAX) {
                    str += '1';
                } else {
                    const boolToStr = bound ? '1' : '0';
                    str += boolToStr;
                }
                break;
            case 'number':
            case 'integer':
                const parsedLengths = getStringLengthOfIndexNumber(
                    schemaPart
                );
                if (bound === null || bound === INDEX_MIN) {
                    const fillChar = '0';
                    str += fillChar.repeat(parsedLengths.nonDecimals + parsedLengths.decimals);
                } else if (bound === INDEX_MAX) {
                    str += getNumberIndexString(
                        parsedLengths,
                        parsedLengths.maximum
                    );
                } else {
                    const add = getNumberIndexString(
                        parsedLengths,
                        bound as number
                    );
                    str += add;
                }
                break;
            default:
                throw new Error('unknown index type ' + type);
        }
    });
    return str;
}


export function getStartIndexStringFromUpperBound(
    schema: RxJsonSchema<any>,
    index: string[],
    upperBound: (string | boolean | number | null | undefined)[]
): string {
    let str = '';
    index.forEach((fieldName, idx) => {
        const schemaPart = getSchemaByObjectPath(
            schema,
            fieldName
        );
        const bound = upperBound[idx];
        const type = schemaPart.type;

        switch (type) {
            case 'string':
                const maxLength = ensureNotFalsy(schemaPart.maxLength, 'maxLength not set');
                if (typeof bound === 'string' && bound !== INDEX_MAX) {
                    str += (bound as string).padEnd(maxLength, ' ');
                } else if (bound === INDEX_MIN) {
                    str += ''.padEnd(maxLength, ' ');
                } else {
                    str += ''.padEnd(maxLength, INDEX_MAX);
                }
                break;
            case 'boolean':
                if (bound === null) {
                    str += '1';
                } else {
                    const boolToStr = bound ? '1' : '0';
                    str += boolToStr;
                }
                break;
            case 'number':
            case 'integer':
                const parsedLengths = getStringLengthOfIndexNumber(
                    schemaPart
                );
                if (bound === null || bound === INDEX_MAX) {
                    const fillChar = '9';
                    str += fillChar.repeat(parsedLengths.nonDecimals + parsedLengths.decimals);
                } else if (bound === INDEX_MIN) {
                    const fillChar = '0';
                    str += fillChar.repeat(parsedLengths.nonDecimals + parsedLengths.decimals);
                } else {
                    str += getNumberIndexString(
                        parsedLengths,
                        bound as number
                    );
                }
                break;
            default:
                throw new Error('unknown index type ' + type);
        }
    });
    return str;
}

/**
 * Used in storages where it is not possible
 * to define inclusiveEnd/inclusiveStart
 */
export function changeIndexableStringByOneQuantum(str: string, direction: 1 | -1): string {
    const lastChar = str.slice(-1);
    let charCode = lastChar.charCodeAt(0);
    charCode = charCode + direction;
    const withoutLastChar = str.slice(0, -1);
    return withoutLastChar + String.fromCharCode(charCode);
}
