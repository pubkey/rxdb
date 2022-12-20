/**
 * For the ORM capabilities,
 * we have to merge the document prototype
 * with the ORM functions and the data
 * We do this iterating over the properties and
 * adding them to a new object.
 * In the future we should do this by chaining the __proto__ objects
 */

import type {
    RxCollection,
    RxDocument,
    RxDocumentData
} from './types';
import {
    createRxDocumentConstructor,
    basePrototype,
    createWithConstructor as createRxDocumentWithConstructor
} from './rx-document';
import {
    runPluginHooks
} from './hooks';
import { overwritable } from './overwritable';

// caches
const protoForCollection: WeakMap<RxCollection, any> = new WeakMap();
const constructorForCollection: WeakMap<RxCollection, any> = new WeakMap();

export function getDocumentPrototype(
    rxCollection: RxCollection
): any {
    if (!protoForCollection.has(rxCollection)) {
        const schemaProto = rxCollection.schema.getDocumentPrototype();
        const ormProto = getDocumentOrmPrototype(rxCollection);
        const baseProto = basePrototype;
        const proto = {};
        [
            schemaProto,
            ormProto,
            baseProto
        ].forEach(obj => {
            const props = Object.getOwnPropertyNames(obj);
            props.forEach(key => {
                const desc: any = Object.getOwnPropertyDescriptor(obj, key);


                /**
                 * When enumerable is true, it will show on console.dir(instance)
                 * To not pollute the output, only getters and methods are enumerable
                 */
                let enumerable = true;
                if (
                    key.startsWith('_') ||
                    key.endsWith('_') ||
                    key.startsWith('$') ||
                    key.endsWith('$')
                ) enumerable = false;

                if (typeof desc.value === 'function') {
                    // when getting a function, we automatically do a .bind(this)
                    Object.defineProperty(proto, key, {
                        get() {
                            return desc.value.bind(this);
                        },
                        enumerable,
                        configurable: false
                    });

                } else {
                    desc.enumerable = enumerable;
                    desc.configurable = false;
                    if (desc.writable)
                        desc.writable = false;
                    Object.defineProperty(proto, key, desc);
                }
            });
        });
        protoForCollection.set(rxCollection, proto);

    }
    return protoForCollection.get(rxCollection);
}

export function getRxDocumentConstructor(
    rxCollection: RxCollection
) {
    if (!constructorForCollection.has(rxCollection)) {
        const ret = createRxDocumentConstructor(
            getDocumentPrototype(rxCollection)
        );
        constructorForCollection.set(rxCollection, ret);
    }
    return constructorForCollection.get(rxCollection);
}

/**
 * Create a RxDocument-instance from the jsonData
 * and the prototype merge.
 * If the document already exists in the _docCache,
 * return that instead to ensure we have no duplicates.
 */
export function createRxDocument<RxDocType, ORM>(
    rxCollection: RxCollection<RxDocType, ORM>,
    docData: RxDocumentData<RxDocType>
): RxDocument<RxDocType, ORM> {
    const doc = createRxDocumentWithConstructor(
        getRxDocumentConstructor(rxCollection as any),
        rxCollection as any,
        overwritable.deepFreezeWhenDevMode(docData as any)
    );
    rxCollection._runHooksSync('post', 'create', docData, doc);
    runPluginHooks('postCreateRxDocument', doc);
    return doc as any;
}

/**
 * create RxDocument from the docs-array
 */
export function createRxDocuments<DT, OM>(
    rxCollection: RxCollection,
    docsJSON: any[]
): RxDocument<DT, OM>[] {
    return docsJSON.map(
        json => createRxDocument<DT, OM>(rxCollection as any, json)
    );
}

/**
 * returns the prototype-object
 * that contains the orm-methods,
 * used in the proto-merge
 */
export function getDocumentOrmPrototype(rxCollection: RxCollection): any {
    const proto: any = {};
    Object
        .entries(rxCollection.methods)
        .forEach(([k, v]) => {
            proto[k] = v;
        });
    return proto;
}
