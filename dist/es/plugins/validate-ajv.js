/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using ajv as jsonschema-validator
 * @link https://github.com/epoberezkin/ajv
 */
import Ajv from 'ajv';
import { newRxError } from '../rx-error';
import { wrappedValidateStorageFactory } from '../plugin-helpers';
var ajv = new Ajv({
  strict: false
});
export var wrappedValidateAjvStorage = wrappedValidateStorageFactory(function (schema) {
  var validator = ajv.compile(schema);
  return function (docData) {
    var isValid = validator(docData);

    if (!isValid) {
      throw newRxError('VD2', {
        errors: validator.errors,
        document: docData,
        schema: schema
      });
    }
  };
}, 'ajv');
//# sourceMappingURL=validate-ajv.js.map