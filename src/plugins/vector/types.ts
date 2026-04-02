export type Vector = number[];

/**
 * A quantized vector using uint8 values (0-255).
 * Stores the quantized data along with min/max
 * for dequantization back to float values.
 */
export type QuantizedVector = {
    /**
     * Quantized uint8 values (0-255).
     * Stored as number[] for JSON compatibility with RxDB storage.
     */
    data: number[];
    /**
     * Minimum value of the (rotated) vector before quantization.
     */
    min: number;
    /**
     * Maximum value of the (rotated) vector before quantization.
     */
    max: number;
};

/**
 * Serializable configuration for TurboQuant.
 * Store this alongside your collection to ensure
 * consistent quantization/dequantization.
 */
export type TurboQuantConfig = {
    dimensions: number;
    seed: number;
};

/**
 * Precomputed configuration with random signs
 * for fast repeated quantization/dequantization.
 * Create once with prepareTurboQuantConfig() and reuse.
 */
export type PreparedTurboQuantConfig = {
    signs: number[];
    dimensions: number;
};
