/**
 * This plugins contains thing that are needed for testing
 * in RxDB related context. Mostly used in the unit tests and
 * also in the tests for the premium and the server repository.
 */
export * from './config.ts';
export * from './humans-collection.ts';
export * from './port-manager.ts';
export * from './revisions.ts';
export * from './test-util.ts';
export * from './schema-objects.ts';
export * from './schemas.ts';
export * from './replication.ts';
import * as humansCollectionConst from './humans-collection.ts';
export declare const humansCollection: typeof humansCollectionConst;
import * as schemasConst from './schemas.ts';
export declare const schemas: typeof schemasConst;
import * as schemaObjectsConst from './schema-objects.ts';
export declare const schemaObjects: typeof schemaObjectsConst;
