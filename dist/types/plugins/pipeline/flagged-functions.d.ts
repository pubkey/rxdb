/**
 * This is the most hacky thing we do in RxDB.
 * When a pipeline "transaction" is running,
 * we have to make all calls to the collection from the outside
 * wait while still make it possible to run reads and writes
 * from inside the transaction.
 *
 * We can decide where the call came from by checking the stack `new Error().stack`
 * for a random "flag".
 * But creating random flagged functions requires eval which we should not use.
 * Instead we have a list of some flagged functions here
 * that can be used and checked for in the stacktrace.
 *
 *
 * When doing this with eval() instead it would look like:
 * ```ts
 * eval(`
 *     async function ${this.secretFunctionName}(docs){ const x = await _this.handler(docs); return x; }
 *     o.${this.secretFunctionName} = ${this.secretFunctionName};
 *   `);
 * await o[this.secretFunctionName](rxDocuments);
 *
 * ```
 */
declare function rx_pipeline_fn_1_(fn: any): Promise<any>;
declare function rx_pipeline_fn_2_(fn: any): Promise<any>;
declare function rx_pipeline_fn_3_(fn: any): Promise<any>;
declare function rx_pipeline_fn_4_(fn: any): Promise<any>;
declare function rx_pipeline_fn_5_(fn: any): Promise<any>;
declare function rx_pipeline_fn_6_(fn: any): Promise<any>;
declare function rx_pipeline_fn_7_(fn: any): Promise<any>;
declare function rx_pipeline_fn_8_(fn: any): Promise<any>;
declare function rx_pipeline_fn_9_(fn: any): Promise<any>;
declare function rx_pipeline_fn_10_(fn: any): Promise<any>;
declare function rx_pipeline_fn_11_(fn: any): Promise<any>;
declare function rx_pipeline_fn_12_(fn: any): Promise<any>;
declare function rx_pipeline_fn_13_(fn: any): Promise<any>;
declare function rx_pipeline_fn_14_(fn: any): Promise<any>;
declare function rx_pipeline_fn_15_(fn: any): Promise<any>;
declare function rx_pipeline_fn_16_(fn: any): Promise<any>;
declare function rx_pipeline_fn_17_(fn: any): Promise<any>;
declare function rx_pipeline_fn_18_(fn: any): Promise<any>;
declare function rx_pipeline_fn_19_(fn: any): Promise<any>;
declare function rx_pipeline_fn_20_(fn: any): Promise<any>;
export declare const FLAGGED_FUNCTIONS: {
    readonly rx_pipeline_fn_1_: typeof rx_pipeline_fn_1_;
    readonly rx_pipeline_fn_2_: typeof rx_pipeline_fn_2_;
    readonly rx_pipeline_fn_3_: typeof rx_pipeline_fn_3_;
    readonly rx_pipeline_fn_4_: typeof rx_pipeline_fn_4_;
    readonly rx_pipeline_fn_5_: typeof rx_pipeline_fn_5_;
    readonly rx_pipeline_fn_6_: typeof rx_pipeline_fn_6_;
    readonly rx_pipeline_fn_7_: typeof rx_pipeline_fn_7_;
    readonly rx_pipeline_fn_8_: typeof rx_pipeline_fn_8_;
    readonly rx_pipeline_fn_9_: typeof rx_pipeline_fn_9_;
    readonly rx_pipeline_fn_10_: typeof rx_pipeline_fn_10_;
    readonly rx_pipeline_fn_11_: typeof rx_pipeline_fn_11_;
    readonly rx_pipeline_fn_12_: typeof rx_pipeline_fn_12_;
    readonly rx_pipeline_fn_13_: typeof rx_pipeline_fn_13_;
    readonly rx_pipeline_fn_14_: typeof rx_pipeline_fn_14_;
    readonly rx_pipeline_fn_15_: typeof rx_pipeline_fn_15_;
    readonly rx_pipeline_fn_16_: typeof rx_pipeline_fn_16_;
    readonly rx_pipeline_fn_17_: typeof rx_pipeline_fn_17_;
    readonly rx_pipeline_fn_18_: typeof rx_pipeline_fn_18_;
    readonly rx_pipeline_fn_19_: typeof rx_pipeline_fn_19_;
    readonly rx_pipeline_fn_20_: typeof rx_pipeline_fn_20_;
};
export declare function blockFlaggedFunctionKey(): keyof typeof FLAGGED_FUNCTIONS;
export declare function releaseFlaggedFunctionKey(key: keyof typeof FLAGGED_FUNCTIONS): void;
export {};
