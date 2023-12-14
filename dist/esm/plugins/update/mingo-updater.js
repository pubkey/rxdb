/**
 * Custom build of the mingo updater for smaller build size
 */

import { createUpdater } from "mingo/updater";
import { clone } from "../utils/index.js";
var updater;
export function mingoUpdater(d, op) {
  if (!updater) {
    var updateObject = createUpdater({
      cloneMode: "none"
    });
    updater = (d, op) => {
      var cloned = clone(d);
      updateObject(cloned, op);
      return cloned;
    };
  }
  return updater(d, op);
}
//# sourceMappingURL=mingo-updater.js.map