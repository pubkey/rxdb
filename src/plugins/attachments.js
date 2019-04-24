import {
    map
} from 'rxjs/operators';


import {
    createChangeEvent
} from './../rx-change-event';
import {
    nextTick,
    isElectronRenderer
} from './../util';
import {
    newRxError
} from '../rx-error';

function ensureSchemaSupportsAttachments(doc) {
    const schemaJson = doc.collection.schema.jsonID;
    if (!schemaJson.attachments) {
        throw newRxError('AT1', {
            link: 'https://pubkey.github.io/rxdb/rx-attachment.html'
        });
    }
}

function resyncRxDocument(doc) {
    return doc.collection.pouch.get(doc.primary).then(docData => {
        const data = doc.collection._handleFromPouch(docData);
        const changeEvent = createChangeEvent(
            'UPDATE',
            doc.collection.database,
            doc.collection,
            doc,
            data
        );
        doc.$emit(changeEvent);
    });
}


export const blobBufferUtil = {
    /**
     * depending if we are on node or browser,
     * we have to use Buffer(node) or Blob(browser)
     * @param  {string} data
     * @param  {string} type
     * @return {Blob|Buffer}
     */
    createBlobBuffer(data, type) {
        let blobBuffer;

        if (isElectronRenderer) {
            // if we are inside of electron-renderer, always use the node-buffer
            return Buffer.from(data, {
                type
            });
        }

        try {
            // for browsers
            blobBuffer = new Blob([data], {
                type
            });
        } catch (e) {
            // for node
            blobBuffer = Buffer.from(data, {
                type
            });
        }
        return blobBuffer;
    },
    toString(blobBuffer) {
        if (blobBuffer instanceof Buffer) {
            // node
            return nextTick()
                .then(() => blobBuffer.toString());
        }
        return new Promise(res => {
            // browsers
            const reader = new FileReader();
            reader.addEventListener('loadend', e => {
                const text = e.target.result;
                res(text);
            });
            reader.readAsText(blobBuffer);
        });
    }
};


const _assignMethodsToAttachment = function (attachment) {
    Object
        .entries(attachment.doc.collection._attachments)
        .forEach(([funName, fun]) => attachment.__defineGetter__(funName, () => fun.bind(attachment)));
};

/**
 * an RxAttachment is basically just the attachment-stub
 * wrapped so that you can access the attachment-data
 */
export class RxAttachment {
    constructor({
        doc,
        id,
        type,
        length,
        digest,
        rev
    }) {
        this.doc = doc;
        this.id = id;
        this.type = type;
        this.length = length;
        this.digest = digest;
        this.rev = rev;

        _assignMethodsToAttachment(this);
    }

    /**
     * @return {Promise}
     */
    remove() {
        return this.doc.collection.pouch.removeAttachment(
            this.doc.primary,
            this.id,
            this.doc._data._rev
        ).then(() => resyncRxDocument(this.doc));
    }

    /**
     * returns the data for the attachment
     * @return {Promise<Buffer|Blob>}
     */
    getData() {
        return this.doc.collection.pouch.getAttachment(this.doc.primary, this.id)
            .then(data => {
                if (shouldEncrypt(this.doc)) {
                    return blobBufferUtil.toString(data)
                        .then(dataString => blobBufferUtil.createBlobBuffer(
                            this.doc.collection._crypter._decryptValue(dataString),
                            this.type
                        ));
                } else return data;
            });
    }

    getStringData() {
        return this.getData().then(bufferBlob => blobBufferUtil.toString(bufferBlob));
    }
}

RxAttachment.fromPouchDocument = (id, pouchDocAttachment, rxDocument) => {
    return new RxAttachment({
        doc: rxDocument,
        id,
        type: pouchDocAttachment.content_type,
        length: pouchDocAttachment.length,
        digest: pouchDocAttachment.digest,
        rev: pouchDocAttachment.revpos
    });
};

