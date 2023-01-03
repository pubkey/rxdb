"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.pullQueryBuilderFromRxSchema = pullQueryBuilderFromRxSchema;
exports.pullStreamBuilderFromRxSchema = pullStreamBuilderFromRxSchema;
exports.pushQueryBuilderFromRxSchema = pushQueryBuilderFromRxSchema;
var _graphqlSchemaFromRxSchema = require("./graphql-schema-from-rx-schema");
var _utils = require("../../plugins/utils");
function pullQueryBuilderFromRxSchema(collectionName, input) {
  input = (0, _graphqlSchemaFromRxSchema.fillUpOptionals)(input);
  var schema = input.schema;
  var prefixes = input.prefixes;
  var ucCollectionName = (0, _utils.ucfirst)(collectionName);
  var queryName = prefixes.pull + ucCollectionName;
  var outputFields = Object.keys(schema.properties).filter(k => !input.ignoreOutputKeys.includes(k));
  // outputFields.push(input.deletedField);

  var checkpointInputName = ucCollectionName + 'Input' + prefixes.checkpoint;
  var builder = (checkpoint, limit) => {
    var query = 'query ' + (0, _utils.ucfirst)(queryName) + '($checkpoint: ' + checkpointInputName + ', $limit: Int!) {\n' + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + queryName + '(checkpoint: $checkpoint, limit: $limit) {\n' + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + 'documents {\n' + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + outputFields.join('\n' + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING) + '\n' + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + '}\n' + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + 'checkpoint {\n' + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + input.checkpointFields.join('\n' + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING) + '\n' + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + '}\n' + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + '}\n' + '}';
    return {
      query,
      variables: {
        checkpoint,
        limit
      }
    };
  };
  return builder;
}
function pullStreamBuilderFromRxSchema(collectionName, input) {
  input = (0, _graphqlSchemaFromRxSchema.fillUpOptionals)(input);
  var schema = input.schema;
  var prefixes = input.prefixes;
  var ucCollectionName = (0, _utils.ucfirst)(collectionName);
  var outputFields = Object.keys(schema.properties).filter(k => !input.ignoreOutputKeys.includes(k));
  var headersName = ucCollectionName + 'Input' + prefixes.headers;
  var query = 'subscription on' + (0, _utils.ucfirst)((0, _utils.ensureNotFalsy)(prefixes.stream)) + '($headers: ' + headersName + ') {\n' + _graphqlSchemaFromRxSchema.SPACING + prefixes.stream + ucCollectionName + '(headers: $headers) {\n' + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + 'documents {\n' + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + outputFields.join('\n' + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING) + '\n' + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + '}\n' + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + 'checkpoint {\n' + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + input.checkpointFields.join('\n' + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING) + '\n' + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + '}\n' + _graphqlSchemaFromRxSchema.SPACING + '}' + '}';
  var builder = headers => {
    return {
      query,
      variables: {
        headers
      }
    };
  };
  return builder;
}
function pushQueryBuilderFromRxSchema(collectionName, input) {
  input = (0, _graphqlSchemaFromRxSchema.fillUpOptionals)(input);
  var prefixes = input.prefixes;
  var ucCollectionName = (0, _utils.ucfirst)(collectionName);
  var queryName = prefixes.push + ucCollectionName;
  var variableName = collectionName + prefixes.pushRow;
  var returnFields = Object.keys(input.schema.properties);
  var builder = pushRows => {
    var query = '' + 'mutation ' + prefixes.push + ucCollectionName + '($' + variableName + ': [' + ucCollectionName + 'Input' + prefixes.pushRow + '!]) {\n' + _graphqlSchemaFromRxSchema.SPACING + queryName + '(' + variableName + ': $' + variableName + ') {\n' + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + returnFields.join(',\n' + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING) + '\n' + _graphqlSchemaFromRxSchema.SPACING + '}\n' + '}';
    var sendRows = [];
    function transformPushDoc(doc) {
      var sendDoc = {};
      Object.entries(doc).forEach(([k, v]) => {
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
    pushRows.forEach(pushRow => {
      var newRow = {
        newDocumentState: transformPushDoc(pushRow.newDocumentState),
        assumedMasterState: pushRow.assumedMasterState ? transformPushDoc(pushRow.assumedMasterState) : undefined
      };
      sendRows.push(newRow);
    });
    var variables = {
      [variableName]: sendRows
    };
    return {
      query,
      variables
    };
  };
  return builder;
}
//# sourceMappingURL=query-builder-from-rx-schema.js.map