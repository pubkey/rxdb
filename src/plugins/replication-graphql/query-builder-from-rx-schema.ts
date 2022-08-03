import {
    GraphQLSchemaFromRxSchemaInputSingleCollection,
    fillUpOptionals,
    Prefixes,
    SPACING
} from './graphql-schema-from-rx-schema';
import { ucfirst } from '../../util';
import type {
    RxGraphQLReplicationPullQueryBuilder,
    RxGraphQLReplicationPushQueryBuilder,
    WithDeleted
} from '../../types';
import { newRxError } from '../../rx-error';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema-helper';

export function pullQueryBuilderFromRxSchema(
    collectionName: string,
    input: GraphQLSchemaFromRxSchemaInputSingleCollection,
    batchSize: number
): RxGraphQLReplicationPullQueryBuilder<any> {
    input = fillUpOptionals(input);
    const schema = input.schema;
    const prefixes: Prefixes = input.prefixes as any;

    const ucCollectionName = ucfirst(collectionName);
    const queryName = prefixes.pull + ucCollectionName;

    const outputFields = Object.keys(schema.properties).filter(k => !(input.ignoreOutputKeys as string[]).includes(k));
    // outputFields.push(input.deletedFlag);

    const builder: RxGraphQLReplicationPullQueryBuilder<any> = (doc: any) => {

        const queryKeys = input.checkpointFields.map(key => {
            const subSchema: any = schema.properties[key];
            if (!subSchema) {
                throw newRxError('GQL1', {
                    document: doc,
                    schema,
                    key,
                    args: {
                        feedKeys: input.checkpointFields
                    }
                });
            }
            const type = subSchema.type;
            const value = doc ? doc[key] : null;
            let keyString = key + ': ';
            if (type === 'number' || type === 'integer' || !value) {
                keyString += value;
            } else {
                keyString += '"' + value + '"';
            }
            return keyString;
        });
        queryKeys.push('limit: ' + batchSize);

        const query = '' +
            '{\n' +
            SPACING + queryName + '(' + queryKeys.join(', ') + ') {\n' +
            SPACING + SPACING + outputFields.join('\n' + SPACING + SPACING) + '\n' +
            SPACING + '}\n' +
            '}';
        return {
            query,
            variables: {}
        };
    };

    return builder;
}


export function pushQueryBuilderFromRxSchema(
    collectionName: string,
    input: GraphQLSchemaFromRxSchemaInputSingleCollection
): RxGraphQLReplicationPushQueryBuilder {
    const primaryKey = getPrimaryFieldOfPrimaryKey(input.schema.primaryKey);
    input = fillUpOptionals(input);
    const prefixes: Prefixes = input.prefixes as any;

    const ucCollectionName = ucfirst(collectionName);
    const queryName = prefixes.push + ucCollectionName;

    const builder: RxGraphQLReplicationPushQueryBuilder = (pushRows) => {
        const query = '' +
            'mutation Set' + ucCollectionName + '($' + collectionName + ': [' + ucCollectionName + 'Input]) {\n' +
            SPACING + queryName + '(' + collectionName + ': $' + collectionName + ') {\n' +
            SPACING + SPACING + primaryKey + '\n' + // GraphQL enforces to return at least one field
            SPACING + '}\n' +
            '}';

        const sendRows: typeof pushRows = [];
        function transformPushDoc(doc: WithDeleted<any>) {
            const sendDoc: any = {};
            Object.entries(doc).forEach(([k, v]) => {
                if (
                    // skip if in ignoreInputKeys list
                    !(input.ignoreInputKeys as string[]).includes(k) &&
                    // only use properties that are in the schema
                    input.schema.properties[k]
                ) {
                    sendDoc[k] = v;
                }
            });
            return sendDoc;
        }
        pushRows.forEach(pushRow => {
            const newRow: typeof pushRow = {
                newDocumentState: transformPushDoc(pushRow.newDocumentState),
                assumedMasterState: pushRow.assumedMasterState ? transformPushDoc(pushRow.assumedMasterState) : undefined
            };
            sendRows.push(newRow);
        });
        const variables = {
            [collectionName]: sendRows
        };
        return {
            query,
            variables
        };
    };

    return builder;
}
