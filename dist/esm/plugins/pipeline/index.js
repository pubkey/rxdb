import { addPipeline } from "./rx-pipeline.js";
export * from "./flagged-functions.js";
export * from "./rx-pipeline.js";
export var RxDBPipelinePlugin = {
  name: 'pipeline',
  rxdb: true,
  prototypes: {
    RxCollection(proto) {
      proto.addPipeline = addPipeline;
    }
  }
};
//# sourceMappingURL=index.js.map