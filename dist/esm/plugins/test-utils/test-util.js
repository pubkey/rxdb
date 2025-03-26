import assert from 'assert';
import { requestIdlePromise } from "../utils/index.js";
export function testMultipleTimes(times, title, test) {
  new Array(times).fill(0).forEach(() => {
    it(title, test);
  });
}
export async function ensureCollectionsHaveEqualState(c1, c2, logContext) {
  await requestIdlePromise();
  var getJson = async collection => {
    var docs = await collection.find().exec();
    return docs.map(d => d.toJSON());
  };
  var json1 = await getJson(c1);
  var json2 = await getJson(c2);
  try {
    assert.deepStrictEqual(json1, json2);
  } catch (err) {
    console.error('ensureCollectionsHaveEqualState(' + logContext + ') states not equal (c1:' + c1.name + ', c2:' + c2.name + '):');
    console.dir({
      c1: json1,
      c2: json2
    });
    console.log('----------');
    throw err;
  }
}
export function ensureReplicationHasNoErrors(replicationState) {
  /**
   * We do not have to unsubscribe because the observable will cancel anyway.
   */
  replicationState.error$.subscribe(err => {
    console.error('ensureReplicationHasNoErrors() has error:');
    console.log(err);
    if (err?.parameters?.errors) {
      throw err.parameters.errors[0];
    }
    throw err;
  });
}
//# sourceMappingURL=test-util.js.map