import type {
    Instance as SimplePeerInstance
} from 'simple-peer';
import _Peer from 'simple-peer';
import {
    ensureProcessNextTickIsSet,
    SimplePeerConfig,
    SimplePeerWrtc
} from '../replication-webrtc/connection-handler-simple-peer';
import {
    ensureNotFalsy,
    getFromMapOrCreate,
    lastOfArray,
    now,
    PROMISE_RESOLVE_VOID,
    promiseWait,
    promiseWaitSkippable,
    randomToken
} from '../utils/index.ts';
import { DriveStructure } from './init.ts';
import {
    DriveFileMetadata,
    GoogleDriveOptionsWithDefaults
} from './google-drive-types.ts';
import {
    deleteFile,
    insertMultipartFile,
    readJsonFileContent
} from './google-drive-helper.ts';
import { Subject } from 'rxjs';
import { newRxFetchError } from '../../rx-error.ts';


export type SignalingOptions = {
    wrtc?: SimplePeerWrtc;
    config?: SimplePeerConfig;
};

/**
 * Timings on when to call the google drive
 * api to check for new messages.
 */
const BACKOFF_STEPS = [
    50,
    50,
    100,
    100,
    200,
    400,
    600,
    1_000,
    2_000,
    4_000,
    8_000,
    15_000,
    30_000,
    60_000,
    120_000
];
const MAX_BACKOFF_STEP_ID = BACKOFF_STEPS.length - 1;


export type SIGNAL = 'RESYNC' | 'NEW_PEER';

export class SignalingState {
    public readonly sessionId = randomToken(12);
    public readonly processedMessageIds = new Set<string>();

    /**
     * Emits whenever a new connection
     * is there or some connection
     * told us to RESYNC
     */
    private _resync$ = new Subject<void>();
    public resync$ = this._resync$.asObservable();

    public peerBySenderId = new Map<string, SimplePeerInstance>();

    private processQueue: Promise<any> = PROMISE_RESOLVE_VOID;
    private backoffStepId = 0;
    private skipBackoffTime?: () => void;


    public closed = false;
    public resetReaderFn = () => {
        this.resetReadLoop();
    };

    constructor(
        private googleDriveOptions: GoogleDriveOptionsWithDefaults,
        private init: DriveStructure,
        private signalingOptions: SignalingOptions
    ) {
        ensureProcessNextTickIsSet();
        cleanupOldSignalingMessages(
            this.googleDriveOptions,
            this.init.signalingFolderId
        ).catch(() => { });

        // Send "i exist" message
        this.sendMessage({ i: 'exist' });
        this.processNewMessages();

        if (typeof window !== 'undefined') {
            window.addEventListener('online', this.resetReaderFn);
            document.addEventListener('visibilitychange', this.resetReaderFn);

        }

        // start processing loop
        (async () => {
            while (!this.closed) {
                const time = BACKOFF_STEPS[this.backoffStepId];
                await this.processNewMessages();
                const skippable = promiseWaitSkippable(time);
                this.skipBackoffTime = skippable.skip;
                await skippable.promise;
                this.backoffStepId = this.backoffStepId + 1;
                if (this.backoffStepId > MAX_BACKOFF_STEP_ID) {
                    this.backoffStepId = MAX_BACKOFF_STEP_ID;
                }
            }
        })();
    }

    async sendMessage(data: any) {
        const messageId = randomToken(12);
        const fileName = [
            this.sessionId,
            now(),
            messageId
        ].join('_') + '.json';

        // add here so we skip these
        this.processedMessageIds.add(messageId);

        await insertMultipartFile(
            this.googleDriveOptions,
            this.init.signalingFolderId,
            fileName,
            data
        );
    }

    async pingPeers(message: SIGNAL) {
        Array.from(this.peerBySenderId.values()).forEach(peer => {
            peer.send(message);
        });
    }


    async resetReadLoop() {
        await this.processNewMessages();
        this.backoffStepId = 0;
        if (this.skipBackoffTime) {
            this.skipBackoffTime();
        }
    }

    async processNewMessages() {
        this.processQueue = this.processQueue.then(
            () => this._processNewMessages().catch(() => { })
        );
        return this.processQueue;
    }

