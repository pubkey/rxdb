import type {
    FlutterBridgeError,
    FlutterBridgeMessage
} from './flutter-types.ts';
import { newRxError } from '../../rx-error.ts';

/**
 * The Dart side must define the global function __rxdbFlutterSend(json: string)
 * before the bundle is evaluated. Messages from Dart are delivered by calling
 * the global function __rxdbFlutterReceive(json: string).
 * Only strings are passed over the bridge so that the protocol works
 * with any JavaScript engine (QuickJS, JavaScriptCore, Node.js).
 */
export function sendToFlutter(message: FlutterBridgeMessage) {
    const sendFn = (globalThis as any).__rxdbFlutterSend;
    if (typeof sendFn !== 'function') {
        throw newRxError('FL1', {
            args: {
                typeof_send: typeof sendFn
            }
        });
    }
    sendFn(JSON.stringify(message));
}

let lastRequestId = 0;
const OPEN_DART_REQUESTS = new Map<number, {
    resolve: (v: any) => void;
    reject: (err: any) => void;
}>();

/**
 * Calls a method on the Dart side and returns its result.
 */
export function callDart<T = any>(method: string, params: any): Promise<T> {
    const id = lastRequestId++;
    return new Promise<T>((resolve, reject) => {
        OPEN_DART_REQUESTS.set(id, { resolve, reject });
        sendToFlutter({
            t: 'req',
            id,
            m: method,
            p: params
        });
    });
}

export type FlutterMethodHandler = (params: any) => any | Promise<any>;
export const FLUTTER_METHOD_HANDLERS = new Map<string, FlutterMethodHandler>();

export function receiveFromFlutter(json: string) {
    const message: FlutterBridgeMessage = JSON.parse(json);
    if (message.t === 'res') {
        const open = OPEN_DART_REQUESTS.get(message.id);
        if (!open) {
            return;
        }
        OPEN_DART_REQUESTS.delete(message.id);
        if (message.e) {
            open.reject(flutterErrorToJsError(message.e));
        } else {
            open.resolve(message.r);
        }
    } else if (message.t === 'req') {
        const id = message.id;
        const handler = FLUTTER_METHOD_HANDLERS.get(message.m);
        Promise.resolve()
            .then(() => {
                if (!handler) {
                    throw newRxError('FL2', {
                        args: {
                            method: message.m
                        }
                    });
                }
                return handler(message.p);
            })
            .then(
                result => sendToFlutter({
                    t: 'res',
                    id,
                    r: result === undefined ? null : result
                }),
                err => sendToFlutter({
                    t: 'res',
                    id,
                    e: jsErrorToFlutterError(err)
                })
            );
    }
}

export function flutterErrorToJsError(err: FlutterBridgeError): Error {
    const ret = new Error(err.message);
    if (err.name) {
        ret.name = err.name;
    }
    (ret as any).code = err.code;
    (ret as any).parameters = err.parameters;
    return ret;
}

export function jsErrorToFlutterError(err: any): FlutterBridgeError {
    if (!err || typeof err !== 'object') {
        return {
            message: String(err)
        };
    }
    const ret: FlutterBridgeError = {
        name: err.name,
        message: err.message ? err.message : String(err),
        code: err.code,
        stack: err.stack
    };
    if (err.parameters) {
        /**
         * Parameters can contain non-serializable
         * values like an RxCollection, so only send them
         * when they can be stringified.
         */
        try {
            ret.parameters = JSON.parse(JSON.stringify(err.parameters));
        } catch (_e) {
            ret.parameters = undefined;
        }
    }
    return ret;
}

function stringifyLogArg(arg: any): string {
    if (typeof arg === 'string') {
        return arg;
    }
    if (arg instanceof Error) {
        return arg.name + ': ' + arg.message + (arg.stack ? '\n' + arg.stack : '');
    }
    try {
        return JSON.stringify(arg);
    } catch (_e) {
        return String(arg);
    }
}

/**
 * Some JavaScript engines miss globals that RxDB uses.
 * Also the console output is forwarded to Dart so that
 * logs are visible in the Flutter console on all platforms.
 */
export function patchFlutterJavaScriptRuntime() {
    const g = globalThis as any;
    if (typeof g.global === 'undefined') {
        g.global = g;
    }
    if (typeof g.window === 'undefined') {
        g.window = g;
    }
    if (typeof g.process === 'undefined') {
        g.process = { env: {} };
    } else if (!g.process.env) {
        g.process.env = {};
    }
    if (typeof g.queueMicrotask !== 'function') {
        g.queueMicrotask = (fn: () => void) => Promise.resolve().then(fn);
    }
    if (typeof g.TextEncoder === 'undefined') {
        g.TextEncoder = class {
            encode(str: string): Uint8Array {
                const utf8 = unescape(encodeURIComponent(str));
                const ret = new Uint8Array(utf8.length);
                for (let i = 0; i < utf8.length; i++) {
                    ret[i] = utf8.charCodeAt(i);
                }
                return ret;
            }
        };
    }
    if (typeof g.TextDecoder === 'undefined') {
        g.TextDecoder = class {
            decode(bytes: Uint8Array): string {
                let str = '';
                for (let i = 0; i < bytes.length; i++) {
                    str += String.fromCharCode(bytes[i]);
                }
                return decodeURIComponent(escape(str));
            }
        };
    }
    const levels: ('log' | 'info' | 'warn' | 'error' | 'debug')[] = ['log', 'info', 'warn', 'error', 'debug'];
    const newConsole: any = {};
    levels.forEach(level => {
        newConsole[level] = (...args: any[]) => {
            sendToFlutter({
                t: 'log',
                level,
                args: args.map(arg => stringifyLogArg(arg))
            });
        };
    });
    newConsole.trace = newConsole.debug;
    newConsole.dir = newConsole.log;
    newConsole.table = newConsole.log;
    newConsole.time = () => { };
    newConsole.timeEnd = () => { };
    g.console = newConsole;
}
