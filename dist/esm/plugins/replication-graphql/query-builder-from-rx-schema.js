import { fillUpOptionals, SPACING } from "./graphql-schema-from-rx-schema.js";
import { ensureNotFalsy, ucfirst } from "../../plugins/utils/index.js";
export function pullQueryBuilderFromRxSchema(collectionName, input) {
  input = fillUpOptionals(input);
  var schema = input.schema;
  var prefixes = input.prefixes;
  var ucCollectionName = ucfirst(collectionName);
  var queryName = prefixes.pull + ucCollectionName;
  var operationName = ucfirst(queryName);
  var outputFields = generateGQLOutputFields({
    schema,
    ignoreOutputKeys: input.ignoreOutputKeys
  });
  // outputFields.push(input.deletedField);    

  var checkpointInputName = ucCollectionName + 'Input' + prefixes.checkpoint;
  var builder = (checkpoint, limit) => {
    var query = 'query ' + operationName + '($checkpoint: ' + checkpointInputName + ', $limit: Int!) {\n' + SPACING + SPACING + queryName + '(checkpoint: $checkpoint, limit: $limit) {\n' + SPACING + SPACING + SPACING + 'documents {\n' + outputFields + '\n' + SPACING + SPACING + SPACING + '}\n' + SPACING + SPACING + SPACING + 'checkpoint {\n' + SPACING + SPACING + SPACING + SPACING + input.checkpointFields.join('\n' + SPACING + SPACING + SPACING + SPACING) + '\n' + SPACING + SPACING + SPACING + '}\n' + SPACING + SPACING + '}\n' + '}';
    return {
      query,
      operationName,
      variables: {
        checkpoint,
        limit
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
  var queryName = prefixes.stream + ucCollectionName;
  var outputFields = generateGQLOutputFields({
    schema,
    ignoreOutputKeys: input.ignoreOutputKeys
  });
  var headersName = ucCollectionName + 'Input' + prefixes.headers;
  var query = 'subscription on' + ucfirst(ensureNotFalsy(prefixes.stream)) + '($headers: ' + headersName + ') {\n' + SPACING + queryName + '(headers: $headers) {\n' + SPACING + SPACING + SPACING + 'documents {\n' + outputFields + '\n' + SPACING + SPACING + SPACING + '}\n' + SPACING + SPACING + SPACING + 'checkpoint {\n' + SPACING + SPACING + SPACING + SPACING + input.checkpointFields.join('\n' + SPACING + SPACING + SPACING + SPACING) + '\n' + SPACING + SPACING + SPACING + '}\n' + SPACING + '}' + '}';
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
export function pushQueryBuilderFromRxSchema(collectionName, input) {
  input = fillUpOptionals(input);
  var prefixes = input.prefixes;
  var ucCollectionName = ucfirst(collectionName);
  var queryName = prefixes.push + ucCollectionName;
  var operationName = ucfirst(queryName);
  var variableName = collectionName + prefixes.pushRow;
  var returnFields = generateGQLOutputFields({
    schema: input.schema,
    spaceCount: 2
  });
  var builder = pushRows => {
    var query = '' + 'mutation ' + operationName + '($' + variableName + ': [' + ucCollectionName + 'Input' + prefixes.pushRow + '!]) {\n' + SPACING + queryName + '(' + variableName + ': $' + variableName + ') {\n' + returnFields + '\n' + SPACING + '}\n' + '}';
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
      operationName,
      variables
    };
  };
  return builder;
}
function generateGQLOutputFields(options) {
  var {
    schema,
    spaceCount = 4,
    depth = 0,
    ignoreOutputKeys = []
  } = options;
  var outputFields = [];
  var properties = schema.properties;
  var NESTED_SPACING = SPACING.repeat(depth);
  var LINE_SPACING = SPACING.repeat(spaceCount);
  for (var key in properties) {
    //only skipping top level keys that are in ignoreOutputKeys list
    if (ignoreOutputKeys.includes(key)) {
      continue;
    }
    var value = properties[key];
    if (value.type === "array" && value.items) {
      outputFields.push(LINE_SPACING + NESTED_SPACING + key + " {", generateGQLOutputFields({
        schema: value.items,
        spaceCount,
        depth: depth + 1
      }), LINE_SPACING + NESTED_SPACING + "}");
    }
    if (value.type === "object") {
      outputFields.push(LINE_SPACING + NESTED_SPACING + key + " {", generateGQLOutputFields({
        schema: value,
        spaceCount,
        depth: depth + 1
      }), LINE_SPACING + NESTED_SPACING + "}");
    } else {
      outputFields.push(LINE_SPACING + NESTED_SPACING + key);
    }
  }
  return outputFields.join('\n');
}
//# sourceMappingURL=query-builder-from-rx-schema.js.map