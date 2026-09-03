import type {
    MaybeReadonly,
    RxCollection,
    RxDatabase,
    RxDocumentData
} from '../../types/index.d.ts';
import { INDEX_MAX, INDEX_MIN, getQueryPlan } from '../../query-planner.ts';
import { normalizeMangoQuery } from '../../rx-query-helper.ts';
import { prepareQuery } from '../../rx-query-helper.ts';
import { REPLICATION_STATE_BY_COLLECTION } from '../replication/index.ts';
import type { RxReplicationState } from '../replication/index.ts';
import { countRxQuerySubscribers } from '../../query-cache.ts';
import type {
    DbViewerCollectionInfo,
    DbViewerDocumentsQuery,
    DbViewerDocumentsResult,
    DbViewerExplainFinding,
    DbViewerExplainResult,
    DbViewerLiveQueryInfo,
    DbViewerReplicationInfo,
    DbViewerSchemaFieldReport,
    DbViewerSchemaReport,
    DbViewerStorageReport
} from './protocol.ts';

/**
 * Everything in this file runs in the page of the app, because only that page
 * holds the RxDatabase. The viewer never sees an RxDB object, it only ever
 * receives the plain results below.
 */

export function getReplicationStates(
    database: RxDatabase,
    collectionName: string
): RxReplicationState<any, any>[] {
    const collection = database.collections[collectionName];
    if (!collection) {
        return [];
    }
    return REPLICATION_STATE_BY_COLLECTION.get(collection as RxCollection) ?? [];
}

export function describeReplication(
    replicationState: RxReplicationState<any, any>,
    error: { message: string; time: number; attempts: number; } | null
): DbViewerReplicationInfo {
    return {
        identifier: replicationState.replicationIdentifier,
        hasPull: Boolean(replicationState.pull),
        hasPush: Boolean(replicationState.push),
        active: replicationState.subjects.active.getValue(),
        canceled: replicationState.subjects.canceled.getValue(),
        checkpoint: describeCheckpoint(replicationState),
        error
    };
}

function describeCheckpoint(replicationState: RxReplicationState<any, any>): string {
    const internal = replicationState.internalReplicationState;
    if (!internal) {
        return 'not started';
    }
    const checkpoint = internal.lastCheckpointDoc.down ?? internal.lastCheckpointDoc.up;
    if (!checkpoint || checkpoint.checkpointData === undefined) {
        return 'none yet';
    }
    try {
        return JSON.stringify(checkpoint.checkpointData);
    } catch (error) {
        return 'unreadable';
    }
}

/**
 * `isLeader()` throws when the leader-election plugin was not added, and the
 * method exists on the prototype either way, so it can only be probed.
 */
export function readLeadership(database: RxDatabase): boolean | null {
    try {
        return database.isLeader();
    } catch (error) {
        return null;
    }
}

export async function collectCollectionInfo(
    database: RxDatabase,
    collectionName: string,
    replicationErrors: Map<string, { message: string; time: number; attempts: number; }>
): Promise<DbViewerCollectionInfo> {
    const collection = database.collections[collectionName];
    const documentCount = await collection.count().exec();
    return {
        name: collectionName,
        primaryPath: collection.schema.primaryPath as string,
        jsonSchema: JSON.parse(JSON.stringify(collection.schema.jsonSchema)),
        indexes: (collection.schema.indexes ?? []).map(
            index => (Array.isArray(index) ? index.slice(0) : [index]) as string[]
        ),
        documentCount,
        replications: getReplicationStates(database, collectionName).map(
            replicationState => describeReplication(
                replicationState,
                replicationErrors.get(collectionName) ?? null
            )
        )
    };
}

export async function collectCounts(database: RxDatabase): Promise<{ [collectionName: string]: number; }> {
    const names = Object.keys(database.collections);
    const counts = await Promise.all(
        names.map(name => database.collections[name].count().exec())
    );
    const result: { [collectionName: string]: number; } = {};
    names.forEach((name, index) => {
        result[name] = counts[index];
    });
    return result;
}

