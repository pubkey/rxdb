/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using z-schema as jsonschema-validator
 * @link https://github.com/zaggino/z-schema
 */
import ZSchema from 'z-schema';
import { wrappedValidateStorageFactory } from "../../plugin-helpers.js";
export var ZSchemaClass = ZSchema;
var zSchema;
export function getZSchema() {
  if (!zSchema) {
    zSchema = new ZSchema({
      strictMode: false
    });
  }
  return zSchema;
}
export function getValidator(schema) {
  var validator = obj => {
    getZSchema().validate(obj, schema);
    return getZSchema();
  };
  return docData => {
    var useValidator = validator(docData);
    if (useValidator === true) {
      return;
    }
    var errors = useValidator.getLastErrors();
    if (errors) {
      var formattedZSchemaErrors = errors.map(({
        title,
        description,
        message,
        path
      }) => ({
        title,
        description,
        message,
        path
      }));
      return formattedZSchemaErrors;
    } else {
      return [];
    }
  };
}
export var wrappedValidateZSchemaStorage = wrappedValidateStorageFactory(getValidator, 'z-schema');
//# sourceMappingURL=index.js.map