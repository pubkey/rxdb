/**
 * For some RxStorage implementations,
 * we need to use our custom crafted indexes
 * so we can easily iterate over them. And sort plain arrays of document data.
 */

import { getSchemaByObjectPath } from './rx-schema-helper';
import { RxDocumentData, RxJsonSchema } from './types';
import objectPath from 'object-path';
import { newRxError } from './rx-error';


/**
 * Crafts an indexable string that can be used
 * to check if a document would be sorted below or above 
 * another documents, dependent on the index values.
 */
export function getIndexableString<RxDocType>(
    schema: RxJsonSchema<RxDocType>,
    index: string[],
    docData: RxDocumentData<RxDocType>
): string {
    let str = '';
    index.forEach(fieldName => {
        const schemaPart = getSchemaByObjectPath(
            schema,
            fieldName
        );
        const fieldValue = objectPath.get(docData, fieldName);

        switch (typeof fieldValue) {
            case 'string':
                const maxLength = schemaPart.maxLength;
                if (!maxLength) {
                    throw newRxError('SC34', {
                        index,
                        field: fieldName,
                        schema
                    });
                }

                str += fieldValue.padStart(maxLength, ' ');
                break;
            case 'boolean':
                const boolToStr = fieldValue ? '1' : '0';
                str += boolToStr;
                break;
            case 'number':

                const multipleOf = schemaPart.multipleOf;
                if(!multipleOf) {
                    throw newRxError('SC35', {
                        index,
                        field: fieldName,
                        schema
                    });
                }

                // const maximum = schemaPart.maximum;
                // const minimum = schemaPart.minimum;

                break;
        }


    });
    return str;
}
