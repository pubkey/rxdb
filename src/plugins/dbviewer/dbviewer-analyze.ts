import type {
    RxCollection,
    RxDatabase
} from '../../index.d.ts';
import {
    normalizeMangoQuery,
    prepareQuery
} from '../../rx-query-helper.ts';
import {
    INDEX_MAX,
    INDEX_MIN
} from '../../query-planner.ts';
import type {
    ViewerExplainResult,
    ViewerStorageStats,
    ViewerStorageStatsRow
} from './dbviewer-types.ts';

const STORAGE_SCAN_LIMIT = 5000;

function collectSelectorFields(selector: any, target: Set<string>) {
    Object.entries(selector || {}).forEach(([key, value]) => {
        if (key === '$and' || key === '$or' || key === '$nor') {
            if (Array.isArray(value)) {
                value.forEach(sub => collectSelectorFields(sub, target));
            }
            return;
        }
        if (!key.startsWith('$')) {
            target.add(key);
        }
    });
}

function selectorHasRegex(selector: any): boolean {
    if (selector === null || typeof selector !== 'object') {
        return false;
    }
    return Object.entries(selector).some(([key, value]) => {
        if (key === '$regex') {
            return true;
        }
        return selectorHasRegex(value);
    });
}

async function countIndexBounds(storageInstance: any, queryPlan: any): Promise<number | null> {
    try {
        const boundsSelector: any = {};
        queryPlan.index.forEach((field: string, index: number) => {
            if (field === '_deleted') {
                return;
            }
            const start = queryPlan.startKeys[index];
            const end = queryPlan.endKeys[index];
            const condition: any = {};
            if (start === end && start !== INDEX_MIN && start !== INDEX_MAX) {
                boundsSelector[field] = { $eq: start };
                return;
            }
            if (start !== INDEX_MIN && typeof start !== 'undefined') {
                condition.$gte = start;
            }
            if (end !== INDEX_MAX && typeof end !== 'undefined') {
                condition.$lte = end;
            }
            if (Object.keys(condition).length > 0) {
                boundsSelector[field] = condition;
            }
        });
        const normalized = normalizeMangoQuery(storageInstance.schema, { selector: boundsSelector });
        const prepared = prepareQuery(storageInstance.schema, normalized as any);
        const result = await storageInstance.count(prepared);
        return typeof result.count === 'number' ? result.count : null;
    } catch (err) {
        return null;
    }
}

/**
 * Explains a selector against a collection with the query planner.
 * Runs on the host side because the viewer page has no access
 * to the rxdb internals, the result is a serializable summary.
 */
export async function explainViewerQuery(
    database: RxDatabase,
    collectionName: string,
    selector: any
): Promise<ViewerExplainResult> {
    const collection = (database.collections as any)[collectionName] as RxCollection<any>;
    const hasRegex = selectorHasRegex(selector);
    const selectorFields = new Set<string>();
    collectSelectorFields(selector, selectorFields);
    const result: ViewerExplainResult = {
        index: null,
        bounds: [],
        selectorSatisfiedByIndex: false,
        sortSatisfiedByIndex: false,
        unindexedFields: [],
        hasRegex,
        examined: null
    };
    if (!collection) {
        return result;
    }
    const storageInstance = (collection as any).storageInstance;
    let queryPlan: any = null;
    try {
        const normalized = normalizeMangoQuery(storageInstance.schema, { selector });
        const prepared = prepareQuery(storageInstance.schema, normalized as any);
        queryPlan = (prepared as any).queryPlan;
    } catch (err) {
        return result;
    }
    result.index = queryPlan.index;
    result.selectorSatisfiedByIndex = !!queryPlan.selectorSatisfiedByIndex;
    result.sortSatisfiedByIndex = !!queryPlan.sortSatisfiedByIndex;
    result.unindexedFields = Array.from(selectorFields).filter(field => !queryPlan.index.includes(field));
    result.bounds = queryPlan.index
        .map((field: string, index: number) => {
            const start = queryPlan.startKeys[index];
            const end = queryPlan.endKeys[index];
            if (start === INDEX_MIN && end === INDEX_MAX) {
                return null;
            }
            if (start === end) {
                return field + ' = ' + JSON.stringify(start);
            }
            return field + ' in [' + JSON.stringify(start) + ' … ' + JSON.stringify(end) + ']';
        })
        .filter((entry: string | null) => entry !== null) as string[];
    if (queryPlan.selectorSatisfiedByIndex) {
        try {
            result.examined = await collection.count({ selector }).exec();
        } catch (err) {
            result.examined = null;
        }
    } else {
        result.examined = await countIndexBounds(storageInstance, queryPlan);
    }
    return result;
}

/**
 * Per-collection document counts, tombstones and attachment
 * bytes, read through the storage instances on the host side.
 */
export async function collectViewerStorageStats(database: RxDatabase): Promise<ViewerStorageStats> {
    const collections = Object.entries(database.collections)
        .filter(([name]) => !name.startsWith('_'));
    const rows: ViewerStorageStatsRow[] = await Promise.all(collections.map(async ([name, untypedCollection]) => {
        const collection = untypedCollection as RxCollection<any>;
        const row: ViewerStorageStatsRow = {
            name,
            documents: null,
            tombstones: null,
            attachmentBytes: 0,
            attachmentCount: 0
        };
        try {
            row.documents = await collection.count().exec();
        } catch (err) {
            row.documents = null;
        }
        const storageInstance = (collection as any).storageInstance;
        try {
            const normalized = normalizeMangoQuery(storageInstance.schema, {
                selector: { _deleted: { $eq: true } } as any
            });
            const prepared = prepareQuery(storageInstance.schema, normalized as any);
            const countResult = await storageInstance.count(prepared);
            row.tombstones = typeof countResult.count === 'number' ? countResult.count : null;
        } catch (err) {
            row.tombstones = null;
        }
        if (collection.schema.jsonSchema.attachments) {
            try {
                const normalized = normalizeMangoQuery(storageInstance.schema, { selector: {} });
                (normalized as any).limit = STORAGE_SCAN_LIMIT;
                const prepared = prepareQuery(storageInstance.schema, normalized as any);
                const queryResult = await storageInstance.query(prepared);
                queryResult.documents.forEach((doc: any) => {
                    Object.values(doc._attachments || {}).forEach((attachment: any) => {
                        row.attachmentBytes = row.attachmentBytes + (attachment.length || 0);
                        row.attachmentCount = row.attachmentCount + 1;
                    });
                });
            } catch (err) {
                // attachment sizes stay at 0 when the storage cannot be scanned
            }
        }
        return row;
    }));
    const cleanupSupported = collections.some(([, collection]) => typeof (collection as any).cleanup === 'function');
    return {
        rows,
        cleanupSupported
    };
}

/**
 * Runs the cleanup of every collection. Without the cleanup
 * plugin the method stub throws synchronously, which surfaces
 * as a normal rejected promise here.
 */
export async function runViewerCleanup(database: RxDatabase): Promise<void> {
    const collections = Object.entries(database.collections)
        .filter(([name]) => !name.startsWith('_'));
    await Promise.all(
        collections.map(([, collection]) =>
            typeof (collection as any).cleanup === 'function'
                ? (collection as any).cleanup(0)
                : Promise.resolve()
        )
    );
}
