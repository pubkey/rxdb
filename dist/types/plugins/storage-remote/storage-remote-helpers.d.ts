import type { RxError, RxTypeError } from '../../types';
import type { MessageFromRemote, MessageToRemote } from './storage-remote-types';
export declare function createErrorAnswer(msg: MessageToRemote, error: Error | TypeError | RxError | RxTypeError): MessageFromRemote;
export declare function createAnswer(msg: MessageToRemote, ret: any): MessageFromRemote;
