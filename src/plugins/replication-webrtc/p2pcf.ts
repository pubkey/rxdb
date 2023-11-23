// @ts-nocheck
/**
 * Copied from p2pcf
 * @link https://github.com/gfodor/p2pcf/blob/master/src/p2pcf.js
 * TODO better fix typings and exports in p2pcf repository
 */


/**
 * Peer 2 Peer WebRTC connections with Cloudflare Workers as signalling server
 * Copyright Greg Fodor <gfodor@gmail.com>
 * Licensed under MIT
 */

/* global crypto */

import getBrowserRTC from 'get-browser-rtc'
import { EventEmitter } from 'events'
import Peer from 'tiny-simple-peer'
import {
    encode as arrayBufferToBase64,
    decode as base64ToArrayBuffer
} from 'base64-arraybuffer'

import convertHex from 'convert-hex';
const { hexToBytes } = convertHex;


import arrayBufferToHex from 'array-buffer-to-hex'

const CONNECT_TIMEOUT = 15000

// Based on Chrome
const MAX_MESSAGE_LENGTH_BYTES = 16000

// Custom timeout routine to end trickle ice early
const TRICKLE_ICE_TIMEOUT = 3000

const CHUNK_HEADER_LENGTH_BYTES = 12 // 2 magic, 2 msg id, 2 chunk id, 2 for done bit, 4 for length
const CHUNK_MAGIC_WORD = 8121
const CHUNK_MAX_LENGTH_BYTES =
    MAX_MESSAGE_LENGTH_BYTES - CHUNK_HEADER_LENGTH_BYTES

// Signalling messages have a 64-bit unique header
const SIGNAL_MESSAGE_HEADER_WORDS = [0x82ab, 0x81cd, 0x1295, 0xa1cb]

const CANDIDATE_TYPES = {
    host: 0,
    srflx: 1,
    relay: 2
}

const CANDIDATE_TCP_TYPES = {
    active: 0,
    passive: 1,
    so: 2
}

const CANDIDATE_IDX = {
    TYPE: 0,
    PROTOCOL: 1,
    IP: 2,
    PORT: 3,
    RELATED_IP: 4,
    RELATED_PORT: 5,
    TCP_TYPE: 6
}

const DEFAULT_STUN_ICE = [
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
]

const DEFAULT_TURN_ICE = [
    {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
    },
    {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
    },
    {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
    }
]

const randomstring = len => {
    const bytes = crypto.getRandomValues(new Uint8Array(len))
    const str = bytes.reduce((accum, v) => accum + String.fromCharCode(v), '')
    return btoa(str).replaceAll('=', '')
}

const textDecoder = new TextDecoder('utf-8')
const textEncoder = new TextEncoder()

const arrToText = textDecoder.decode.bind(textDecoder)
const textToArr = textEncoder.encode.bind(textEncoder)

const removeInPlace = (a, condition) => {
    let i = 0; let j = 0

    while (i < a.length) {
        const val = a[i]
        if (!condition(val, i, a)) a[j++] = val
        i++
    }

    a.length = j
    return a
}

const ua = window.navigator.userAgent
const iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i)
const webkit = !!ua.match(/WebKit/i)
const iOSSafari = !!(iOS && webkit && !ua.match(/CriOS/i))
const isFirefox = !!(navigator?.userAgent.toLowerCase().indexOf('firefox') > -1)

const hexToBase64 = hex => arrayBufferToBase64(hexToBytes(hex))
const base64ToHex = b64 => arrayBufferToHex(base64ToArrayBuffer(b64))

function createSdp(isOffer, iceUFrag, icePwd, dtlsFingerprintBase64) {
    const dtlsHex = base64ToHex(dtlsFingerprintBase64)
    let dtlsFingerprint = ''

    for (let i = 0; i < dtlsHex.length; i += 2) {
        dtlsFingerprint += `${dtlsHex[i]}${dtlsHex[i + 1]}${i === dtlsHex.length - 2 ? '' : ':'
            }`.toUpperCase()
    }

    const sdp = [
        'v=0',
        'o=- 5498186869896684180 2 IN IP4 127.0.0.1',
        's=-',
        't=0 0',
        'a=msid-semantic: WMS',
        'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
        'c=IN IP4 0.0.0.0',
        'a=mid:0',
        'a=sctp-port:5000'
    ]

    if (isOffer) {
        sdp.push('a=setup:actpass')
    } else {
        sdp.push('a=setup:active')
    }

    sdp.push(`a=ice-ufrag:${iceUFrag}`)
    sdp.push(`a=ice-pwd:${icePwd}`)
    sdp.push(`a=fingerprint:sha-256 ${dtlsFingerprint}`)

    return sdp.join('\r\n') + '\r\n'
}

