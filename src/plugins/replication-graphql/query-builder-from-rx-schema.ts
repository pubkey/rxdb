import {
    GraphQLSchemaFromRxSchemaInputSingleCollection,
    fillUpOptionals,
    Prefixes,
    SPACING
} from './graphql-schema-from-rx-schema';
import { ensureNotFalsy, ucfirst } from '../../plugins/utils';
import type {
    RxGraphQLReplicationPullQueryBuilder,
    RxGraphQLReplicationPullStreamQueryBuilder,
    RxGraphQLReplicationPushQueryBuilder,
    WithDeleted
} from '../../types';

export function pullQueryBuilderFromRxSchema(
    collectionName: string,
    input: GraphQLSchemaFromRxSchemaInputSingleCollection,
): RxGraphQLReplicationPullQueryBuilder<any> {
    input = fillUpOptionals(input);
    const schema = input.schema;
    const prefixes: Prefixes = input.prefixes as any;

    const ucCollectionName = ucfirst(collectionName);
    const queryName = prefixes.pull + ucCollectionName;

    const outputFields = Object.keys(schema.properties).filter(k => !(input.ignoreOutputKeys as string[]).includes(k));
    // outputFields.push(input.deletedField);

    const checkpointInputName = ucCollectionName + 'Input' + prefixes.checkpoint;

    const builder: RxGraphQLReplicationPullQueryBuilder<any> = (checkpoint: any, limit: number) => {
        const query = 'query ' + ucfirst(queryName) + '($checkpoint: ' + checkpointInputName + ', $limit: Int!) {\n' +
            SPACING + SPACING + queryName + '(checkpoint: $checkpoint, limit: $limit) {\n' +
            SPACING + SPACING + SPACING + 'documents {\n' +
            SPACING + SPACING + SPACING + SPACING + outputFields.join('\n' + SPACING + SPACING + SPACING + SPACING) + '\n' +
            SPACING + SPACING + SPACING + '}\n' +
            SPACING + SPACING + SPACING + 'checkpoint {\n' +
            SPACING + SPACING + SPACING + SPACING + input.checkpointFields.join('\n' + SPACING + SPACING + SPACING + SPACING) + '\n' +
            SPACING + SPACING + SPACING + '}\n' +
            SPACING + SPACING + '}\n' +
            '}';
        return {
            query,
            variables: {
                checkpoint,
                limit
            }
        };
    };

    return builder;
}

export function pullStreamBuilderFromRxSchema(
    collectionName: string,
    input: GraphQLSchemaFromRxSchemaInputSingleCollection,
) {
    input = fillUpOptionals(input);
    const schema = input.schema;
    const prefixes: Prefixes = input.prefixes as any;

    const ucCollectionName = ucfirst(collectionName);
    const outputFields = Object.keys(schema.properties).filter(k => !(input.ignoreOutputKeys as string[]).includes(k));

    const headersName = ucCollectionName + 'Input' + prefixes.headers;

    const query = 'subscription on' + ucfirst(ensureNotFalsy(prefixes.stream)) + '($headers: ' + headersName + ') {\n' +
        SPACING + prefixes.stream + ucCollectionName + '(headers: $headers) {\n' +
        SPACING + SPACING + SPACING + 'documents {\n' +
        SPACING + SPACING + SPACING + SPACING + outputFields.join('\n' + SPACING + SPACING + SPACING + SPACING) + '\n' +
        SPACING + SPACING + SPACING + '}\n' +
        SPACING + SPACING + SPACING + 'checkpoint {\n' +
        SPACING + SPACING + SPACING + SPACING + input.checkpointFields.join('\n' + SPACING + SPACING + SPACING + SPACING) + '\n' +
        SPACING + SPACING + SPACING + '}\n' +
        SPACING + '}' +
        '}';

    const builder: RxGraphQLReplicationPullStreamQueryBuilder = (headers: any) => {
        return {
            query,
            variables: {
                headers
            }
        };
    };
    return builder;
}


export function pushQueryBuilderFromRxSchema(
    collectionName: string,
    input: GraphQLSchemaFromRxSchemaInputSingleCollection
): RxGraphQLReplicationPushQueryBuilder {
    input = fillUpOptionals(input);
    const prefixes: Prefixes = input.prefixes as any;

    const ucCollectionName = ucfirst(collectionName);
    const queryName = prefixes.push + ucCollectionName;

    const variableName = collectionName + prefixes.pushRow;


    const returnFields: string[] = Object.keys(input.schema.properties);

    const builder: RxGraphQLReplicationPushQueryBuilder = (pushRows) => {
        const query = '' +
            'mutation ' + prefixes.push + ucCollectionName + '($' + variableName + ': [' + ucCollectionName + 'Input' + prefixes.pushRow + '!]) {\n' +
            SPACING + queryName + '(' + variableName + ': $' + variableName + ') {\n' +
            SPACING + SPACING + returnFields.join(',\n' + SPACING + SPACING) + '\n' +
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
            [variableName]: sendRows
        };
        return {
            query,
            variables
        };
    };

    return builder;
}
