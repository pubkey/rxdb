import { ensureNotFalsy } from "../utils/index.js";

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
async function rx_pipeline_fn_1_(fn) {
  return await fn();
}
async function rx_pipeline_fn_2_(fn) {
  return await fn();
}
async function rx_pipeline_fn_3_(fn) {
  return await fn();
}
async function rx_pipeline_fn_4_(fn) {
  return await fn();
}
async function rx_pipeline_fn_5_(fn) {
  return await fn();
}
async function rx_pipeline_fn_6_(fn) {
  return await fn();
}
async function rx_pipeline_fn_7_(fn) {
  return await fn();
}
async function rx_pipeline_fn_8_(fn) {
  return await fn();
}
async function rx_pipeline_fn_9_(fn) {
  return await fn();
}
async function rx_pipeline_fn_10_(fn) {
  return await fn();
}
async function rx_pipeline_fn_11_(fn) {
  return await fn();
}
async function rx_pipeline_fn_12_(fn) {
  return await fn();
}
async function rx_pipeline_fn_13_(fn) {
  return await fn();
}
async function rx_pipeline_fn_14_(fn) {
  return await fn();
}
async function rx_pipeline_fn_15_(fn) {
  return await fn();
}
async function rx_pipeline_fn_16_(fn) {
  return await fn();
}
async function rx_pipeline_fn_17_(fn) {
  return await fn();
}
async function rx_pipeline_fn_18_(fn) {
  return await fn();
}
async function rx_pipeline_fn_19_(fn) {
  return await fn();
}
async function rx_pipeline_fn_20_(fn) {
  return await fn();
}
export var FLAGGED_FUNCTIONS = {
  rx_pipeline_fn_1_,
  rx_pipeline_fn_2_,
  rx_pipeline_fn_3_,
  rx_pipeline_fn_4_,
  rx_pipeline_fn_5_,
  rx_pipeline_fn_6_,
  rx_pipeline_fn_7_,
  rx_pipeline_fn_8_,
  rx_pipeline_fn_9_,
  rx_pipeline_fn_10_,
  rx_pipeline_fn_11_,
  rx_pipeline_fn_12_,
  rx_pipeline_fn_13_,
  rx_pipeline_fn_14_,
  rx_pipeline_fn_15_,
  rx_pipeline_fn_16_,
  rx_pipeline_fn_17_,
  rx_pipeline_fn_18_,
  rx_pipeline_fn_19_,
  rx_pipeline_fn_20_
};
var ids = Object.keys(FLAGGED_FUNCTIONS);
export function blockFlaggedFunctionKey() {
  /**
   * If this happens and we have no more flagged keys left
   * it means that more pipeline handlers are running in parallel.
   * To fix this, add more functions.
   */
  var id = ensureNotFalsy(ids.pop(), 'no flagged keys left');
  return id;
}
export function releaseFlaggedFunctionKey(key) {
  ids.push(key);
}
//# sourceMappingURL=flagged-functions.js.map