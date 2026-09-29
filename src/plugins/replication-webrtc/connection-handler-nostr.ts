import {
    finalizeEvent,
    generateSecretKey,
    getPublicKey,
    verifyEvent
} from 'nostr-tools/pure';
import type { Event as NostrEvent } from 'nostr-tools/pure';
import {
    decrypt as nip44Decrypt,
    encrypt as nip44Encrypt,
    getConversationKey
} from 'nostr-tools/nip44';
import {
    defaultHashSha256,
    randomToken
} from '../../plugins/utils/index.ts';
import { newRxError } from '../../rx-error.ts';
import type {
    WebRTCConnectionHandlerCreator
} from './webrtc-types.ts';
import {
    getConnectionHandlerSimplePeer,
    SIMPLE_PEER_RECONNECT_DELAY_MAX,
    SIMPLE_PEER_RECONNECT_DELAY_MIN
} from './connection-handler-simple-peer.ts';
import type {
    PeerMessage,
    SimplePeer,
    SimplePeerConfig,
    SimplePeerWebSocketConstructor,
    SimplePeerWrtc
} from './connection-handler-simple-peer.ts';

export type NostrConnectionHandlerOptions = {
    /**
     * Urls of the Nostr relays that are used for signaling,
     * like 'wss://relay.example.com'.
     * All peers of a topic must share at least one relay.
     */
    relays: string[];
    /**
     * The Nostr secret key of this peer (32 bytes).
     * The public key of it becomes part of the peer id
     * and can be checked in isPeerValid() with getNostrPublicKeyOfPeer().
     * If not set, a new random key is generated on each start.
     */
    secretKey?: Uint8Array;
    /**
     * Kind of the ephemeral Nostr events that are used for signaling.
     * Must be in the ephemeral range of 20000-29999 so that relays
     * forward the events but do not store them.
     * [default=25050]
     */
    eventKind?: number;
    wrtc?: SimplePeerWrtc;
    config?: SimplePeerConfig;
    webSocketConstructor?: SimplePeerWebSocketConstructor;
};

export const NOSTR_SIGNALING_DEFAULT_EVENT_KIND = 25050;

/**
 * Each peer publishes its presence in this interval.
 * A peer is removed from the room when no presence
 * was received in NOSTR_PRESENCE_TIMEOUT.
 */
export const NOSTR_PRESENCE_INTERVAL = 1000 * 10;
export const NOSTR_PRESENCE_TIMEOUT = NOSTR_PRESENCE_INTERVAL * 3 + 1000 * 5;

/**
 * Events with a created_at that differs more than this from the local time
 * are ignored so that replayed events do not trigger connection attempts.
 */
export const NOSTR_MAX_EVENT_AGE = 1000 * 60 * 2;

/**
 * WebRTC creates many signals in a short time because of trickle ICE.
 * Public relays rate limit the number of events per second,
 * so the signals to the same peer are collected for this time
 * and then sent together in one event.
 */
export const NOSTR_SIGNAL_BATCH_TIME = 200;

/**
 * Used as prefix of the hashed topic
 * so that the topic is not readable on the relays.
 */
const NOSTR_TOPIC_HASH_PREFIX = 'rxdb-webrtc-nostr|';

const WEBSOCKET_STATE_CONNECTING = 0;
const WEBSOCKET_STATE_OPEN = 1;
const WEBSOCKET_STATE_CLOSED = 3;

type NostrSignalingContent = {
    type: 'presence';
    session: string;
} | {
    type: 'leave';
    session: string;
} | {
    type: 'signal';
    /**
     * Encrypted with NIP-44 to the receiver.
     */
    payload: string;
};

type NostrSignal = {
    connectionId?: string;
    data: any;
};

type NostrSignalPayload = {
    fromSession: string;
    toSession: string;
    signals: NostrSignal[];
};

/**
 * Returns the Nostr public key (hex) of a peer that
 * was connected with getConnectionHandlerNostr().
 * The key is verified by the event signatures of the signaling,
 * so it can be used in isPeerValid() to only allow known peers.
 */
export function getNostrPublicKeyOfPeer(peer: SimplePeer): string {
    return peer.remotePeerId.split(':')[0];
}

/**
 * Returns a connection handler that uses Nostr relays
 * instead of a signaling server to connect the WebRTC peers.
 * The replicated data does not go over the relays,
 * only the WebRTC offers, answers and ICE candidates do.
 * @link https://nostr.how/en/what-is-nostr
 */
