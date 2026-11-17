import { promiseWait } from '../utils/index.ts';
import { FLAGGED_FUNCTIONS, PIPELINE_FN_PREFIX } from './flagged-functions.ts';

/**
 * Returns the stack of the caller without the frame limit of the engine.
 * V8 only keeps 10 frames by default, so a handler that reaches
 * the destination collection through some nested function calls
 * would no longer have its flagged function inside of the stack.
 */
export function getFullStack(): string | undefined {
    const limitBefore = Error.stackTraceLimit;
    Error.stackTraceLimit = Infinity;
    const stack = new Error().stack;
    Error.stackTraceLimit = limitBefore;
    return stack;
}

let stackKeepsFlaggedFunction: Promise<boolean> | undefined;

/**
 * Not all JavaScript engines keep the calling async functions
 * inside of the stack after an awaited macrotask. Some engines never do,
 * and bundlers can rename the flagged functions.
 * Resolves to false when a call from inside of a flagged function
 * cannot be detected via the stack at that point.
 */
export function stackKeepsFlaggedFunctionAfterAwait(): Promise<boolean> {
    if (!stackKeepsFlaggedFunction) {
        stackKeepsFlaggedFunction = FLAGGED_FUNCTIONS.rx_pipeline_fn_1_(async () => {
            await promiseWait(0);
            const stack = getFullStack();
            return !!stack && stack.includes(PIPELINE_FN_PREFIX);
        });
    }
    return stackKeepsFlaggedFunction;
}
