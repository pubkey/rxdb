
/**
 * Returns the current unix time in milliseconds (with two decimals!)
 * Because the accuracy of getTime() in javascript is bad,
 * and we cannot rely on performance.now() on all platforms,
 * this method implements a way to never return the same value twice.
 * This ensures that when now() is called often, we do not loose the information
 * about which call came first and which came after.
 *
 * We had to move from having no decimals, to having two decimal
 * because it turned out that some storages are such fast that
 * calling this method too often would return 'the future'.
 *
 * Tracks the current millisecond and a sub-millisecond counter (1-99)
 * separately as integers to avoid floating point rounding errors
 * and eliminate the need for Math.round().
 */
let _lastNowMs: number = 0;
let _lastNowSub: number = 0;
/**
 * Returns the current time in milliseconds,
 * also ensures to not return the same value twice.
 */
export function now(): number {
    const dateNow = Date.now();
    if (dateNow > _lastNowMs) {
        _lastNowMs = dateNow;
        /**
         * Start at 1 (not 0) so the returned value is always
         * dateNow + 0.01 at minimum, matching the original behavior
         * of always adding 0.01 to Date.now().
         */
        _lastNowSub = 1;
    } else {
        if (++_lastNowSub === 100) {
            _lastNowMs++;
            _lastNowSub = 1;
        }
    }
    return _lastNowMs + _lastNowSub * 0.01;
}