export async function collectDocuments(
    database: RxDatabase,
    params: DbViewerDocumentsQuery
): Promise<DbViewerDocumentsResult> {
    const collection = database.collections[params.collectionName];
    if (!collection) {
        throw new Error('unknown collection ' + params.collectionName);
    }
    const total = await collection.count({ selector: params.selector }).exec();
    const documents = await collection.find({
        selector: params.selector,
        sort: [{ [params.sort.field]: params.sort.direction } as any],
        skip: params.skip,
        limit: params.limit
    }).exec();
    return {
        documents: documents.map(document => document.toJSON(true)),
        total
    };
}

export async function collectLiveQueries(
    database: RxDatabase,
    collectionName: string,
    emitState: Map<number, { count: number; lastEmitAt: number; }>
): Promise<DbViewerLiveQueryInfo[]> {
    const collection = database.collections[collectionName];
    if (!collection) {
        return [];
    }
    const result: DbViewerLiveQueryInfo[] = [];
    (collection as any)._queryCache._map.forEach((query: any, stringRepresentation: string) => {
        const seen = emitState.get(query.id);
        result.push({
            stringRepresentation,
            subscribers: countRxQuerySubscribers(query),
            resultCount: getQueryResultCount(query),
            emitCount: seen ? seen.count : 0,
            lastEmitAt: seen ? seen.lastEmitAt : 0
        });
    });
    return result.sort((a, b) => b.subscribers - a.subscribers);
}

export function getQueryResultCount(query: any): number {
    const result = query._result;
    if (!result) {
        return 0;
    }
    return Array.isArray(result.docsData) ? result.docsData.length : 0;
}

/**
 * Runs the selector and reports what the storage had to do for it:
 * which index was used, how many documents it examined and what it discarded.
 */
export async function explainQuery(
    database: RxDatabase,
    params: { collectionName: string; selector: any; sort: { field: string; direction: 'asc' | 'desc'; }; }
): Promise<DbViewerExplainResult> {
    const collection = database.collections[params.collectionName];
    if (!collection) {
        throw new Error('unknown collection ' + params.collectionName);
    }
    const normalized = normalizeMangoQuery(
        collection.schema.jsonSchema,
        { selector: params.selector, sort: [{ [params.sort.field]: params.sort.direction } as any] }
    );
    const plan = getQueryPlan(collection.schema.jsonSchema, normalized);
    const selectorFields = Object.keys(params.selector).filter(field => !field.startsWith('$'));
    const uncoveredFields = selectorFields.filter(field => !plan.index.includes(field));
    const coveredFields = selectorFields.filter(field => plan.index.includes(field));

    const indexedSelector: any = {};
    coveredFields.forEach(field => {
        indexedSelector[field] = params.selector[field];
    });

    const documents = await collection.find({ selector: params.selector }).exec();
    const examined = plan.selectorSatisfiedByIndex
        ? documents.length
        : await collection.count({ selector: indexedSelector }).exec();
    const returned = documents.length;

    /**
     * Only the fields of the selector are suggested. Appending them to the
     * index RxDB picked would produce an index that starts with an internal
     * field like `_meta.lwt`, which is not something to put into a schema.
     */
    const suggestedIndex = coveredFields.concat(uncoveredFields);
    const declaredIndexes = (collection.schema.indexes ?? []).map(declaredIndexFields);
    const declaredButUnused = suggestedIndex.length > 0 && declaredIndexes.some(
        fields => suggestedIndex.every((field, position) => fields[position] === field)
    );
    const descendingSort = normalized.sort.some(
        (sortPart: any) => Object.values(sortPart)[0] === 'desc'
    );

    return {
        index: plan.index as string[],
        startKeys: plan.startKeys.map((key: any) => describeBound(key, 'start')),
        endKeys: plan.endKeys.map((key: any) => describeBound(key, 'end')),
        inclusiveStart: plan.inclusiveStart,
        inclusiveEnd: plan.inclusiveEnd,
        sortSatisfiedByIndex: plan.sortSatisfiedByIndex,
        selectorSatisfiedByIndex: plan.selectorSatisfiedByIndex,
        examined: Math.max(examined, returned),
        returned,
        findings: buildFindings({
            selector: params.selector,
            examined: Math.max(examined, returned),
            returned,
            uncoveredFields,
            suggestedIndex,
            declaredButUnused,
            descendingSort,
            sortSatisfiedByIndex: plan.sortSatisfiedByIndex
        }),
        suggestedIndex: suggestedIndex.length > 0 ? suggestedIndex : null,
        declaredButUnused
    };
}