export function getConnectionHandlerNostr({
    relays,
    secretKey,
    eventKind = NOSTR_SIGNALING_DEFAULT_EVENT_KIND,
    wrtc,
    config,
    webSocketConstructor = WebSocket
}: NostrConnectionHandlerOptions): WebRTCConnectionHandlerCreator<SimplePeer> {
    if (!relays || relays.length === 0) {
        throw newRxError('RC_WEBRTC_NOSTR', {
            errorText: 'at least one relay url must be given'
        });
    }
    if (eventKind < 20000 || eventKind > 29999) {
        throw newRxError('RC_WEBRTC_NOSTR', {
            errorText: 'eventKind must be in the ephemeral range of 20000-29999',
            args: { eventKind }
        });
    }

    return (options) => {
        const ownSecretKey = secretKey ? secretKey : generateSecretKey();
        const ownPublicKey = getPublicKey(ownSecretKey);
        const signalingSocketClass = createNostrSignalingSocketClass({
            relays,
            secretKey: ownSecretKey,
            publicKey: ownPublicKey,
            eventKind,
            webSocketConstructor
        });
        return getConnectionHandlerSimplePeer({
            signalingServerUrl: 'nostr:' + relays.join(','),
            wrtc,
            config,
            webSocketConstructor: signalingSocketClass
        })(options);
    };
}

type RelayConnection = {
    url: string;
    ws?: WebSocket;
    open: boolean;
    reconnectDelay: number;
    reconnectTimeout?: ReturnType<typeof setTimeout>;
};

/**
 * Creates a class that behaves like a WebSocket to the RxDB signaling server,
 * so that the peer handling of the simple-peer connection handler can be reused.
 * Internally it translates the signaling messages into Nostr events.
 */
