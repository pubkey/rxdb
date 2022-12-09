import type { MessageFromRemote, MessageToRemote } from './storage-remote-types';
export declare function createErrorAnswer(msg: MessageToRemote, error: any): MessageFromRemote;
export declare function createAnswer(msg: MessageToRemote, ret: any): MessageFromRemote;