function buildFindings(input: {
    selector: any;
    examined: number;
    returned: number;
    uncoveredFields: string[];
    suggestedIndex: string[];
    declaredButUnused: boolean;
    descendingSort: boolean;
    sortSatisfiedByIndex: boolean;
}): DbViewerExplainFinding[] {
    const findings: DbViewerExplainFinding[] = [];
    const discarded = Math.max(0, input.examined - input.returned);
    const discardShare = input.examined === 0 ? 0 : Math.round((discarded / input.examined) * 100);

    if (JSON.stringify(input.selector).includes('"$regex"')) {
        findings.push({
            level: 'warning',
            title: 'This query cannot use an index',
            detail: '$regex selectors always scan the whole collection (' + input.examined +
                ' documents examined). Prefer a prefix match on an indexed field.'
        });
    }
    if (input.uncoveredFields.length > 0 && discardShare >= 50) {
        const isAre = input.uncoveredFields.length === 1 ? 'is' : 'are';
        findings.push({
            level: 'warning',
            title: input.uncoveredFields.join(', ') + ' ' + isAre + ' not covered by the used index',
            detail: discardShare + '% of examined documents were discarded after the index scan. ' +
                (input.declaredButUnused
                    ? 'The schema already declares ' + JSON.stringify(input.suggestedIndex) +
                    (input.descendingSort
                        ? ', but the descending sort forced the planner to scan the sort index instead. Sort ascending on that index to use it.'
                        : ', but the planner picked the sort index instead. Sorting on a field of that index lets the planner use it.')
                    : 'Add the index ' + JSON.stringify(input.suggestedIndex) +
                    ' to the schema to make this query fully indexed.')
        });
    }
    if (!input.sortSatisfiedByIndex) {
        findings.push({
            level: 'warning',
            title: 'The results are re-sorted in memory',
            detail: input.descendingSort
                ? 'The sort is descending, and most storages only store ascending indexes, so every matching document is loaded and re-sorted before the page is cut. Sorting ascending on an indexed field avoids that.'
                : 'All matching documents are loaded and re-sorted in memory before the page is cut. An index that starts with the sort field avoids that.'
        });
    }
    return findings;
}

/**
 * The planner fills unbounded index fields with the min and max sentinels,
 * which are meaningless to read, so those are reported as an open range.
 */
function describeBound(key: any, side: 'start' | 'end'): string {
    if (side === 'start' && (key === INDEX_MIN || key === '' || key === undefined)) {
        return '';
    }
    if (side === 'end' && (key === INDEX_MAX || key === Number.MAX_SAFE_INTEGER || key === undefined)) {
        return '';
    }
    return JSON.stringify(key);
}

/**
 * RxDB prefixes every declared index with `_deleted` and appends the primary
 * key, so those are stripped before comparing with what a developer would
 * actually write into a schema.
 */
function declaredIndexFields(index: MaybeReadonly<string[]> | string): string[] {
    const fields = (Array.isArray(index) ? index.slice(0) : [index]) as string[];
    return fields[0] === '_deleted' ? fields.slice(1) : fields;
}

