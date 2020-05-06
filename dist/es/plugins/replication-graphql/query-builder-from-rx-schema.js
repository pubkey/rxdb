import { fillUpOptionals, SPACING } from './graphql-schema-from-rx-schema';
import { ucfirst } from '../../util';
export function pullQueryBuilderFromRxSchema(collectionName, input) {
  var batchSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 5;
  input = fillUpOptionals(input);
  var schema = input.schema;
  var prefixes = input.prefixes;
  var ucCollectionName = ucfirst(collectionName);
  var queryName = prefixes.feed + ucCollectionName;
  var outputFields = Object.keys(schema.properties).filter(function (k) {
    return !input.ignoreOutputKeys.includes(k);
  });
  outputFields.push(input.deletedFlag);

  var builder = function builder(doc) {
    var queryKeys = input.feedKeys.map(function (key) {
      var subSchema = schema.properties[key];
      var type = subSchema.type;
      var value = doc ? doc[key] : null;
      var keyString = key + ': ';

      if (type === 'number' || type === 'integer' || !value) {
        keyString += value;
      } else {
        keyString += '"' + value + '"';
      }

      return keyString;
    });
    queryKeys.push('limit: ' + batchSize);
    var query = '' + '{\n' + SPACING + queryName + '(' + queryKeys.join(', ') + ') {\n' + SPACING + SPACING + outputFields.join('\n' + SPACING + SPACING) + '\n' + SPACING + '}\n' + '}';
    return {
      query: query,
      variables: {}
    };
  };

  return builder;
}
export function pushQueryBuilderFromRxSchema(collectionName, input) {
  input = fillUpOptionals(input);
  var prefixes = input.prefixes;
  var ucCollectionName = ucfirst(collectionName);
  var queryName = prefixes.set + ucCollectionName;

  var builder = function builder(doc) {
    var _variables;

    var query = '' + 'mutation Set' + ucCollectionName + '($' + collectionName + ': ' + ucCollectionName + 'Input) {\n' + SPACING + queryName + '(' + collectionName + ': $' + collectionName + ') {\n' + SPACING + SPACING + input.deletedFlag + '\n' + // GraphQL enforces to return at least one field
    SPACING + '}\n' + '}';
    var sendDoc = {};
    Object.entries(doc).forEach(function (_ref) {
      var k = _ref[0],
          v = _ref[1];

      if (!input.ignoreInputKeys.includes(k)) {
        sendDoc[k] = v;
      }
    });
    var variables = (_variables = {}, _variables[collectionName] = sendDoc, _variables);
    return {
      query: query,
      variables: variables
    };
  };

  return builder;
}
//# sourceMappingURL=query-builder-from-rx-schema.js.map