/**
 * This plugin adds RxCollection.inMemory()
 * Which replicates the collection into an in-memory-collection
 * So you can do faster queries and also query over encrypted fields
 */

import RxCollection from '../rx-collection';
import Core from '../core';
import * as util from '../util';
import Crypter from '../crypter';
import ChangeEventBuffer from '../change-event-buffer';
import RxSchema from '../rx-schema';
import PouchDB from '../pouch-db';

import clone from 'clone';
import PouchAdapterMemory from 'pouchdb-adapter-memory';
import PouchPluginTransform from 'transform-pouch';
import ReplicationStream from 'pouchdb-replication-stream';
import MemoryStream from 'memorystream';

const collectionCacheMap = new WeakMap();
const collectionPromiseCacheMap = new WeakMap();

export class InMemoryRxCollection extends RxCollection.RxCollection {
    constructor(parentCollection, pouchSettings) {
        //constructor(database, name, schema, pouchSettings, migrationStrategies, methods) {
        super(
            parentCollection.database,
            parentCollection.name,
            toCleanSchema(parentCollection.schema),
            pouchSettings, // pouchSettings
            {},
            parentCollection._methods);
        this._parentCollection = parentCollection;
    }

    async prepare() {
        this._crypter = Crypter.create(this.database.password, this.schema);

        this.pouch = new PouchDB(
            'rxdb-in-memory-' + util.randomCouchString(10),
            util.adapterObject('memory'), {}
        );

        this._observable$ = new util.Rx.Subject();
        this._changeEventBuffer = ChangeEventBuffer.create(this);

        // INDEXES
        await Promise.all(
            this.schema.indexes
            .map(indexAr => {
                return this.pouch.createIndex({
                    index: {
                        fields: indexAr
                    }
                });
            })
        );

        this._subs.push(
            this._observable$.subscribe(cE => {
                // when data changes, send it to RxDocument in docCache
                const doc = this._docCache.get(cE.data.doc);
                if (doc) doc._handleChangeEvent(cE);
            })
        );

        // add transformator
        /*        this.pouch.transform({
                    incoming: doc => {
                        console.log('incoming');
                        console.dir(doc);
                        // do something to the document before storage
                        return doc;
                    },
                    outgoing: doc => {
                        console.log('outgoins');
                        console.dir(doc);
                        // do something to the document after retrieval
                        return doc;
                    }
                });*/

        // initial sync


        const stream = new MemoryStream();
        const transformedStream = new MemoryStream();


        let firstDone = false;
        stream.on('data', chunk => {
            if (!firstDone && false) {
                firstDone = true;
                transformedStream.write(chunk);
                return;
            }
            const docsData = JSON.parse(chunk.toString());

            if (docsData.docs) {
                docsData.docs = docsData.docs
                    .filter(doc => !doc.language) // do not replicate design-docs
                    .map(doc => this._parentCollection._handleFromPouch(doc));
            }

            /*            console.log('data:');
                        console.dir(docsData);
                        console.log('as string:');
                        console.dir(chunk.toString());
            */
            const outString = JSON.stringify(docsData) + '\n';
            console.log('outString:');
            console.dir(outString);

            transformedStream.write(outString);
        });
        stream.on('end', function() {
            // outputs 'Hello World!'
            console.log('ended!');
            transformedStream.end();
        });


        await Promise.all([
            this._parentCollection.pouch.dump(stream),
            this.pouch.load(transformedStream)
        ]);
        console.log('inital sync complete!');

        /*        const initialReplicationState = this._parentCollection.sync({
                    remote: this.pouch,
                    waitForLeadership: false,
                    direction: {
                        pull: false,
                        push: true
                    },
                    options: {
                        live: false,
                        retry: false
                    },
                     // we use a default-query so we do not sync _design-documents
                    query: this._parentCollection.find()
                });*/
        /*        await initialReplicationState
                    .complete$
                    .filter(ev => ev.ok === true)
                    .first()
                    .toPromise();*/
    }
};

function toCleanSchema(rxSchema) {
    const newSchemaJson = clone(rxSchema.jsonID);
    newSchemaJson.disableKeyCompression = true;
    delete newSchemaJson.properties._id;
    delete newSchemaJson.properties._rev;
    delete newSchemaJson.properties._attachments;

    const removeEncryption = (schema) => {
        delete schema.encrypted;
        Object.values(schema)
            .filter(val => typeof val === 'object')
            .forEach(val => removeEncryption(val));
    };
    removeEncryption(newSchemaJson);

    return RxSchema.create(newSchemaJson);
}


let INIT_DONE = false;
/**
 * called in the proto of RxCollection
 * @return {Promise<RxCollection>}
 */
export async function spawnInMemory() {
    if (!INIT_DONE) {
        INIT_DONE = true;
        // ensure memory-adapter is added
        Core.plugin(PouchAdapterMemory);
        Core.plugin(PouchPluginTransform);
        Core.plugin(ReplicationStream.plugin);
        PouchDB.adapter('writableStream', ReplicationStream.adapters.writableStream);
    }

    if (collectionCacheMap.has(this)) {
        // already exists for this collection -> wait until synced
        await collectionPromiseCacheMap.get(this);
        return collectionCacheMap.get(this);
    }

    const col = new InMemoryRxCollection(this);
    const preparePromise = col.prepare();
    collectionCacheMap.set(this, col);
    collectionPromiseCacheMap.set(this, preparePromise);

    await preparePromise;
    return col;
};


export const rxdb = true;
export const prototypes = {
    RxCollection: proto => {
        proto.inMemory = spawnInMemory;
    }
};
export const overwritable = {};

export default {
    rxdb,
    prototypes,
    overwritable,
    spawnInMemory
};
