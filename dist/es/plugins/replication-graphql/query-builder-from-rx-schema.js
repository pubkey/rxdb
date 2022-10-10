import { fillUpOptionals, SPACING } from './graphql-schema-from-rx-schema';
import { ensureNotFalsy, ucfirst } from '../../util';
export function pullQueryBuilderFromRxSchema(collectionName, input) {
  input = fillUpOptionals(input);
  var schema = input.schema;
  var prefixes = input.prefixes;
  var ucCollectionName = ucfirst(collectionName);
  var queryName = prefixes.pull + ucCollectionName;
  var outputFields = Object.keys(schema.properties).filter(function (k) {
    return !input.ignoreOutputKeys.includes(k);
  });
  // outputFields.push(input.deletedField);

  var checkpointInputName = ucCollectionName + 'Input' + prefixes.checkpoint;
  var builder = function builder(checkpoint, limit) {
    var query = 'query ' + ucfirst(queryName) + '($checkpoint: ' + checkpointInputName + ', $limit: Int!) {\n' + SPACING + SPACING + queryName + '(checkpoint: $checkpoint, limit: $limit) {\n' + SPACING + SPACING + SPACING + 'documents {\n' + SPACING + SPACING + SPACING + SPACING + outputFields.join('\n' + SPACING + SPACING + SPACING + SPACING) + '\n' + SPACING + SPACING + SPACING + '}\n' + SPACING + SPACING + SPACING + 'checkpoint {\n' + SPACING + SPACING + SPACING + SPACING + input.checkpointFields.join('\n' + SPACING + SPACING + SPACING + SPACING) + '\n' + SPACING + SPACING + SPACING + '}\n' + SPACING + SPACING + '}\n' + '}';
    return {
      query: query,
      variables: {
        checkpoint: checkpoint,
        limit: limit
      }
    };
  };
  return builder;
}
export function pullStreamBuilderFromRxSchema(collectionName, input) {
  input = fillUpOptionals(input);
  var schema = input.schema;
  var prefixes = input.prefixes;
  var ucCollectionName = ucfirst(collectionName);
  var outputFields = Object.keys(schema.properties).filter(function (k) {
    return !input.ignoreOutputKeys.includes(k);
  });
  var headersName = ucCollectionName + 'Input' + prefixes.headers;
  var query = 'subscription on' + ucfirst(ensureNotFalsy(prefixes.stream)) + '($headers: ' + headersName + ') {\n' + SPACING + prefixes.stream + ucCollectionName + '(headers: $headers) {\n' + SPACING + SPACING + SPACING + 'documents {\n' + SPACING + SPACING + SPACING + SPACING + outputFields.join('\n' + SPACING + SPACING + SPACING + SPACING) + '\n' + SPACING + SPACING + SPACING + '}\n' + SPACING + SPACING + SPACING + 'checkpoint {\n' + SPACING + SPACING + SPACING + SPACING + input.checkpointFields.join('\n' + SPACING + SPACING + SPACING + SPACING) + '\n' + SPACING + SPACING + SPACING + '}\n' + SPACING + '}' + '}';
  var builder = function builder(headers) {
    return {
      query: query,
      variables: {
        headers: headers
      }
    };
  };
  return builder;
}
export function pushQueryBuilderFromRxSchema(collectionName, input) {
  input = fillUpOptionals(input);
  var prefixes = input.prefixes;
  var ucCollectionName = ucfirst(collectionName);
  var queryName = prefixes.push + ucCollectionName;
  var variableName = collectionName + prefixes.pushRow;
  var returnFields = Object.keys(input.schema.properties);
  var builder = function builder(pushRows) {
    var _variables;
    var query = '' + 'mutation ' + prefixes.push + ucCollectionName + '($' + variableName + ': [' + ucCollectionName + 'Input' + prefixes.pushRow + '!]) {\n' + SPACING + queryName + '(' + variableName + ': $' + variableName + ') {\n' + SPACING + SPACING + returnFields.join(',\n' + SPACING + SPACING) + '\n' + SPACING + '}\n' + '}';
    var sendRows = [];
    function transformPushDoc(doc) {
      var sendDoc = {};
      Object.entries(doc).forEach(function (_ref) {
        var k = _ref[0],
          v = _ref[1];
        if (
        // skip if in ignoreInputKeys list
        !input.ignoreInputKeys.includes(k) &&
        // only use properties that are in the schema
        input.schema.properties[k]) {
          sendDoc[k] = v;
        }
      });
      return sendDoc;
    }
    pushRows.forEach(function (pushRow) {
      var newRow = {
        newDocumentState: transformPushDoc(pushRow.newDocumentState),
        assumedMasterState: pushRow.assumedMasterState ? transformPushDoc(pushRow.assumedMasterState) : undefined
      };
      sendRows.push(newRow);
    });
    var variables = (_variables = {}, _variables[variableName] = sendRows, _variables);
    return {
      query: query,
      variables: variables
    };
  };
  return builder;
}
//# sourceMappingURL=query-builder-from-rx-schema.js.map