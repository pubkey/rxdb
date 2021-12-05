/*
import type { RxStorage } from '../../types';
import { expose } from 'threads/worker';

export function wrappedRxStorage<T, D>(
    rxStorage: RxStorage<T, D>
) {
    let nextId = 0;
    const instanceById: Map<number, any> = new Map();

    expose({
        hash(data) {
            return rxStorage.hash(data);
        },
        async createStorageInstance(params) {
            const instanceId = nextId++;
            const instance = await rxStorage.createStorageInstance(params);
            instanceById.set(instanceId, instance);
            return instanceId;
        },
        async createKeyObjectStorageInstance(params) {
            const instanceId = nextId++;
            const instance = await rxStorage.createKeyObjectStorageInstance(params);
            instanceById.set(instanceId, instance);
            return instanceId;
        }
    })



}

*/