// parseCandidate from https://github.com/fippo/sdp
const parseCandidate = line => {
    let parts

    // Parse both variants.
    if (line.indexOf('a=candidate:') === 0) {
        parts = line.substring(12).split(' ')
    } else {
        parts = line.substring(10).split(' ')
    }

    const candidate = [
        CANDIDATE_TYPES[parts[7]], // type
        parts[2].toLowerCase() === 'udp' ? 0 : 1, // protocol
        parts[4], // ip
        parseInt(parts[5], 10) // port
    ]

    for (let i = 8; i < parts.length; i += 2) {
        switch (parts[i]) {
            case 'raddr':
                while (candidate.length < 5) candidate.push(null)
                candidate[4] = parts[i + 1]
                break
            case 'rport':
                while (candidate.length < 6) candidate.push(null)
                candidate[5] = parseInt(parts[i + 1], 10)
                break
            case 'tcptype':
                while (candidate.length < 7) candidate.push(null)
                candidate[6] = CANDIDATE_TCP_TYPES[parts[i + 1]]
                break
            default:
                // Unknown extensions are silently ignored.
                break
        }
    }

    while (candidate.length < 8) candidate.push(null)
    candidate[7] = parseInt(parts[3], 10) // Priority last

    return candidate
}

export default class P2PCF extends EventEmitter {
    constructor(clientId = '', roomId = '', options = {}) {
        super()

        if (!clientId || clientId.length < 4) {
            throw new Error('Client ID must be at least four characters')
        }

        if (!roomId || roomId.length < 4) {
            throw new Error('Room ID must be at least four characters')
        }

        const now = Date.now()

        this._step = this._step.bind(this)

        this.peers = new Map()
        this.msgChunks = new Map()
        this.connectedSessions = []
        this.clientId = clientId
        this.roomId = roomId
        this.sessionId = randomstring(20)
        this.packages = []
        this.dataTimestamp = null
        this.lastPackages = null
        this.lastProcessedReceivedDataTimestamps = new Map()
        this.packageReceivedFromPeers = new Set()
        this.startedAtTimestamp = null
        this.peerOptions = options.rtcPeerConnectionOptions || {}
        this.peerProprietaryConstraints = options.rtcPeerConnectionProprietaryConstraints || {}
        this.peerSdpTransform = options.sdpTransform || ((sdp) => sdp)

        this.workerUrl = options.workerUrl || 'https://p2pcf.minddrop.workers.dev'

        if (this.workerUrl.endsWith('/')) {
            this.workerUrl = this.workerUrl.substring(0, this.workerUrl.length - 1)
        }

        this.stunIceServers = options.stunIceServers || DEFAULT_STUN_ICE
        this.turnIceServers = options.turnIceServers || DEFAULT_TURN_ICE
        this.networkChangePollIntervalMs =
            options.networkChangePollIntervalMs || 15000

        this.stateExpirationIntervalMs =
            options.stateExpirationIntervalMs || 2 * 60 * 1000
        this.stateHeartbeatWindowMs = options.stateHeartbeatWindowMs || 30000

        this.fastPollingDurationMs = options.fastPollingDurationMs || 10000
        this.fastPollingRateMs = options.fastPollingRateMs || 1500
        this.slowPollingRateMs = options.slowPollingRateMs || 5000
        this.idlePollingAfterMs = options.idlePollingAfterMs || Infinity
        this.idlePollingRateMs = options.idlePollingRateMs || Infinity

        this.wrtc = getBrowserRTC()
        this.dtlsCert = null
        this.udpEnabled = null
        this.isSymmetric = null
        this.dtlsFingerprint = null
        this.reflexiveIps = new Set()

        // step
        this.isSending = false
        this.finished = false
        this.nextStepTime = -1
        this.deleteKey = null
        this.sentFirstPoll = false
        this.stopFastPollingAt = now + this.fastPollingDurationMs
        this.startIdlePollingAt = now + this.idlePollingAfterMs

        // ContextID is maintained across page refreshes
        if (!window.history.state?._p2pcfContextId) {
            window.history.replaceState(
                {
                    ...window.history.state,
                    _p2pcfContextId: randomstring(20)
                },
                window.location.href
            )
        }

        this.contextId = window.history.state._p2pcfContextId
    }

    async _init() {
        if (this.dtlsCert === null) {
            this.dtlsCert = await this.wrtc.RTCPeerConnection.generateCertificate({
                name: 'ECDSA',
                namedCurve: 'P-256'
            })
        }
    }

