
/**
 * Returns the current unix time in milliseconds (with two decmials!)
 * Because the accuracy of getTime() in javascript is bad,
 * and we cannot rely on performance.now() on all platforms,
 * this method implements a way to never return the same value twice.
 * This ensures that when now() is called often, we do not loose the information
 * about which call came first and which came after.
 *
 * We had to move from having no decimals, to having two decimal
 * because it turned out that some storages are such fast that
 * calling this method too often would return 'the future'.
 */
let _lastNow: number = 0;
/**
 * Returns the current time in milliseconds,
 * also ensures to not return the same value twice.
 */
export function now(): number {
    let ret = new Date().getTime();
    ret = ret + 0.01;
    if (ret <= _lastNow) {
        ret = _lastNow + 0.01;
    }

    /**
     * Strip the returned number to max two decimals.
     * In theory we would not need this but
     * in practice JavaScript has no such good number precision
     * so rounding errors could add another decimal place.
     */
    const twoDecimals = parseFloat(ret.toFixed(2));

    _lastNow = twoDecimals;
    return twoDecimals;
}
