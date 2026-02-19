import type { Func } from 'mocha';
import assert from 'assert';
import type { RxCollection } from '../../types';
import { promiseWait, requestIdlePromise } from '../utils/index.ts';
import type { RxReplicationState } from '../replication/index.ts';

export function testMultipleTimes(times: number, title: string, test: Func) {
    new Array(times).fill(0).forEach(() => {
        it(title, test);
    });
}

export async function ensureCollectionsHaveEqualState<RxDocType>(
    c1: RxCollection<RxDocType>,
    c2: RxCollection<RxDocType>,
    logContext?: string
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
        console.error('ensureCollectionsHaveEqualState(' + logContext + ') states not equal (c1:' + c1.name + ', c2:' + c2.name + '):');
        console.dir({
            c1: json1,
            c2: json2
        });
        console.log('----------');
        throw err;
    }
}

/**
 * Waits until the collections have the equal state.
 */
export async function awaitCollectionsHaveEqualState<RxDocType>(
    c1: RxCollection<RxDocType>,
    c2: RxCollection<RxDocType>,
    logContext?: string,
    timeout = 8000
) {
    let i = 0;
    const startTime = Date.now();
    while (true) {
        i++;
        try {
            await ensureCollectionsHaveEqualState(
                c1,
                c2,
                logContext
            );
            return;
        } catch (err) {
            if ((Date.now() - startTime) > timeout) {
                throw err;
            } else {
                await promiseWait(50 * i);
            }
        }
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
