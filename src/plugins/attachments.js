import IdleQueue from 'custom-idle-queue';
import {
    map
} from 'rxjs/operators/map';


import RxChangeEvent from './../rx-change-event';
import * as util from './../util';
import RxError from '../rx-error';


/**
 * to not have update-conflicts,
 * we use atomic inserts (per document) on putAttachment()
 * @type {WeakMap}
 */
const ATTACHMENT_ATOMIC_QUEUES = new WeakMap();


function ensureSchemaSupportsAttachments(doc) {
    const schemaJson = doc.collection.schema.jsonID;
    if (!schemaJson.attachments) {
        throw RxError.newRxError('AT1', {
            link: 'https://pubkey.github.io/rxdb/rx-attachment.html'
        });
    }
}

async function resyncRxDocument(doc) {
    const docData = await doc.collection.pouch.get(doc.primary);
    const data = doc.collection._handleFromPouch(docData);
    const changeEvent = RxChangeEvent.create(
        'UPDATE',
        doc.collection.database,
        doc.collection,
        doc,
        data
    );
    doc.$emit(changeEvent);
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
        try {
            // for browsers
            blobBuffer = new Blob([data], {
                type
            });
        } catch (e) {
            // for node
            blobBuffer = new Buffer(data, {
                type
            });
        }
        return blobBuffer;
    },
    toString(blobBuffer) {
        if (blobBuffer instanceof Buffer) {
            // node
            return util.nextTick()
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


const _assignMethodsToAttachment = function(attachment) {
    Object.entries(attachment.doc.collection._attachments).forEach(entry => {
        const funName = entry[0];
        const fun = entry[1];
        attachment.__defineGetter__(funName, () => fun.bind(attachment));
    });
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

    async remove() {
        await this.doc.collection.pouch.removeAttachment(
            this.doc.primary,
            this.id,
            this.doc._data._rev
        );

        await resyncRxDocument(this.doc);
    }

    /**
     * returns the data for the attachment
     * @return {Promise<Buffer|Blob>}
     */
    async getData() {
        let data = await this.doc.collection.pouch.getAttachment(this.doc.primary, this.id);

        if (shouldEncrypt(this.doc)) {
            const dataString = await blobBufferUtil.toString(data);
            data = blobBufferUtil.createBlobBuffer(
                this.doc.collection._crypter._decryptValue(dataString),
                this.type
            );
        }

        return data;
    }

    async getStringData() {
        const bufferBlob = await this.getData();
        return await blobBufferUtil.toString(bufferBlob);
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

export function getAtomicQueueOfDocument(doc) {
    if (!ATTACHMENT_ATOMIC_QUEUES.has(doc))
        ATTACHMENT_ATOMIC_QUEUES.set(doc, new IdleQueue());
    return ATTACHMENT_ATOMIC_QUEUES.get(doc);
};

function shouldEncrypt(doc) {
    return !!doc.collection.schema.jsonID.attachments.encrypted;
}

export async function putAttachment({
    id,
    data,
    type = 'text/plain'
}) {
    ensureSchemaSupportsAttachments(this);
    const queue = getAtomicQueueOfDocument(this);

    if (shouldEncrypt(this))
        data = this.collection._crypter._encryptValue(data);

    const blobBuffer = blobBufferUtil.createBlobBuffer(data, type);

    await queue.requestIdlePromise();
    const ret = await queue.wrapCall(
        async () => {
            await this.collection.pouch.putAttachment(
                this.primary,
                id,
                this._data._rev,
                blobBuffer,
                type
            );
            // because putAttachment() does not return all data, we have to re-grep the attachments meta-info
            const docData = await this.collection.pouch.get(this.primary);
            const attachmentData = docData._attachments[id];
            const attachment = RxAttachment.fromPouchDocument(
                id,
                attachmentData,
                this
            );

            this._data._rev = docData._rev;
            this._data._attachments = docData._attachments;

            await resyncRxDocument(this);

            return attachment;
        }
    );
    return ret;
};

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
};

/**
 * returns all attachments of the document
 * @return {RxAttachment[]}
 */
export function allAttachments() {
    ensureSchemaSupportsAttachments(this);
    const docData = this._dataSync$.getValue();
    return Object.keys(docData._attachments)
        .map(id => {
            return RxAttachment.fromPouchDocument(
                id,
                docData._attachments[id],
                this
            );
        });
};

export async function preMigrateDocument(action) {
    delete action.migrated._attachments;
    return action;
}

export async function postMigrateDocument(action) {
    const primaryPath = action.oldCollection.schema.primaryPath;

    const attachments = action.doc._attachments;
    if (!attachments) return action;

    for (const id in attachments) {
        const stubData = attachments[id];
        const primary = action.doc[primaryPath];
        let data = await action.oldCollection.pouchdb.getAttachment(primary, id);
        data = await blobBufferUtil.toString(data);

        const res = await action.newestCollection.pouch.putAttachment(
            primary,
            id,
            action.res.rev,
            blobBufferUtil.createBlobBuffer(data, stubData.content_type),
            stubData.content_type
        );
        action.res = res;
    }
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
                                .map(entry => {
                                    const id = entry[0];
                                    const attachmentData = entry[1];
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
