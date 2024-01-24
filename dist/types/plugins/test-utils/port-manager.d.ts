/**
 * Returns an unused port.
 * Used to ensure that different tests
 * do not accidentally use the same port.
 */
export declare function nextPort(): Promise<number>;
