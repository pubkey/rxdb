import type {
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
 * This only worked for ids without invalid chars, so a legacy subject
 * can only exist for ids where the encoding changed nothing but the '%' chars.
 * Returns undefined when no legacy subject can exist for the id.
 */
export function getNatsLegacyDocumentSubject(
    subjectPrefix: string,
    docId: string
): string | undefined {
    const withoutEscapeChar = docId.split('%').join('');
    if (
        withoutEscapeChar !== docId &&
        encodeNatsSubjectToken(withoutEscapeChar) === withoutEscapeChar
    ) {
        return subjectPrefix + '.' + docId;
    }
    return undefined;
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
 */
export async function getNatsLegacyServerDocumentState(
    natsStream: Stream,
    subjectPrefix: string,
    docId: string
): Promise<StoredMsg | undefined> {
    const legacySubject = getNatsLegacyDocumentSubject(subjectPrefix, docId);
    if (!legacySubject) {
        return undefined;
    }
    try {
        return await natsStream.getMessage({
            last_by_subj: legacySubject
        });
    } catch (err: Error | any) {
        if (isNoMessageFoundError(err)) {
            return undefined;
        }
        throw err;
    }
}
