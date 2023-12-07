import type { Func } from 'mocha';
import assert from 'assert';
import { RxCollection, RxDocumentData, deepEqual, requestIdlePromise } from '../../plugins/core/index.mjs';
import { RxReplicationState } from '../../plugins/replication/index.mjs';

export function testMultipleTimes(times: number, title: string, test: Func) {
    new Array(times).fill(0).forEach(() => {
        it(title, test);
    });
}

export async function ensureCollectionsHaveEqualState<RxDocType>(
    c1: RxCollection<RxDocType>,
    c2: RxCollection<RxDocType>
) {
    await requestIdlePromise();
    const getJson = async (collection: RxCollection<RxDocType>) => {
        const docs = await collection.find().exec();
        return docs.map(d => d.toJSON());
    };
    const json1 = await getJson(c1);
    const json2 = await getJson(c2);
    try {
        assert.deepStrictEqual(
            json1,
            json2
        );
    } catch (err) {
        console.error('ensureCollectionsHaveEqualState() states not equal:');
        console.dir({
            [c1.name]: json1,
            [c2.name]: json2
        });
        throw err;
    }
}

export function ensureReplicationHasNoErrors(replicationState: RxReplicationState<any, any>) {
    /**
     * We do not have to unsubscribe because the observable will cancel anyway.
     */
    replicationState.error$.subscribe(err => {
        console.error('ensureReplicationHasNoErrors() has error:');
        console.log(err);
        if (err?.parameters?.errors) {
            throw err.parameters.errors[0];
        }
        throw err;
    });
}

/**
 * Ensure equal document states by ignoring the _meta value.
 * This helps in tests with storage implementations
 * that add additional _meta fields.
 */
export function assertEqualDocumentData<RxDocType>(
    doc1: RxDocumentData<RxDocType>,
    doc2: RxDocumentData<RxDocType>
) {
    const withoutMeta1 = Object.assign({}, doc1, { _meta: {} });
    const withoutMeta2 = Object.assign({}, doc2, { _meta: {} });
    if (!deepEqual(withoutMeta1, withoutMeta2)) {
        console.dir({
            withoutMeta1,
            withoutMeta2
        });
        throw new Error('assertEqualDocumentData(): Not Equal');
    }
}
