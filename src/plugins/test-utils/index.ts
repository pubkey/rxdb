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

import * as useHumansCollection from './humans-collection.ts';
export const humansCollection = useHumansCollection;
import * as useSchemaObjects from './schema-objects.ts';
export const schemaObjects = useSchemaObjects;
import * as useSchemas from './schemas.ts';
export * from './schemas.ts';
export const schemas = useSchemas;