    async _processNewMessages() {
        const messages = await readMessages(
            this.googleDriveOptions,
            this.init,
            this.processedMessageIds
        );
        if (messages.length > 0) {
            this._resync$.next();
        }
        messages.forEach(message => {
            const senderId = message.senderId;
            if (senderId === this.sessionId) {
                return;
            }
            let peerInstance: SimplePeerInstance;

            peerInstance = getFromMapOrCreate(
                this.peerBySenderId,
                senderId,
                () => {
                    const peer = new _Peer({
                        initiator: senderId > this.sessionId,
                        trickle: true,
                        wrtc: this.signalingOptions.wrtc,
                        config: this.signalingOptions.config
                    })
                    peer.on("signal", async (signalData: any) => {
                        await this.sendMessage(signalData);
                    });
                    peer.on('connect', () => {
                        this._resync$.next();
                    });
                    peer.on('data', (dataBuffer: any) => {
                        const data = dataBuffer + '';
                        switch (data) {
                            case 'NEW_PEER':
                                this.resetReadLoop();
                                break;
                            case 'RESYNC':
                                this._resync$.next();
                                break;
                            default:
                                console.error('Signaling UNKNOWN DATA ' + data);
                        }
                    });
                    peer.on('error', () => {
                        this._resync$.next();
                    });
                    peer.on('close', () => {
                        this.peerBySenderId.delete(senderId);
                        this._resync$.next();
                    });


                    /**
                     * If we find a new peer,
                     * we tell everyone else.
                     */
                    this.pingPeers('NEW_PEER');
                    promiseWait().then(() => this._resync$.next());
                    return peer;
                }
            );

            if (!message.data.i) {
                peerInstance.signal(message.data);
            }
        });
    }

    close() {
        this.closed = true;
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', this.resetReaderFn);
            window.removeEventListener('visibilitychange', this.resetReaderFn);
        }
        Array.from(this.peerBySenderId.values()).forEach(peer => peer.destroy())
        this._resync$.complete();
    }
}


export async function readMessages(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    init: DriveStructure,
    processedMessageIds: Set<string>
): Promise<{ senderId: string; data: any }[]> {
    // ----------------------------
    // INLINE: readFolderById logic
    // ----------------------------
    const query = [
        `'${init.signalingFolderId}' in parents`,
        `trashed = false`
        // If you want to restrict to json only:
        // `mimeType = 'application/json'`
        // If you prefix signaling files:
        // `name contains 'sig__'`
    ].join(' and ');

    const fields = 'files(id,name,mimeType,createdTime,parents),nextPageToken';

    const params = new URLSearchParams();
    params.set('q', query);
    params.set('fields', fields);
    /**
     * Only fetch the "newest" page.
     * Later invert the order.
     */
    params.set('orderBy', 'createdTime desc');
    params.set('pageSize', '1000');

    const listUrl =
        googleDriveOptions.apiEndpoint +
        '/drive/v3/files?' +
        params.toString();

    const listResponse = await fetch(listUrl, {
        method: 'GET',
        headers: {
            Authorization: 'Bearer ' + googleDriveOptions.authToken
        }
    });

    if (!listResponse.ok) {
        throw await newRxFetchError(listResponse);
    }

    const listData = await listResponse.json();
    let folderData: DriveFileMetadata[] = listData.files || [];
    folderData = folderData.reverse();

    const useFiles = folderData.filter(file => {
        const messageId = messageIdByFilename(file.name);
        return !processedMessageIds.has(messageId);
    });

    const filesContent = await Promise.all(
        useFiles.map(async (file) => {
            const fileContent = await readJsonFileContent(
                googleDriveOptions,
                file.id
            );
            const senderId = file.name.split('_')[0];
            return {
                senderId,
                data: fileContent.content
            };
        })
    );

    /**
     * Do this afterwards so we can retry on errors without losing messages.
     * (No need for async map here.)
     */
    useFiles.forEach((file) => {
        const messageId = messageIdByFilename(file.name);
        processedMessageIds.add(messageId);
    });



    return filesContent;
}



function messageIdByFilename(name: string): string {
    const fileName = name.split('.')[0];
    const messageId = ensureNotFalsy(lastOfArray(fileName.split('_')));
    return messageId;
}

const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 1 day

export async function cleanupOldSignalingMessages(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    signalingFolderId: string,
    maxAgeMs: number = DEFAULT_MAX_AGE_MS
): Promise<number> {
    return 2;

    const cutoffDate = new Date(Date.now() - maxAgeMs).toISOString();

    // Hardcoded folderId + query parts (Drive will do the filtering server-side)
    const query = [
        `'${signalingFolderId}' in parents`,
        `trashed = false`,
        `mimeType = 'application/json'`,
        `createdTime < '${cutoffDate}'`,
        // Recommended if folder may contain other JSON:
        // `name contains 'sig__'`
    ].join(' and ');

    // Hardcoded fields for cleanup
    const fields = 'files(id,name,createdTime),nextPageToken';

    const params = new URLSearchParams();
    params.set('q', query);
    params.set('fields', fields);
    params.set('orderBy', 'createdTime asc');
    params.set('pageSize', '1000');

    const url =
        googleDriveOptions.apiEndpoint +
        '/drive/v3/files?' +
        params.toString();

    const listResponse = await fetch(url, {
        method: 'GET',
        headers: {
            Authorization: 'Bearer ' + googleDriveOptions.authToken
        }
    });

    if (!listResponse.ok) {
        throw await newRxFetchError(listResponse);
    }

    const listData = await listResponse.json();
    const oldFiles: DriveFileMetadata[] = listData.files || [];

    if (!oldFiles.length) {
        return 0;
    }

    await Promise.all(
        oldFiles.map(file =>
            deleteFile(googleDriveOptions, file.id).catch(() => { })
        )
    );

    return oldFiles.length;
}
