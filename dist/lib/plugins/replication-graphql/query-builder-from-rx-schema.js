"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.pullQueryBuilderFromRxSchema = pullQueryBuilderFromRxSchema;
exports.pushQueryBuilderFromRxSchema = pushQueryBuilderFromRxSchema;

var _graphqlSchemaFromRxSchema = require("./graphql-schema-from-rx-schema");

var _util = require("../../util");

var _rxError = require("../../rx-error");

var _rxSchema = require("../../rx-schema");

function pullQueryBuilderFromRxSchema(collectionName, input, batchSize) {
  input = (0, _graphqlSchemaFromRxSchema.fillUpOptionals)(input);
  var schema = input.schema;
  var prefixes = input.prefixes;
  var ucCollectionName = (0, _util.ucfirst)(collectionName);
  var queryName = prefixes.feed + ucCollectionName;
  var outputFields = Object.keys(schema.properties).filter(function (k) {
    return !input.ignoreOutputKeys.includes(k);
  });
  outputFields.push(input.deletedFlag);

  var builder = function builder(doc) {
    var queryKeys = input.feedKeys.map(function (key) {
      var subSchema = schema.properties[key];

      if (!subSchema) {
        throw (0, _rxError.newRxError)('GQL1', {
          document: doc,
          schema: schema,
          key: key,
          args: {
            feedKeys: input.feedKeys
          }
        });
      }

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
    var query = '' + '{\n' + _graphqlSchemaFromRxSchema.SPACING + queryName + '(' + queryKeys.join(', ') + ') {\n' + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + outputFields.join('\n' + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING) + '\n' + _graphqlSchemaFromRxSchema.SPACING + '}\n' + '}';
    return {
      query: query,
      variables: {}
    };
  };

  return builder;
}

function pushQueryBuilderFromRxSchema(collectionName, input) {
  var primaryKey = (0, _rxSchema.getPrimaryFieldOfPrimaryKey)(input.schema.primaryKey);
  input = (0, _graphqlSchemaFromRxSchema.fillUpOptionals)(input);
  var prefixes = input.prefixes;
  var ucCollectionName = (0, _util.ucfirst)(collectionName);
  var queryName = prefixes.set + ucCollectionName;

  var builder = function builder(docs) {
    var _variables;

    var query = '' + 'mutation Set' + ucCollectionName + '($' + collectionName + ': [' + ucCollectionName + 'Input]) {\n' + _graphqlSchemaFromRxSchema.SPACING + queryName + '(' + collectionName + ': $' + collectionName + ') {\n' + _graphqlSchemaFromRxSchema.SPACING + _graphqlSchemaFromRxSchema.SPACING + primaryKey + '\n' + // GraphQL enforces to return at least one field
    _graphqlSchemaFromRxSchema.SPACING + '}\n' + '}';
    var sendDocs = [];
    docs.forEach(function (doc) {
      var sendDoc = {};
      Object.entries(doc).forEach(function (_ref) {
        var k = _ref[0],
            v = _ref[1];

        if ( // skip if in ignoreInputKeys list
        !input.ignoreInputKeys.includes(k) && // only use properties that are in the schema
        input.schema.properties[k]) {
          sendDoc[k] = v;
        }
      });
      sendDocs.push(sendDoc);
    });
    var variables = (_variables = {}, _variables[collectionName] = sendDocs, _variables);
    return {
      query: query,
      variables: variables
    };
  };

  return builder;
}
//# sourceMappingURL=query-builder-from-rx-schema.js.map