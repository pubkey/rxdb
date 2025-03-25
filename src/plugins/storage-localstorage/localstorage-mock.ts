/**
 * This mocks the localstorage API
 * so we can run tests in node.js
 */
export function getLocalStorageMock(): typeof localStorage {
    let storage: any = {};
    return {
        setItem: function (key: string, value: string) {
            storage[key] = value || '';
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
