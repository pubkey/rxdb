/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using is-my-json-valid as jsonschema-validator
 * @link https://github.com/mafintosh/is-my-json-valid
 */
import isMyJsonValid from 'is-my-json-valid';
import { newRxError } from '../rx-error';
import { wrappedValidateStorageFactory } from '../plugin-helpers';
export var wrappedValidateIsMyJsonValidStorage = wrappedValidateStorageFactory(function (schema) {
  var validator = isMyJsonValid(schema);
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
}, 'is-my-json-valid');
//# sourceMappingURL=validate-is-my-json-valid.js.map