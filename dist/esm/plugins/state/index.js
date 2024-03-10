import { getFromMapOrCreate } from "../utils/utils-map.js";
import { createRxState } from "./rx-state.js";
export * from "./helpers.js";
var STATE_BY_DATABASE = new WeakMap();
export async function addState(namespace = '') {
  var stateCache = getFromMapOrCreate(STATE_BY_DATABASE, this, () => new Map());
  var state = await getFromMapOrCreate(stateCache, namespace, () => createRxState(this, namespace));
  this.states[namespace] = state;
  return state;
}
export var RxDBStatePlugin = {
  name: 'state',
  rxdb: true,
  prototypes: {
    RxDatabase(proto) {
      proto.addState = addState;
    }
  }
};
//# sourceMappingURL=index.js.map