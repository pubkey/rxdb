import objectPath from 'object-path';
import { trimDots } from './util';
/**
 * Helper function to create a valid RxJsonSchema
 * with a given version.
 */

export function getPseudoSchemaForVersion(version, primaryKey) {
  var _properties;

  var pseudoSchema = {
    version: version,
    type: 'object',
    primaryKey: primaryKey,
    properties: (_properties = {}, _properties[primaryKey] = {
      type: 'string'
    }, _properties),
    required: [primaryKey]
  };
  return pseudoSchema;
}
/**
 * Returns the sub-schema for a given path
 */

export function getSchemaByObjectPath(rxJsonSchema, path) {
  var usePath = path;
  usePath = usePath.replace(/\./g, '.properties.');
  usePath = 'properties.' + usePath;
  usePath = trimDots(usePath);
  var ret = objectPath.get(rxJsonSchema, usePath);
  return ret;
}
//# sourceMappingURL=rx-schema-helper.js.map