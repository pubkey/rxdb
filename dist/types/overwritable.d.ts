/**
 * functions that can or should be overwritten by plugins
 */
export declare const overwritable: {
    /**
     * if this method is overwritte with one
     * that returns true, we do additional checks
     * which help the developer but have bad performance
     */
    isDevMode(): boolean;
    /**
     * validates if a password can be used
     * @overwritten by plugin (optional)
     * @throws if password not valid
     */
    validatePassword(_password: string | any): void;
    /**
     * creates a key-compressor for the given schema
     */
    createKeyCompressor(_rxSchema: any): any;
    /**
     * checks if the given adapter can be used
     */
    checkAdapter(_adapter: any): Promise<boolean>;
    /**
     * overwritte to map error-codes to text-messages
     */
    tunnelErrorMessage(message: string): string;
};
