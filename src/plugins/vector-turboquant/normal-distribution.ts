/**
 * Probability density function of the standard normal distribution.
 */
export function normalPdf(x: number): number {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Cumulative distribution function of the standard normal distribution.
 * Uses the rational approximation of Hart (1968) which is accurate
 * to about 1e-15 over the whole range.
 * @link https://en.wikipedia.org/wiki/Normal_distribution#Numerical_approximations_for_the_normal_CDF_and_normal_quantile_function
 */
export function normalCdf(x: number): number {
    const z = Math.abs(x);
    let p: number;
    if (z > 37) {
        p = 0;
    } else {
        const e = Math.exp(-z * z / 2);
        if (z < 7.07106781186547) {
            let n = 3.52624965998911e-02 * z + 0.700383064443688;
            n = n * z + 6.37396220353165;
            n = n * z + 33.912866078383;
            n = n * z + 112.079291497871;
            n = n * z + 221.213596169931;
            n = n * z + 220.206867912376;
            let d = 8.83883476483184e-02 * z + 1.75566716318264;
            d = d * z + 16.064177579207;
            d = d * z + 86.7807322029461;
            d = d * z + 296.564248779674;
            d = d * z + 637.333633378831;
            d = d * z + 793.826512519948;
            d = d * z + 440.413735824752;
            p = e * n / d;
        } else {
            const f = z + 1 / (z + 2 / (z + 3 / (z + 4 / (z + 0.65))));
            p = e / (f * 2.506628274631);
        }
    }
    return x > 0 ? 1 - p : p;
}

/**
 * Inverse of normalCdf(), calculated with a bisection
 * because it is only used while building the codebooks
 * and therefore never runs in a hot code path.
 */
export function normalQuantile(p: number): number {
    let low = -40;
    let high = 40;
    for (let i = 0; i < 200; i++) {
        const middle = (low + high) / 2;
        if (normalCdf(middle) < p) {
            low = middle;
        } else {
            high = middle;
        }
    }
    return (low + high) / 2;
}
