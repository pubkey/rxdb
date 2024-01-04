import type { RxError, RxTypeError } from '../../types/index.d.ts';
import type { MessageFromRemote, MessageToRemote } from './storage-remote-types.ts';
export declare function createErrorAnswer(msg: MessageToRemote, error: Error | TypeError | RxError | RxTypeError): MessageFromRemote;
export declare function createAnswer(msg: MessageToRemote, ret: any): MessageFromRemote;
