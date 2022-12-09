import type {
    RxError,
    RxTypeError
} from '../../types';
import type {
    MessageFromRemote,
    MessageToRemote
} from './storage-remote-types';

export function createErrorAnswer(
    msg: MessageToRemote,
    error: Error | TypeError | RxError | RxTypeError
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
