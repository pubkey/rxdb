import type {
    JetStreamClient,
    JetStreamManager,
    StoredMsg,
    Stream
} from 'nats';

/**
 * Chars that cannot be part of a NATS subject token:
 * the token separator '.', the wildcards '*' and '>',
 * whitespace and control chars which break the NATS protocol line.
 * The escape char '%' is also encoded so that decoding is unambiguous.
 * @link https://github.com/nats-io/nats-architecture-and-design/blob/main/adr/ADR-6.md
 */
const NATS_SUBJECT_TOKEN_ESCAPE_REGEX = /[.*>%\x00-\x20\x7F]/g;
const NATS_SUBJECT_TOKEN_DECODE_REGEX = /%([0-9A-F]{2})/g;

/**
 * Percent-encodes a string so that it can be used as a single NATS subject token.
 * All other chars, including non-ASCII chars, stay as they are
 * so that subjects stay readable and ids that are valid tokens are not changed.
 */
export function encodeNatsSubjectToken(str: string): string {
    return str.replace(
        NATS_SUBJECT_TOKEN_ESCAPE_REGEX,
        char => '%' + char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')
    );
}

export function decodeNatsSubjectToken(token: string): string {
    return token.replace(
        NATS_SUBJECT_TOKEN_DECODE_REGEX,
        (_match, hex: string) => String.fromCharCode(parseInt(hex, 16))
    );
}

export function getNatsDocumentSubject(
    subjectPrefix: string,
    docId: string
): string {
    return subjectPrefix + '.' + encodeNatsSubjectToken(docId);
}

/**
 * Before the ids were encoded, documents were stored
 * under the plain subject '<subjectPrefix>.<docId>'.
 * This worked for every id that is a valid literal subject token:
 * no '.', no whitespace, no null char and not a single '*' or '>'.
 * A '*' or '>' inside a longer token is not a wildcard,
 * so ids like 'a*b' were stored under their plain subject.
 * @link https://github.com/nats-io/nats-server/blob/main/server/sublist.go
 * Returns undefined when no legacy subject can exist for the id
 * or when it is equal to the encoded subject.
 */
export function getNatsLegacyDocumentSubject(
    subjectPrefix: string,
    docId: string
): string | undefined {
    if (
        docId.length === 0 ||
        docId === '*' ||
        docId === '>' ||
        /[.\x00\t\n\f\r ]/.test(docId) ||
        encodeNatsSubjectToken(docId) === docId
    ) {
        return undefined;
    }
    return subjectPrefix + '.' + docId;
}

function isNoMessageFoundError(err: Error | any): boolean {
    return !!err && typeof err.message === 'string' && err.message.includes('no message found');
}

export async function getNatsServerDocumentState(
    natsStream: Stream,
    subjectPrefix: string,
    docId: string
): Promise<StoredMsg | undefined> {
    const remoteDocState = await natsStream.getMessage({
        last_by_subj: getNatsDocumentSubject(subjectPrefix, docId)
    });
    return remoteDocState;
}

/**
 * Returns the stored message of a document that is still
 * stored under its legacy subject, or undefined if there is none.
 * The legacy subject of an id can be equal to the encoded subject of another id,
 * for example the legacy subject of 'a%2Eb' is the encoded subject of 'a.b',
 * so the id in the message body is checked.
 */
export async function getNatsLegacyServerDocumentState(
    natsStream: Stream,
    subjectPrefix: string,
    primaryPath: string,
    docId: string
): Promise<StoredMsg | undefined> {
    const legacySubject = getNatsLegacyDocumentSubject(subjectPrefix, docId);
    if (!legacySubject) {
        return undefined;
    }
    let legacyDocState: StoredMsg;
    try {
        legacyDocState = await natsStream.getMessage({
            last_by_subj: legacySubject
        });
    } catch (err: Error | any) {
        if (isNoMessageFoundError(err)) {
            return undefined;
        }
        throw err;
    }
    if (legacyDocState.json<any>()[primaryPath] !== docId) {
        return undefined;
    }
    return legacyDocState;
}

/**
 * Removes a legacy document from its legacy subject
 * after publishing it to its encoded subject.
 * If the encoded subject already has a message, the document
 * was written after it was moved and only the legacy subject is purged.
 * The purge only removes messages up to the legacy message
 * so that newer writes to the subject are kept.
 */
export async function moveNatsLegacyDocument(
    jetstreamClient: JetStreamClient,
    jetstreamManager: JetStreamManager,
    natsStream: Stream,
    streamName: string,
    subjectPrefix: string,
    primaryPath: string,
    legacyDocState: StoredMsg
): Promise<void> {
    const docId: string = legacyDocState.json<any>()[primaryPath];
    const subject = getNatsDocumentSubject(subjectPrefix, docId);
    if (subject !== legacyDocState.subject) {
        let hasEncodedState = true;
        try {
            await natsStream.getMessage({
                last_by_subj: subject
            });
        } catch (err: Error | any) {
            if (!isNoMessageFoundError(err)) {
                throw err;
            }
            hasEncodedState = false;
        }
        if (!hasEncodedState) {
            await jetstreamClient.publish(subject, legacyDocState.data);
        }
    }
    await jetstreamManager.streams.purge(streamName, {
        filter: legacyDocState.subject,
        seq: legacyDocState.seq + 1
    });
}
