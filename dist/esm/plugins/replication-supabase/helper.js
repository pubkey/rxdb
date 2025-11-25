export var POSTGRES_INSERT_CONFLICT_CODE = "23505";
export var DEFAULT_MODIFIED_FIELD = '_modified';
export var DEFAULT_DELETED_FIELD = '_deleted';
export function addDocEqualityToQuery(jsonSchema, deletedField, modifiedField, doc, query) {
  var ignoreKeys = new Set([modifiedField, deletedField, '_meta', '_attachments', '_rev']);
  for (var key of Object.keys(doc)) {
    if (ignoreKeys.has(key)) {
      continue;
    }
    var v = doc[key];
    var type = typeof v;
    if (type === "string" || type === "number") {
      query = query.eq(key, v);
    } else if (type === "boolean" || v === null) {
      query = query.is(key, v);
    } else if (type === 'undefined') {
      query = query.is(key, null);
    } else {
      throw new Error("unknown how to handle type: " + type);
    }
  }
  var schemaProps = jsonSchema.properties;
  for (var _key of Object.keys(schemaProps)) {
    if (ignoreKeys.has(_key) || Object.hasOwn(doc, _key)) {
      continue;
    }
    query = query.is(_key, null);
  }
  query = query.eq(deletedField, doc._deleted);
  if (schemaProps[modifiedField]) {
    query = query.eq(modifiedField, doc[modifiedField]);
  }
  return query;
}
//# sourceMappingURL=helper.js.map