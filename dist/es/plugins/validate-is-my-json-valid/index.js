/**
 * this plugin validates documents before they can be inserted into the RxCollection.
 * It's using is-my-json-valid as jsonschema-validator
 * @link https://github.com/mafintosh/is-my-json-valid
 */
import isMyJsonValid from 'is-my-json-valid';
import { wrappedValidateStorageFactory } from '../../plugin-helpers';
export function getValidator(schema) {
  var validator = isMyJsonValid(schema);
  return docData => {
    var isValid = validator(docData);
    if (isValid) {
      return [];
    } else {
      return validator.errors;
    }
  };
}
export var wrappedValidateIsMyJsonValidStorage = wrappedValidateStorageFactory(getValidator, 'is-my-json-valid');
//# sourceMappingURL=index.js.map