    async _step(finish = false) {
        const {
            sessionId,
            clientId,
            roomId,
            contextId,
            stateExpirationIntervalMs,
            stateHeartbeatWindowMs,
            packages,
            fastPollingDurationMs,
            fastPollingRateMs,
            slowPollingRateMs,
            idlePollingAfterMs,
            idlePollingRateMs
        } = this

        const now = Date.now()

        if (finish) {
            if (this.finished) return
            if (!this.deleteKey) return
            this.finished = true
        } else {
            if (this.nextStepTime > now) return
            if (this.isSending) return
            if (this.reflexiveIps.length === 0) return
        }

        this.isSending = true

        try {
            const localDtlsFingerprintBase64 = hexToBase64(
                this.dtlsFingerprint.replaceAll(':', '')
            )

            const localPeerInfo = [
                sessionId,
                clientId,
                this.isSymmetric,
                localDtlsFingerprintBase64,
                this.startedAtTimestamp,
                [...this.reflexiveIps]
            ]

            const payload = { r: roomId, k: contextId }

            if (finish) {
                payload.dk = this.deleteKey
            }

            const expired =
                this.dataTimestamp === null ||
                now - this.dataTimestamp >=
                stateExpirationIntervalMs - stateHeartbeatWindowMs

            const packagesChanged = this.lastPackages !== JSON.stringify(packages)
            let includePackages = false

            if (expired || packagesChanged || finish) {
                // This will force a write
                this.dataTimestamp = now

                // Compact packages, expire any of them sent more than a minute ago.
                // (ICE will timeout by then, even if other latency fails us.)
                removeInPlace(packages, pkg => {
                    const sentAt = pkg[pkg.length - 2]
                    return now - sentAt > 60 * 1000
                })

                includePackages = true
            }

            if (finish) {
                includePackages = false
            }

            // The first poll should just be a read, no writes, to build up packages before we do a write
            // to reduce worker I/O. So don't include the data + packages on the first request.
            if (this.sentFirstPoll) {
                payload.d = localPeerInfo
                payload.t = this.dataTimestamp
                payload.x = this.stateExpirationIntervalMs

                if (includePackages) {
                    payload.p = packages
                    this.lastPackages = JSON.stringify(packages)
                }
            }

            const body = JSON.stringify(payload)
            const headers = { 'Content-Type': 'application/json ' }
            let keepalive = false

            if (finish) {
                headers['X-Worker-Method'] = 'DELETE'
                keepalive = true
            }

            const res = await fetch(this.workerUrl, {
                method: 'POST',
                headers,
                body,
                keepalive
            })

            const { ps: remotePeerDatas, pk: remotePackages, dk } = await res.json()

            if (dk) {
                this.deleteKey = dk
            }

            if (finish) return

            // Slight optimization: if the peers are empty on the first poll, immediately publish data to reduce
            // delay before first peers show up.
            if (remotePeerDatas.length === 0 && !this.sentFirstPoll) {
                payload.d = localPeerInfo
                payload.t = this.dataTimestamp
                payload.x = this.stateExpirationIntervalMs
                payload.p = packages
                this.lastPackages = JSON.stringify(packages)

                const res = await fetch(this.workerUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })

                const { dk } = await res.json()

                if (dk) {
                    this.deleteKey = dk
                }
            }

            this.sentFirstPoll = true

            const previousPeerSessionIds = [...this.peers.keys()]

            this._handleWorkerResponse(
                localPeerInfo,
                localDtlsFingerprintBase64,
                packages,
                remotePeerDatas,
                remotePackages
            )

            const activeSessionIds = remotePeerDatas.map(p => p[0])

            const peersChanged =
                previousPeerSessionIds.length !== activeSessionIds.length ||
                activeSessionIds.find(c => !previousPeerSessionIds.includes(c)) ||
                previousPeerSessionIds.find(c => !activeSessionIds.includes(c))

            // Rate limit requests when room is empty, or look for new joins
            // Go faster when things are changing to avoid ICE timeouts
            if (peersChanged) {
                this.stopFastPollingAt = now + fastPollingDurationMs
                this.startIdlePollingAt = now + idlePollingAfterMs
            }

            if (now < this.stopFastPollingAt) {
                this.nextStepTime = now + fastPollingRateMs
            } else if (now > this.startIdlePollingAt) {
                this.nextStepTime = now + idlePollingRateMs
            } else {
                this.nextStepTime = now + slowPollingRateMs
            }
        } catch (e) {
            console.error(e)
            this.nextStepTime = now + slowPollingRateMs
        } finally {
            this.isSending = false
        }
    }

    _handleWorkerResponse(
        localPeerData,
        localDtlsFingerprintBase64,
        localPackages,
        remotePeerDatas,
        remotePackages
    ) {
        const localStartedAtTimestamp = this.startedAtTimestamp

        const {
            dtlsCert: localDtlsCert,
            peers,
            lastProcessedReceivedDataTimestamps,
            packageReceivedFromPeers,
            stunIceServers,
            turnIceServers
        } = this
        const [localSessionId, , localSymmetric] = localPeerData

        const now = Date.now()

        for (const remotePeerData of remotePeerDatas) {
            const [
                remoteSessionId,
                remoteClientId,
                remoteSymmetric,
                remoteDtlsFingerprintBase64,
                remoteStartedAtTimestamp,
                remoteReflexiveIps,
                remoteDataTimestamp
            ] = remotePeerData

            // Don't process the same messages twice. This covers disconnect cases where stale data re-creates a peer too early.
            if (
                lastProcessedReceivedDataTimestamps.get(remoteSessionId) ===
                remoteDataTimestamp
            ) {
                continue
            }

            // Peer A is:
            //   - if both not symmetric or both symmetric, whoever has the most recent data is peer A, since we want Peer B created faster,
            //     and latency will be lowest with older data.
            //   - if one is and one isn't, the non symmetric one is the only one who has valid candidates, so the symmetric one is peer A
            const isPeerA =
                localSymmetric === remoteSymmetric
                    ? localStartedAtTimestamp === remoteStartedAtTimestamp
                        ? localSessionId > remoteSessionId
                        : localStartedAtTimestamp > remoteStartedAtTimestamp
                    : localSymmetric

            // If either side is symmetric, use TURN and hope we avoid connecting via relays
            // We can't just use TURN if both sides are symmetric because one side might be port restricted and hence won't connect without a relay.
            const iceServers =
                localSymmetric || remoteSymmetric ? turnIceServers : stunIceServers

            // Firefox answer side is very aggressive with ICE timeouts, so always delay answer set until second candidates received.
            const delaySetRemoteUntilReceiveCandidates = isFirefox
            const remotePackage = remotePackages.find(p => p[1] === remoteSessionId)

            const peerOptions = { ...this.peerOptions, iceServers }

            if (localDtlsCert) {
                peerOptions.certificates = [localDtlsCert]
            }

            if (isPeerA) {
                if (peers.has(remoteSessionId)) continue
                if (!remotePackage) continue

                lastProcessedReceivedDataTimestamps.set(
                    remoteSessionId,
                    remoteDataTimestamp
                )

                // If we already added the candidates from B, skip. This check is not strictly necessary given the peer will exist.
                if (packageReceivedFromPeers.has(remoteSessionId)) continue
                packageReceivedFromPeers.add(remoteSessionId)

                //  - I create PC
                //  - I create an answer SDP, and munge the ufrag
                //  - Set local description with answer
                //  - Set remote description via the received sdp
                //  - Add the ice candidates

                const [
                    ,
                    ,
                    remoteIceUFrag,
                    remoteIcePwd,
                    remoteDtlsFingerprintBase64,
                    localIceUFrag,
                    localIcePwd,
                    ,
                    remoteCandidates
                ] = remotePackage

                const peer = new Peer({
                    config: peerOptions,
                    initiator: false,
                    iceCompleteTimeout: Infinity,
                    proprietaryConstraints: this.peerProprietaryConstraints,
                    sdpTransform: sdp => {
                        const lines = []

                        for (const l of sdp.split('\r\n')) {
                            if (l.startsWith('a=ice-ufrag')) {
                                lines.push(`a=ice-ufrag:${localIceUFrag}`)
                            } else if (l.startsWith('a=ice-pwd')) {
                                lines.push(`a=ice-pwd:${localIcePwd}`)
                            } else {
                                lines.push(l)
                            }
                        }

                        return this.peerSdpTransform(lines.join('\r\n'))
                    }
                })

                peer.id = remoteSessionId
                peer.client_id = remoteClientId

                this._wireUpCommonPeerEvents(peer)

                peers.set(peer.id, peer)

                // Special case if both behind sym NAT or other hole punching isn't working: peer A needs to send its candidates as well.
                const pkg = [
                    remoteSessionId,
                    localSessionId,
          /* lfrag */ null,
          /* lpwd */ null,
          /* ldtls */ null,
          /* remote ufrag */ null,
          /* remote Pwd */ null,
                    now,
                    []
                ]

                const pkgCandidates = pkg[pkg.length - 1]

                let finishIceTimeout = null

                const finishIce = () => {
                    peer.removeListener('signal', initialCandidateSignalling)
                    if (localPackages.includes(pkg)) return
                    if (pkgCandidates.length === 0) return

                    localPackages.push(pkg)
                }

                const initialCandidateSignalling = e => {
                    if (!e.candidate) return

                    clearTimeout(finishIceTimeout)

                    if (e.candidate.candidate) {
                        pkgCandidates.push(e.candidate.candidate)
                        finishIceTimeout = setTimeout(finishIce, TRICKLE_ICE_TIMEOUT)
                    } else {
                        finishIce()
                    }
                }

                peer.on('signal', initialCandidateSignalling)

                setTimeout(() => {
                    if (peer._iceComplete || peer.connected) return

                    console.warn("Peer A didn't connect in time", peer.id)
                    peer._iceComplete = true
                    this._removePeer(peer, true)
                    this._updateConnectedSessions()
                }, CONNECT_TIMEOUT)

                const remoteSdp = createSdp(
                    true,
                    remoteIceUFrag,
                    remoteIcePwd,
                    remoteDtlsFingerprintBase64
                )

                for (const candidate of remoteCandidates) {
                    peer.signal({ candidate: { candidate, sdpMLineIndex: 0 } })
                }

                peer.signal({ type: 'offer', sdp: remoteSdp })
            } else {
                // I am peer B, I need to create a peer first if none exists, and send a package.
                //   - Create PC
                //   - Create offer
                //   - Set local description as-is
                //   - Generate ufrag + pwd
                //   - Generate remote SDP using the dtls fingerprint for A, and my generated ufrag + pwd
                //   - Add an srflx candidate for each of the reflexive IPs for A (on a random port) to hole punch
                //   - Set remote description
                //     so peer reflexive candidates for it show up.
                //   - Let trickle run, then once trickle finishes send a package for A to pick up = [my session id, my offer sdp, generated ufrag/pwd, dtls fingerprint, ice candidates]
                //   - keep the icecandidate listener active, and add the pfrlx candidates when they arrive (but don't send another package)
                if (!peers.has(remoteSessionId)) {
                    lastProcessedReceivedDataTimestamps.set(
                        remoteSessionId,
                        remoteDataTimestamp
                    )

                    const remoteUfrag = randomstring(12)
                    const remotePwd = randomstring(32)
                    const peer = new Peer({
                        config: peerOptions,
                        proprietaryConstraints: this.rtcPeerConnectionProprietaryConstraints,
                        iceCompleteTimeout: Infinity,
                        initiator: true,
                        sdpTransform: this.peerSdpTransform
                    })

                    peer.id = remoteSessionId
                    peer.client_id = remoteClientId

                    this._wireUpCommonPeerEvents(peer)

                    peers.set(peer.id, peer)

                    // This is the 'package' sent to peer A that it needs to start ICE
                    const pkg = [
                        remoteSessionId,
                        localSessionId,
            /* lfrag */ null,
            /* lpwd */ null,
            /* ldtls */ null,
                        remoteUfrag,
                        remotePwd,
                        now,
                        []
                    ]

                    const pkgCandidates = pkg[pkg.length - 1]

                    let finishIceTimeout = null

                    const finishIce = () => {
                        peer.removeListener('signal', initialCandidateSignalling)

                        if (localPackages.includes(pkg)) return
                        if (pkgCandidates.length === 0) return

                        localPackages.push(pkg)
                    }

                    const initialCandidateSignalling = e => {
                        if (!e.candidate) return
                        clearTimeout(finishIceTimeout)

                        // Push package onto the given package list, so it will be sent in next polling step.
                        if (e.candidate.candidate) {
                            pkgCandidates.push(e.candidate.candidate)
                            finishIceTimeout = setTimeout(finishIce, TRICKLE_ICE_TIMEOUT)
                        } else {
                            finishIce()
                        }
                    }

                    peer.on('signal', initialCandidateSignalling)

                    setTimeout(() => {
                        if (peer._iceComplete || peer.connected) return

                        console.warn('Peer B failed to connect in time', peer.id)
                        peer._iceComplete = true
                        this._removePeer(peer, true)
                        this._updateConnectedSessions()
                    }, CONNECT_TIMEOUT)

                    const enqueuePackageFromOffer = e => {
                        if (e.type !== 'offer') return
                        peer.removeListener('signal', enqueuePackageFromOffer)

                        for (const l of e.sdp.split('\r\n')) {
                            switch (l.split(':')[0]) {
                                case 'a=ice-ufrag':
                                    pkg[2] = l.substring(12)
                                    break
                                case 'a=ice-pwd':
                                    pkg[3] = l.substring(10)
                                    break
                                case 'a=fingerprint':
                                    pkg[4] = hexToBase64(l.substring(22).replaceAll(':', ''))
                                    break
                            }
                        }

                        // Peer A posted its reflexive IPs to try to speed up hole punching by B.
                        let remoteSdp = createSdp(
                            false,
                            remoteUfrag,
                            remotePwd,
                            remoteDtlsFingerprintBase64
                        )

                        for (let i = 0; i < remoteReflexiveIps.length; i++) {
                            remoteSdp += `a=candidate:0 1 udp ${i + 1} ${remoteReflexiveIps[i]
                                } 30000 typ srflx\r\n`
                        }

                        if (!delaySetRemoteUntilReceiveCandidates) {
                            peer.signal({ type: 'answer', sdp: remoteSdp })
                        } else {
                            peer._pendingRemoteSdp = remoteSdp
                        }
                    }

                    peer.once('signal', enqueuePackageFromOffer)
                }

                if (!remotePackage) continue

                // Peer B will also receive candidates in the case where hole punch fails.
                // If we already added the candidates from A, skip
                const [, , , , , , , , remoteCandidates] = remotePackage
                if (packageReceivedFromPeers.has(remoteSessionId)) continue
                if (!peers.has(remoteSessionId)) continue

                const peer = peers.get(remoteSessionId)

                if (
                    delaySetRemoteUntilReceiveCandidates &&
                    !peer._pc.remoteDescription &&
                    peer._pendingRemoteSdp
                ) {
                    if (!peer.connected) {
                        for (const candidate of remoteCandidates) {
                            peer.signal({ candidate: { candidate, sdpMLineIndex: 0 } })
                        }
                    }

                    peer.signal({ type: 'answer', sdp: peer._pendingRemoteSdp })
                    delete peer._pendingRemoteSdp
                    packageReceivedFromPeers.add(remoteSessionId)
                }

                if (
                    !delaySetRemoteUntilReceiveCandidates &&
                    peer._pc.remoteDescription &&
                    remoteCandidates.length > 0
                ) {
                    if (!peer.connected) {
                        for (const candidate of remoteCandidates) {
                            peer.signal({ candidate: { candidate, sdpMLineIndex: 0 } })
                        }
                    }

                    packageReceivedFromPeers.add(remoteSessionId)
                }
            }
        }

        const remoteSessionIds = remotePeerDatas.map(p => p[0])

        // Remove all disconnected peers no longer in the peer list.
        for (const [sessionId, peer] of peers.entries()) {
            if (remoteSessionIds.includes(sessionId)) continue

            if (!peer.connected) {
                console.warn('Removing unconnected peer not in peer list', peer.id)
                this._removePeer(peer, true)
            }
        }
    }

    /**
     * Connect to network and start discovering peers
     */
    async start() {
        this.startedAtTimestamp = Date.now()
        await this._init()

        const [
            udpEnabled,
            isSymmetric,
            reflexiveIps,
            dtlsFingerprint
        ] = await this._getNetworkSettings(this.dtlsCert)

        if (this.finished) return

        this.udpEnabled = udpEnabled
        this.isSymmetric = isSymmetric
        this.reflexiveIps = reflexiveIps
        this.dtlsFingerprint = dtlsFingerprint

        this.networkSettingsInterval = setInterval(async () => {
            const [
                newUdpEnabled,
                newIsSymmetric,
                newReflexiveIps,
                newDtlsFingerprint
            ] = await this._getNetworkSettings(this.dtlsCert)

            if (
                newUdpEnabled !== this.udpEnabled ||
                newIsSymmetric !== this.isSymmetric ||
                newDtlsFingerprint !== this.dtlsFingerprint ||
                !![...newReflexiveIps].find(ip => ![...this.reflexiveIps].find(ip2 => ip === ip2)) ||
                !![...reflexiveIps].find(ip => ![...newReflexiveIps].find(ip2 => ip === ip2))
            ) {
                // Network changed, force pushing new data
                this.dataTimestamp = null
            }

            this.udpEnabled = newUdpEnabled
            this.isSymmetric = newIsSymmetric
            this.reflexiveIps = newReflexiveIps
            this.dtlsFingerprint = newDtlsFingerprint
        }, this.networkChangePollIntervalMs)

        this._step = this._step.bind(this)
        this.stepInterval = setInterval(this._step, 500)
        this.destroyOnUnload = () => this.destroy()

        for (const ev of iOSSafari ? ['pagehide'] : ['unload']) {
            window.addEventListener(ev, this.destroyOnUnload)
        }
    }

    _removePeer(peer, destroy = false) {
        const { packageReceivedFromPeers, packages, peers } = this
        if (!peers.has(peer.id)) return

        removeInPlace(packages, pkg => pkg[0] === peer.id)
        packageReceivedFromPeers.delete(peer.id)

        peers.delete(peer.id)

        if (destroy) {
            peer.destroy()
        }

        this.emit('peerclose', peer)
    }

    /**
     * Send a msg and get response for it
     * @param Peer peer simple-peer object to send msg to
     * @param string msg Message to send
     * @param integer msgID ID of message if it's a response to a previous message
     */
    send(peer, msg) {
        if (!peer.connected) return

        // if leading byte is zero
        //   next two bytes is message id, then remaining bytes
        // otherwise its just raw
        let dataArrBuffer = null

        let messageId = null

        if (msg instanceof ArrayBuffer) {
            dataArrBuffer = msg
        } else if (msg instanceof Uint8Array) {
            if (msg.buffer.byteLength === msg.length) {
                dataArrBuffer = msg.buffer
            } else {
                dataArrBuffer = msg.buffer.slice(msg.byteOffset, msg.byteOffset + msg.byteLength)
            }
        } else {
            throw new Error('Unsupported send data type', msg)
        }

        // If the magic word happens to be the beginning of this message, chunk it
        if (
            dataArrBuffer.byteLength > MAX_MESSAGE_LENGTH_BYTES ||
            new Uint16Array(dataArrBuffer, 0, 1) === CHUNK_MAGIC_WORD
        ) {
            messageId = Math.floor(Math.random() * 256 * 128)
        }

        if (messageId !== null) {
            for (
                let offset = 0, chunkId = 0;
                offset < dataArrBuffer.byteLength;
                offset += CHUNK_MAX_LENGTH_BYTES, chunkId++
            ) {
                const chunkSize = Math.min(
                    CHUNK_MAX_LENGTH_BYTES,
                    dataArrBuffer.byteLength - offset
                )
                let bufSize = CHUNK_HEADER_LENGTH_BYTES + chunkSize

                while (bufSize % 4 !== 0) {
                    bufSize++
                }

                const buf = new ArrayBuffer(bufSize)
                new Uint8Array(buf, CHUNK_HEADER_LENGTH_BYTES).set(
                    new Uint8Array(dataArrBuffer, offset, chunkSize)
                )
                const u16 = new Uint16Array(buf)
                const u32 = new Uint32Array(buf)

                u16[0] = CHUNK_MAGIC_WORD
                u16[1] = messageId
                u16[2] = chunkId
                u16[3] =
                    offset + CHUNK_MAX_LENGTH_BYTES >= dataArrBuffer.byteLength ? 1 : 0
                u32[2] = dataArrBuffer.byteLength

                peer.send(buf)
            }
        } else {
            peer.send(dataArrBuffer)
        }
    }

    broadcast(msg) {
        for (const peer of this.peers.values()) {
            this.send(peer, msg)
        }
    }

    /**
     * Destroy object
     */
    destroy() {
        if (this._step) {
            this._step(true)
        }

        if (this.networkSettingsInterval) {
            clearInterval(this.networkSettingsInterval)
            this.networkSettingsInterval = null
        }

        if (this.stepInterval) {
            clearInterval(this.stepInterval)
            this.stepInterval = null
        }

        if (this.destroyOnUnload) {
            for (const ev of iOSSafari ? ['pagehide'] : ['beforeunload', 'unload']) {
                window.removeEventListener(ev, this.destroyOnUnload)
            }

            this.destroyOnUnload = null
        }

        for (const peer of this.peers.values()) {
            peer.destroy()
        }
    }

    /**
     * Handle msg chunks. Returns false until the last chunk is received. Finally returns the entire msg
     * @param object data
     */
    _chunkHandler(data, messageId, chunkId) {
        let target = null

        if (!this.msgChunks.has(messageId)) {
            const totalLength = new Uint32Array(data, 0, 3)[2]
            target = new Uint8Array(totalLength)
            this.msgChunks.set(messageId, target)
        } else {
            target = this.msgChunks.get(messageId)
        }

        const offsetToSet = chunkId * CHUNK_MAX_LENGTH_BYTES

        const numBytesToSet = Math.min(
            target.byteLength - offsetToSet,
            CHUNK_MAX_LENGTH_BYTES
        )

        target.set(
            new Uint8Array(data, CHUNK_HEADER_LENGTH_BYTES, numBytesToSet),
            chunkId * CHUNK_MAX_LENGTH_BYTES
        )

        return target.buffer
    }

    _updateConnectedSessions() {
        this.connectedSessions.length = 0

        for (const [sessionId, peer] of this.peers) {
            if (peer.connected) {
                this.connectedSessions.push(sessionId)
                continue
            }
        }
    }

    async _getNetworkSettings() {
        await this._init()

        let dtlsFingerprint = null
        const candidates = []
        const reflexiveIps = new Set()

        const peerOptions = { iceServers: this.stunIceServers }

        if (this.dtlsCert) {
            peerOptions.certificates = [this.dtlsCert]
        }

        const pc = new this.wrtc.RTCPeerConnection(peerOptions)
        const dc = pc.createDataChannel('x')

        const p = new Promise(resolve => {
            setTimeout(() => resolve(), 5000)

            pc.onicecandidate = e => {
                if (!e.candidate) return resolve()

                if (e.candidate.candidate) {
                    candidates.push(parseCandidate(e.candidate.candidate))
                }
            }
        })

        pc.createOffer().then(offer => {
            for (const l of offer.sdp.split('\n')) {
                if (l.indexOf('a=fingerprint') === -1) continue
                dtlsFingerprint = l.split(' ')[1].trim()
            }

            pc.setLocalDescription(offer)
        })

        await p

        dc.close()
        pc.close()

        let isSymmetric = false
        let udpEnabled = false

        // Network is not symmetric if we can find a srflx candidate that has a unique related port
        /* eslint-disable no-labels */
        loop: for (const c of candidates) {
            /* eslint-enable no-labels */
            if (c[0] !== CANDIDATE_TYPES.srflx) continue
            udpEnabled = true

            reflexiveIps.add(c[CANDIDATE_IDX.IP])

            for (const d of candidates) {
                if (d[0] !== CANDIDATE_TYPES.srflx) continue
                if (c === d) continue

                if (
                    typeof c[CANDIDATE_IDX.RELATED_PORT] === 'number' &&
                    typeof d[CANDIDATE_IDX.RELATED_PORT] === 'number' &&
                    c[CANDIDATE_IDX.RELATED_PORT] === d[CANDIDATE_IDX.RELATED_PORT] &&
                    c[CANDIDATE_IDX.PORT] !== d[CANDIDATE_IDX.PORT]
                ) {
                    // check port and related port
                    // Symmetric, continue
                    isSymmetric = true
                    break
                }
            }
        }

        return [udpEnabled, isSymmetric, reflexiveIps, dtlsFingerprint]
    }

    _handlePeerError(peer, err) {
        if (
            err.errorDetail === 'sctp-failure' &&
            err.message.indexOf('User-Initiated Abort') >= 0
        ) {
            return // Benign shutdown
        }

        console.error(err)
    }

    _checkForSignalOrEmitMessage(peer, msg) {
        if (msg.byteLength < SIGNAL_MESSAGE_HEADER_WORDS.length * 2) {
            this.emit('msg', peer, msg)
            return
        }

        const u16 = new Uint16Array(msg, 0, SIGNAL_MESSAGE_HEADER_WORDS.length)

        for (let i = 0; i < SIGNAL_MESSAGE_HEADER_WORDS.length; i++) {
            if (u16[i] !== SIGNAL_MESSAGE_HEADER_WORDS[i]) {
                this.emit('msg', peer, msg)
                return
            }
        }

        const u8 = new Uint8Array(msg, SIGNAL_MESSAGE_HEADER_WORDS.length * 2)

        let payload = arrToText(u8)

        // Might have a trailing byte
        if (payload.endsWith('\0')) {
            payload = payload.substring(0, payload.length - 1)
        }

        peer.signal(payload)
    }

    _wireUpCommonPeerEvents(peer) {
        peer.on('connect', () => {
            this.emit('peerconnect', peer)

            // Remove packages for the peer once connected
            removeInPlace(this.packages, pkg => pkg[0] === peer.id)
            this._updateConnectedSessions()
        })

        peer.on('data', data => {
            let messageId = null
            let u16 = null
            if (data.byteLength >= CHUNK_HEADER_LENGTH_BYTES) {
                u16 = new Uint16Array(data, 0, CHUNK_HEADER_LENGTH_BYTES / 2)

                if (u16[0] === CHUNK_MAGIC_WORD) {
                    messageId = u16[1]
                }
            }
            if (messageId !== null) {
                try {
                    const chunkId = u16[2]
                    const last = u16[3] !== 0
                    const msg = this._chunkHandler(data, messageId, chunkId, last)
                    if (last) {
                        this._checkForSignalOrEmitMessage(peer, msg)
                        this.msgChunks.delete(messageId)
                    }
                } catch (e) {
                    console.error(e)
                }
            } else {
                this._checkForSignalOrEmitMessage(peer, data)
            }
        })

        peer.on('error', err => {
            console.warn(err)
        })

        peer.on('close', () => {
            this._removePeer(peer)
            this._updateConnectedSessions()
        })

        // Once ICE completes, perform subsequent signalling via the datachannel
        peer.on('signal', signalData => {
            const payloadBytes = textToArr(
                JSON.stringify(signalData)
            )

            let len =
                payloadBytes.byteLength + SIGNAL_MESSAGE_HEADER_WORDS.length * 2

            if (len % 2 !== 0) {
                len++
            }

            // Add signal header
            const buf = new ArrayBuffer(len)
            const u8 = new Uint8Array(buf)
            const u16 = new Uint16Array(buf)

            u8.set(payloadBytes, SIGNAL_MESSAGE_HEADER_WORDS.length * 2)

            for (let i = 0; i < SIGNAL_MESSAGE_HEADER_WORDS.length; i++) {
                u16[i] = SIGNAL_MESSAGE_HEADER_WORDS[i]
            }

            this.send(peer, buf)
        })
    }
}