function shouldEncrypt(doc) {
    return !!doc.collection.schema.jsonID.attachments.encrypted;
}

/**
 * @return {Promise}
 */
export function putAttachment({
    id,
    data,
    type = 'text/plain'
}) {
    ensureSchemaSupportsAttachments(this);

    if (shouldEncrypt(this))
        data = this.collection._crypter._encryptValue(data);

    const blobBuffer = blobBufferUtil.createBlobBuffer(data, type);

    this._atomicQueue = this._atomicQueue
        .then(() => this.collection.pouch.putAttachment(
            this.primary,
            id,
            this._data._rev,
            blobBuffer,
            type
        ))
        .then(() => this.collection.pouch.get(this.primary))
        .then(docData => {
            const attachmentData = docData._attachments[id];
            const attachment = RxAttachment.fromPouchDocument(
                id,
                attachmentData,
                this
            );

            this._data._rev = docData._rev;
            this._data._attachments = docData._attachments;
            return resyncRxDocument(this)
                .then(() => attachment);
        });
    return this._atomicQueue;
}

/**
 * get an attachment of the document by its id
 * @param  {string} id
 * @return {RxAttachment}
 */
export function getAttachment(id) {
    ensureSchemaSupportsAttachments(this);
    const docData = this._dataSync$.getValue();
    if (!docData._attachments || !docData._attachments[id])
        return null;

    const attachmentData = docData._attachments[id];
    const attachment = RxAttachment.fromPouchDocument(
        id,
        attachmentData,
        this
    );
    return attachment;
}

/**
 * returns all attachments of the document
 * @return {RxAttachment[]}
 */
export function allAttachments() {
    ensureSchemaSupportsAttachments(this);
    const docData = this._dataSync$.getValue();

    // if there are no attachments, the field is missing
    if (!docData._attachments) return [];

    return Object.keys(docData._attachments)
        .map(id => {
            return RxAttachment.fromPouchDocument(
                id,
                docData._attachments[id],
                this
            );
        });
}

export function preMigrateDocument(action) {
    delete action.migrated._attachments;
    return action;
}

/**
 * @return {Promise}
 */
export function postMigrateDocument(action) {
    const primaryPath = action.oldCollection.schema.primaryPath;

    const attachments = action.doc._attachments;
    if (!attachments) return Promise.resolve(action);

    let currentPromise = Promise.resolve();
    for (const id in attachments) {
        const stubData = attachments[id];
        const primary = action.doc[primaryPath];
        currentPromise = currentPromise
            .then(() => action.oldCollection.pouchdb.getAttachment(primary, id))
            .then(data => blobBufferUtil.toString(data))
            .then(data => action.newestCollection.pouch.putAttachment(
                primary,
                id,
                action.res.rev,
                blobBufferUtil.createBlobBuffer(data, stubData.content_type),
                stubData.content_type
            ))
            .then(res => action.res = res);
    }

    return currentPromise;
}

export const rxdb = true;
export const prototypes = {
    RxDocument: proto => {
        proto.putAttachment = putAttachment;
        proto.getAttachment = getAttachment;
        proto.allAttachments = allAttachments;
        Object.defineProperty(proto, 'allAttachments$', {
            get: function allAttachments$() {
                return this._dataSync$
                    .pipe(
                        map(data => {
                            if (!data._attachments)
                                return {};
                            return data._attachments;
                        }),
                        map(attachmentsData => Object.entries(attachmentsData)),
                        map(entries => {
                            return entries
                                .map(([id, attachmentData]) => {
                                    return RxAttachment.fromPouchDocument(
                                        id,
                                        attachmentData,
                                        this
                                    );
                                });
                        })
                    );
            }
        });
    }
};
export const overwritable = {};
export const hooks = {
    preMigrateDocument,
    postMigrateDocument
};

export default {
    rxdb,
    prototypes,
    overwritable,
    hooks,
    blobBufferUtil
};