export async function buildSchemaReport(
    database: RxDatabase,
    params: { collectionName: string; sampleSize: number; }
): Promise<DbViewerSchemaReport> {
    const collection = database.collections[params.collectionName];
    if (!collection) {
        throw new Error('unknown collection ' + params.collectionName);
    }
    const documents = await collection.find({ selector: {}, limit: params.sampleSize }).exec();
    const rows = documents.map(document => document.toJSON(true) as RxDocumentData<any>);
    const properties: any = collection.schema.jsonSchema.properties ?? {};
    const primaryPath = collection.schema.primaryPath as string;
    const required: string[] = (collection.schema.jsonSchema.required ?? []) as string[];
    const indexedFields = new Set<string>();
    (collection.schema.indexes ?? []).forEach(index => {
        declaredIndexFields(index).forEach(field => indexedFields.add(field));
    });

    const byPath = new Map<string, { seen: Map<string, number>; present: number; }>();
    const ensure = (path: string) => {
        let entry = byPath.get(path);
        if (!entry) {
            entry = { seen: new Map(), present: 0 };
            byPath.set(path, entry);
        }
        return entry;
    };
    Object.keys(properties).filter(name => !name.startsWith('_')).forEach(ensure);

    const violations: { documentId: string; path: string; detail: string; }[] = [];
    rows.forEach(row => {
        Object.keys(row).filter(name => !name.startsWith('_')).forEach(name => {
            const entry = ensure(name);
            const value = (row as any)[name];
            const type = jsonValueType(value);
            entry.present++;
            entry.seen.set(type, (entry.seen.get(type) ?? 0) + 1);
            const declared = properties[name] ? normalizeDeclaredType(properties[name].type) : undefined;
            if (declared && declared !== type && type !== 'missing' && violations.length < 50) {
                violations.push({
                    documentId: String((row as any)[primaryPath]),
                    path: name,
                    detail: 'expected ' + declared + ', got ' + type + ' ' + JSON.stringify(value)
                });
            }
        });
    });

    const fields: DbViewerSchemaFieldReport[] = Array.from(byPath.entries()).map(([path, entry]) => ({
        path,
        declaredType: properties[path] ? (normalizeDeclaredType(properties[path].type) ?? 'any') : 'undeclared',
        seenTypes: Array.from(entry.seen.keys()),
        presentCount: entry.present,
        required: required.includes(path),
        indexed: indexedFields.has(path)
    }));

    return { sampledCount: rows.length, fields, violations };
}

function normalizeDeclaredType(type: any): string | undefined {
    if (Array.isArray(type)) {
        return type.find(entry => entry !== 'null');
    }
    if (type === 'integer') {
        return 'number';
    }
    return type;
}

function jsonValueType(value: any): string {
    if (value === undefined) {
        return 'missing';
    }
    if (value === null) {
        return 'null';
    }
    if (Array.isArray(value)) {
        return 'array';
    }
    const type = typeof value;
    if (type === 'string' || type === 'number' || type === 'boolean') {
        return type;
    }
    return 'object';
}

export async function buildStorageReport(
    database: RxDatabase,
    params: { collectionName: string; }
): Promise<DbViewerStorageReport> {
    const collection = database.collections[params.collectionName];
    if (!collection) {
        throw new Error('unknown collection ' + params.collectionName);
    }
    const documentCount = await collection.count().exec();
    const [tombstoneCount, attachmentBytes] = await Promise.all([
        countTombstones(collection as RxCollection),
        sumAttachmentBytes(collection as RxCollection)
    ]);
    return {
        documentCount,
        tombstoneCount,
        attachmentBytes,
        estimatedBytes: attachmentBytes
    };
}

/**
 * Queries below the RxCollection because RxQuery always filters
 * deleted documents out of its results.
 */
async function countTombstones(collection: RxCollection): Promise<number | null> {
    try {
        const query = normalizeMangoQuery(collection.schema.jsonSchema, {
            selector: { _deleted: { $eq: true } } as any
        });
        const prepared = prepareQuery(collection.schema.jsonSchema, query);
        const result = await collection.storageInstance.count(prepared);
        return result.count;
    } catch (error) {
        return null;
    }
}

async function sumAttachmentBytes(collection: RxCollection): Promise<number> {
    if (!collection.schema.jsonSchema.attachments) {
        return 0;
    }
    const documents = await collection.find().exec();
    return documents.reduce((sum, document) => {
        const attachments = (document.toJSON(true) as any)._attachments ?? {};
        return sum + Object.keys(attachments).reduce(
            (inner, key) => inner + (attachments[key].length ?? 0),
            0
        );
    }, 0);
}

export function hasCleanupPlugin(database: RxDatabase): boolean {
    return Object.keys(database.collections).some(
        name => typeof (database.collections[name] as any).cleanup === 'function'
    );
}