function createNostrSignalingSocketClass(params: {
    relays: string[];
    secretKey: Uint8Array;
    publicKey: string;
    eventKind: number;
    webSocketConstructor: SimplePeerWebSocketConstructor;
}): SimplePeerWebSocketConstructor {
    const {
        relays,
        secretKey,
        publicKey,
        eventKind,
        webSocketConstructor
    } = params;

    class NostrSignalingSocket {
        public readyState: number = WEBSOCKET_STATE_CONNECTING;
        public onopen: ((ev: any) => any) | null = null;
        public onmessage: ((ev: any) => any) | null = null;
        public onerror: ((ev: any) => any) | null = null;
        public onclose: ((ev: any) => any) | null = null;

        /**
         * A new session id for each socket so that the same secret key
         * can be used on multiple devices or browser tabs at the same time.
         */
        private readonly session = randomToken(10);
        private readonly ownPeerId = publicKey + ':' + this.session;
        private readonly subscriptionId = randomToken(10);
        private relayConnections: RelayConnection[];
        private topicHash?: string;
        private presenceInterval?: ReturnType<typeof setInterval>;
        /**
         * Last time a presence event was received, by peer id.
         */
        private roomPeers = new Map<string, number>();
        private lastEmittedPeerIds = '';
        private seenEventIds = new Map<string, number>();
        private conversationKeys = new Map<string, Uint8Array>();
        /**
         * Signals that wait to be sent, by receiver peer id.
         */
        private signalQueues = new Map<string, NostrSignal[]>();
        private signalTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

        constructor(_url: string) {
            this.relayConnections = relays.map(url => ({
                url,
                open: false,
                reconnectDelay: SIMPLE_PEER_RECONNECT_DELAY_MIN
            }));
            this.relayConnections.forEach(relay => this.connectRelay(relay));
        }

        send(data: string) {
            if (this.readyState !== WEBSOCKET_STATE_OPEN) {
                return;
            }
            const msg: PeerMessage = JSON.parse(data);
            switch (msg.type) {
                case 'join':
                    this.join(msg.room);
                    break;
                case 'signal':
                    this.queueSignal(msg.receiverPeerId, {
                        connectionId: msg.connectionId,
                        data: msg.data
                    });
                    break;
            }
        }

        close() {
            if (this.readyState === WEBSOCKET_STATE_CLOSED) {
                return;
            }
            if (this.topicHash) {
                this.publish({ type: 'leave', session: this.session });
            }
            this.readyState = WEBSOCKET_STATE_CLOSED;
            if (this.presenceInterval) {
                clearInterval(this.presenceInterval);
            }
            this.signalTimeouts.forEach(timeout => clearTimeout(timeout));
            this.signalTimeouts.clear();
            this.signalQueues.clear();
            this.relayConnections.forEach(relay => {
                if (relay.reconnectTimeout) {
                    clearTimeout(relay.reconnectTimeout);
                }
                const ws = relay.ws;
                relay.ws = undefined;
                relay.open = false;
                if (ws) {
                    try {
                        ws.close();
                    } catch (err) { }
                }
            });
            this.roomPeers.clear();
            this.conversationKeys.clear();
            this.seenEventIds.clear();
            if (this.onclose) {
                this.onclose({});
            }
        }

        private emit(msg: PeerMessage) {
            if (this.readyState === WEBSOCKET_STATE_OPEN && this.onmessage) {
                this.onmessage({ data: JSON.stringify(msg) });
            }
        }

        private connectRelay(relay: RelayConnection) {
            if (this.readyState === WEBSOCKET_STATE_CLOSED) {
                return;
            }
            const ws = new webSocketConstructor(relay.url);
            relay.ws = ws;
            ws.onopen = () => {
                if (relay.ws !== ws || this.readyState === WEBSOCKET_STATE_CLOSED) {
                    return;
                }
                relay.open = true;
                relay.reconnectDelay = SIMPLE_PEER_RECONNECT_DELAY_MIN;
                if (this.readyState === WEBSOCKET_STATE_CONNECTING) {
                    this.readyState = WEBSOCKET_STATE_OPEN;
                    if (this.onopen) {
                        this.onopen({});
                    }
                    this.emit({ type: 'init', yourPeerId: this.ownPeerId });
                } else if (this.topicHash) {
                    this.subscribeRelay(relay);
                    this.publishPresence();
                }
            };
            ws.onmessage = (msgEvent: any) => {
                if (relay.ws !== ws || this.readyState !== WEBSOCKET_STATE_OPEN) {
                    return;
                }
                this.onRelayMessage(msgEvent.data);
            };
            ws.onerror = () => {
                /**
                 * Errors are followed by a close event
                 * which handles the reconnect.
                 */
            };
            ws.onclose = () => {
                if (relay.ws !== ws) {
                    return;
                }
                relay.ws = undefined;
                relay.open = false;
                if (this.readyState === WEBSOCKET_STATE_CLOSED) {
                    return;
                }
                const delay = relay.reconnectDelay;
                relay.reconnectDelay = Math.min(delay * 2, SIMPLE_PEER_RECONNECT_DELAY_MAX);
                relay.reconnectTimeout = setTimeout(() => {
                    relay.reconnectTimeout = undefined;
                    this.connectRelay(relay);
                }, delay);
            };
        }

        private sendToRelay(relay: RelayConnection, msg: any[]) {
            if (!relay.open || !relay.ws) {
                return;
            }
            try {
                relay.ws.send(JSON.stringify(msg));
            } catch (err) { }
        }

        private subscribeRelay(relay: RelayConnection) {
            this.sendToRelay(relay, [
                'REQ',
                this.subscriptionId,
                {
                    kinds: [eventKind],
                    '#t': [this.topicHash],
                    since: Math.floor((Date.now() - NOSTR_MAX_EVENT_AGE) / 1000)
                }
            ]);
        }

        private async join(topic: string) {
            const topicHash = await defaultHashSha256(NOSTR_TOPIC_HASH_PREFIX + topic);
            if (this.readyState !== WEBSOCKET_STATE_OPEN) {
                return;
            }
            this.topicHash = topicHash;
            this.relayConnections.forEach(relay => this.subscribeRelay(relay));
            this.publishPresence();
            this.presenceInterval = setInterval(() => {
                this.publishPresence();
                this.removeTimedOutPeers();
                this.cleanupSeenEvents();
            }, NOSTR_PRESENCE_INTERVAL);
            this.emitJoined(true);
        }

        private publishPresence() {
            this.publish({ type: 'presence', session: this.session });
        }

        private queueSignal(receiverPeerId: string, signal: NostrSignal) {
            let queue = this.signalQueues.get(receiverPeerId);
            if (!queue) {
                queue = [];
                this.signalQueues.set(receiverPeerId, queue);
            }
            queue.push(signal);
            if (this.signalTimeouts.has(receiverPeerId)) {
                return;
            }
            this.signalTimeouts.set(receiverPeerId, setTimeout(() => {
                this.signalTimeouts.delete(receiverPeerId);
                const signals = this.signalQueues.get(receiverPeerId);
                this.signalQueues.delete(receiverPeerId);
                if (signals && this.readyState === WEBSOCKET_STATE_OPEN) {
                    this.publishSignals(receiverPeerId, signals);
                }
            }, NOSTR_SIGNAL_BATCH_TIME));
        }

        private publishSignals(receiverPeerId: string, signals: NostrSignal[]) {
            const [receiverPublicKey, receiverSession] = receiverPeerId.split(':');
            const payload: NostrSignalPayload = {
                fromSession: this.session,
                toSession: receiverSession,
                signals
            };
            let encrypted: string;
            try {
                encrypted = nip44Encrypt(
                    JSON.stringify(payload),
                    this.getConversationKey(receiverPublicKey)
                );
            } catch (err) {
                return;
            }
            this.publish({ type: 'signal', payload: encrypted }, receiverPublicKey);
        }

        private publish(content: NostrSignalingContent, receiverPublicKey?: string) {
            if (!this.topicHash) {
                return;
            }
            const tags: string[][] = [['t', this.topicHash]];
            if (receiverPublicKey) {
                tags.push(['p', receiverPublicKey]);
            }
            const event = finalizeEvent({
                kind: eventKind,
                created_at: Math.floor(Date.now() / 1000),
                tags,
                content: JSON.stringify(content)
            }, secretKey);
            this.relayConnections.forEach(relay => this.sendToRelay(relay, ['EVENT', event]));
        }

        private getConversationKey(otherPublicKey: string): Uint8Array {
            let key = this.conversationKeys.get(otherPublicKey);
            if (!key) {
                key = getConversationKey(secretKey, otherPublicKey);
                this.conversationKeys.set(otherPublicKey, key);
            }
            return key;
        }

        private onRelayMessage(raw: any) {
            let msg: any;
            try {
                msg = JSON.parse(raw.toString());
            } catch (err) {
                return;
            }
            if (
                !Array.isArray(msg) ||
                msg[0] !== 'EVENT' ||
                msg[1] !== this.subscriptionId ||
                !msg[2] ||
                typeof msg[2] !== 'object'
            ) {
                return;
            }
            const event: NostrEvent = msg[2];

            /**
             * The same event arrives once from each relay.
             */
            if (typeof event.id !== 'string' || this.seenEventIds.has(event.id)) {
                return;
            }
            if (
                event.kind !== eventKind ||
                !Array.isArray(event.tags) ||
                !event.tags.some(tag => tag[0] === 't' && tag[1] === this.topicHash) ||
                Math.abs(Date.now() - event.created_at * 1000) > NOSTR_MAX_EVENT_AGE
            ) {
                return;
            }
            let isValid = false;
            try {
                isValid = verifyEvent(event);
            } catch (err) { }
            if (!isValid) {
                return;
            }
            this.seenEventIds.set(event.id, Date.now());

            let content: NostrSignalingContent;
            try {
                content = JSON.parse(event.content);
            } catch (err) {
                return;
            }
            if (!content || typeof content !== 'object') {
                return;
            }

            switch (content.type) {
                case 'presence': {
                    if (typeof content.session !== 'string') {
                        return;
                    }
                    const peerId = event.pubkey + ':' + content.session;
                    if (peerId === this.ownPeerId) {
                        return;
                    }
                    const isNew = !this.roomPeers.has(peerId);
                    this.roomPeers.set(peerId, Date.now());
                    if (isNew) {
                        /**
                         * Answer with the own presence directly
                         * so that the new peer does not have to wait
                         * for the next presence interval.
                         */
                        this.publishPresence();
                        this.emitJoined();
                    }
                    break;
                }
                case 'leave': {
                    const peerId = event.pubkey + ':' + content.session;
                    if (this.roomPeers.delete(peerId)) {
                        this.emitJoined();
                    }
                    break;
                }
                case 'signal': {
                    if (
                        typeof content.payload !== 'string' ||
                        !event.tags.some(tag => tag[0] === 'p' && tag[1] === publicKey)
                    ) {
                        return;
                    }
                    let payload: NostrSignalPayload;
                    try {
                        payload = JSON.parse(
                            nip44Decrypt(content.payload, this.getConversationKey(event.pubkey))
                        );
                    } catch (err) {
                        return;
                    }
                    if (
                        !payload ||
                        payload.toSession !== this.session ||
                        !Array.isArray(payload.signals)
                    ) {
                        return;
                    }
                    const senderPeerId = event.pubkey + ':' + payload.fromSession;
                    if (senderPeerId === this.ownPeerId) {
                        return;
                    }
                    payload.signals.forEach(signal => this.emit({
                        type: 'signal',
                        room: '',
                        senderPeerId,
                        receiverPeerId: this.ownPeerId,
                        connectionId: signal.connectionId,
                        data: signal.data
                    }));
                    break;
                }
            }
        }

        private removeTimedOutPeers() {
            const minTime = Date.now() - NOSTR_PRESENCE_TIMEOUT;
            let changed = false;
            this.roomPeers.forEach((lastSeen, peerId) => {
                if (lastSeen < minTime) {
                    this.roomPeers.delete(peerId);
                    changed = true;
                }
            });
            if (changed) {
                this.emitJoined();
            }
        }

        private cleanupSeenEvents() {
            const minTime = Date.now() - NOSTR_MAX_EVENT_AGE * 2;
            this.seenEventIds.forEach((time, id) => {
                if (time < minTime) {
                    this.seenEventIds.delete(id);
                }
            });
        }

        private emitJoined(force = false) {
            const otherPeerIds = Array.from(this.roomPeers.keys()).sort();
            const key = otherPeerIds.join(',');
            if (!force && key === this.lastEmittedPeerIds) {
                return;
            }
            this.lastEmittedPeerIds = key;
            this.emit({ type: 'joined', otherPeerIds });
        }
    }
    return NostrSignalingSocket as any;
}
