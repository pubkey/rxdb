import type {
    MessageFromRemote,
    MessageToRemote
} from './storage-remote-types';

export function createErrorAnswer(
    msg: MessageToRemote,
    error: any
): MessageFromRemote {
    return {
        connectionId: msg.connectionId,
        answerTo: msg.requestId,
        method: msg.method,
        error
    };
}

export function createAnswer(
    msg: MessageToRemote,
    ret: any
): MessageFromRemote {
    return {
        connectionId: msg.connectionId,
        answerTo: msg.requestId,
        method: msg.method,
        return: ret
    };
}
