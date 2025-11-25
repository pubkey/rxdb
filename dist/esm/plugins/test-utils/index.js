/**
 * This plugins contains thing that are needed for testing
 * in RxDB related context. Mostly used in the unit tests and
 * also in the tests for the premium and the server repository.
 */

export * from "./config.js";
export * from "./humans-collection.js";
export * from "./port-manager.js";
export * from "./revisions.js";
export * from "./test-util.js";
export * from "./schema-objects.js";
export * from "./schemas.js";
export * from "./replication.js";
import * as humansCollectionConst from "./humans-collection.js";
export var humansCollection = humansCollectionConst;
import * as schemasConst from "./schemas.js";
export var schemas = schemasConst;
import * as schemaObjectsConst from "./schema-objects.js";
export var schemaObjects = schemaObjectsConst;
//# sourceMappingURL=index.js.map