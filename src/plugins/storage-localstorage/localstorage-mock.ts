import { storageEventStream$ } from './rx-storage-instance-localstorage.ts';

/**
 * This mocks the localstorage API
 * so we can run tests in node.js
 */
let storage: any = {};
export function getLocalStorageMock(): typeof localStorage {
    return {
        setItem: function (key: string, value: string) {
            storage[key] = value || '';
            storageEventStream$.next({
                fromStorageEvent: false,
                key,
                newValue: value
            });
        },
        getItem: function (key: string) {
            return key in storage ? storage[key] : null;
        },
        removeItem: function (key: string) {
            delete storage[key];
        },
        get length() {
            return Object.keys(storage).length;
        },
        key: function (i: number) {
            const keys = Object.keys(storage);
            return keys[i] || null;
        }
    } as any;
}
