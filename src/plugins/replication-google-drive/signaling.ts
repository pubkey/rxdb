import type {
    SimplePeer as Peer,
    Instance as SimplePeerInstance,
    Options as SimplePeerOptions
} from 'simple-peer';
import {
    default as _Peer
    // @ts-ignore
} from 'simple-peer/simplepeer.min.js';
import { ensureProcessNextTickIsSet } from '../replication-webrtc/connection-handler-simple-peer';
import { randomToken } from '../utils/index.ts';
import { DriveStructure } from './init.ts';
import { GoogleDriveOptionsWithDefaults } from './google-drive-types.ts';

export function setupSignaling(
    googleDriveOptions: GoogleDriveOptionsWithDefaults,
    init: DriveStructure,
) {
    ensureProcessNextTickIsSet();


    const sessionId = randomToken(12);

    const peer = new _Peer({
        initiator: true,
        trickle: true, // recommended
        // config: { iceServers: [...] } // if needed
    });
}
