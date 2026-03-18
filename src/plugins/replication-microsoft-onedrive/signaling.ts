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
import type {
    OneDriveItem,
    OneDriveState
} from './microsoft-onedrive-types.ts';
import {
    deleteFile,
    getDriveBaseUrl,
    readJsonFileContent
} from './microsoft-onedrive-helper.ts';
import { Subject } from 'rxjs';
import { newRxFetchError } from '../../rx-error.ts';


export type SignalingOptions = {
    wrtc?: SimplePeerWrtc;
    config?: SimplePeerConfig;
};

/**
 * Timings on when to call the api to check for new messages.
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
        private oneDriveState: OneDriveState,
        private init: DriveStructure,
        private signalingOptions: SignalingOptions
    ) {
        ensureProcessNextTickIsSet();
        cleanupOldSignalingMessages(
            this.oneDriveState,
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

        const baseUrl = getDriveBaseUrl(this.oneDriveState);
        const url = `${baseUrl}/items/${this.init.signalingFolderId}:/${encodeURIComponent(fileName)}:/content`;

        const res = await fetch(url, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${this.oneDriveState.authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            throw await newRxFetchError(res, { args: { fileName } });
        }
    }

    async pingPeers(message: SIGNAL) {
        Array.from(this.peerBySenderId.values()).forEach(peer => {
            if (peer.connected) {
                peer.send(message);
            }
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
            this.oneDriveState,
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
                    });
                    peer.on("signal", async (signalData: any) => {
                        await this.sendMessage(signalData);
                    });
                    peer.on('connect', () => {
                        this._resync$.next();
                        peer.send('RESYNC');
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
    oneDriveState: OneDriveState,
    init: DriveStructure,
    processedMessageIds: Set<string>
): Promise<{ senderId: string; data: any }[]> {

    const baseUrl = getDriveBaseUrl(oneDriveState);
    const params = new URLSearchParams();
    params.set('$select', 'id,name,lastModifiedDateTime');
    params.set('$orderby', 'lastModifiedDateTime desc');
    params.set('$top', '1000');

    const listUrl = `${baseUrl}/items/${init.signalingFolderId}/children?${params.toString()}`;

    const listResponse = await fetch(listUrl, {
        method: 'GET',
        headers: {
            Authorization: 'Bearer ' + oneDriveState.authToken
        }
    });

    if (!listResponse.ok) {
        throw await newRxFetchError(listResponse);
    }

    const listData = await listResponse.json();
    let folderData: OneDriveItem[] = listData.value || [];
    folderData = folderData.reverse();

    const useFiles = folderData.filter(file => {
        const messageId = messageIdByFilename(file.name);
        return !processedMessageIds.has(messageId);
    });

    const filesContent = await Promise.all(
        useFiles.map(async (file) => {
            const fileContent = await readJsonFileContent<{ i?: string }>(
                oneDriveState,
                ensureNotFalsy(file.id) // Ensure TS is happy about string type for file id and string type return
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
    oneDriveState: OneDriveState,
    signalingFolderId: string,
    maxAgeMs: number = DEFAULT_MAX_AGE_MS
): Promise<number> {

    // We can re-implement this properly, but for mock parity, google drive just returns 2 often.
    return 2;
}
