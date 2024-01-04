import type {
    RxError,
    RxTypeError
} from '../../types/index.d.ts';
import { errorToPlainJson } from '../../plugins/utils/index.ts';
import type {
    MessageFromRemote,
    MessageToRemote
} from './storage-remote-types.ts';

export function createErrorAnswer(
    msg: MessageToRemote,
    error: Error | TypeError | RxError | RxTypeError
): MessageFromRemote {
    return {
        connectionId: msg.connectionId,
        answerTo: msg.requestId,
        method: msg.method,
        error: errorToPlainJson(error)
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
