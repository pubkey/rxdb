/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using ajv as jsonschema-validator
 * @link https://github.com/epoberezkin/ajv
 */
import Ajv from 'ajv';
import { wrappedValidateStorageFactory } from '../../plugin-helpers';
var ajv = new Ajv({
  strict: false
});
export function getValidator(schema) {
  var validator = ajv.compile(schema);
  return docData => {
    var isValid = validator(docData);
    if (isValid) {
      return [];
    } else {
      return validator.errors;
    }
  };
}
export var wrappedValidateAjvStorage = wrappedValidateStorageFactory(getValidator, 'ajv');
//# sourceMappingURL=index.js.map