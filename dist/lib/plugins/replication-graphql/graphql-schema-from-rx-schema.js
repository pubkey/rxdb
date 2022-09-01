"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SPACING = void 0;
exports.fillUpOptionals = fillUpOptionals;
exports.graphQLSchemaFromRxSchema = graphQLSchemaFromRxSchema;

var _getGraphqlFromJsonschema = require("get-graphql-from-jsonschema");

var _rxSchemaHelper = require("../../rx-schema-helper");

var _util = require("../../util");

// we use two spaces because get-graphql-from-jsonschema does also
var SPACING = '  ';
/**
 * Create a GraphQL schema from a given RxJsonSchema
 */

exports.SPACING = SPACING;

function graphQLSchemaFromRxSchema(input) {
  var ret = {
    asString: '',
    queries: [],
    mutations: [],
    subscriptions: [],
    inputs: [],
    types: []
  };
  Object.entries(input).forEach(function (_ref) {
    var collectionName = _ref[0],
        collectionSettings = _ref[1];
    collectionSettings = fillUpOptionals(collectionSettings);
    var schema = collectionSettings.schema;
    var prefixes = (0, _util.ensureNotFalsy)(collectionSettings.prefixes);
    var ucCollectionName = (0, _util.ucfirst)(collectionName);
    var collectionNameInput = (0, _util.ucfirst)(collectionName) + 'Input'; // input

    var inputSchema = stripKeysFromSchema(schema, (0, _util.ensureNotFalsy)(collectionSettings.ignoreInputKeys));
    var inputGraphQL = (0, _getGraphqlFromJsonschema.getGraphqlSchemaFromJsonSchema)({
      rootName: collectionNameInput,
      schema: inputSchema,
      direction: 'input'
    });
    var pushRowGraphQL = (0, _getGraphqlFromJsonschema.getGraphqlSchemaFromJsonSchema)({
      rootName: collectionNameInput + prefixes.pushRow,
      schema: {
        type: 'object',
        properties: {
          assumedMasterState: inputSchema,
          newDocumentState: inputSchema
        },
        required: ['newDocumentState'],
        additionalProperties: false
      },
      direction: 'input'
    });
    var checkpointSchema = {
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false
    };
    collectionSettings.checkpointFields.forEach(function (key) {
      var subSchema = schema.properties[key];
      checkpointSchema.properties[key] = subSchema;
      checkpointSchema.required.push(key);
    });
    var checkpointInputGraphQL = (0, _getGraphqlFromJsonschema.getGraphqlSchemaFromJsonSchema)({
      rootName: collectionNameInput + prefixes.checkpoint,
      schema: checkpointSchema,
      direction: 'input'
    });
    var headersSchema = {
      type: 'object',
      additionalProperties: false,
      properties: {},
      required: []
    };
    (0, _util.ensureNotFalsy)(collectionSettings.headerFields).forEach(function (headerField) {
      headersSchema.properties[headerField] = {
        type: 'string'
      };
      headersSchema.required.push(headerField);
    });
    var headersInputName = collectionNameInput + prefixes.headers;
    var headersInputGraphQL = (0, _getGraphqlFromJsonschema.getGraphqlSchemaFromJsonSchema)({
      rootName: headersInputName,
      schema: headersSchema,
      direction: 'input'
    });
    ret.inputs = ret.inputs.concat(inputGraphQL.typeDefinitions.map(function (str) {
      return replaceTopLevelTypeName(str, collectionNameInput);
    })).concat(pushRowGraphQL.typeDefinitions.map(function (str) {
      return replaceTopLevelTypeName(str, collectionNameInput + prefixes.pushRow);
    })).concat(checkpointInputGraphQL.typeDefinitions.map(function (str) {
      return replaceTopLevelTypeName(str, collectionNameInput + prefixes.checkpoint);
    })).concat(headersInputGraphQL.typeDefinitions.map(function (str) {
      return replaceTopLevelTypeName(str, headersInputName);
    })); // output

    var outputSchema = stripKeysFromSchema(schema, (0, _util.ensureNotFalsy)(collectionSettings.ignoreOutputKeys));
    var outputGraphQL = (0, _getGraphqlFromJsonschema.getGraphqlSchemaFromJsonSchema)({
      rootName: collectionName,
      schema: outputSchema,
      direction: 'output'
    });
    var checkpointOutputGraphQL = (0, _getGraphqlFromJsonschema.getGraphqlSchemaFromJsonSchema)({
      rootName: ucCollectionName + prefixes.checkpoint,
      schema: checkpointSchema,
      direction: 'output'
    });
    var pullBulkOutputGraphQL = (0, _getGraphqlFromJsonschema.getGraphqlSchemaFromJsonSchema)({
      rootName: ucCollectionName + prefixes.pullBulk,
      schema: {
        type: 'object',
        properties: {
          documents: {
            type: 'array',
            items: inputSchema
          },
          checkpoint: checkpointSchema
        },
        required: ['documents', 'checkpoint'],
        additionalProperties: false
      },
      direction: 'output'
    });
    ret.types = ret.types.concat(outputGraphQL.typeDefinitions.map(function (str) {
      return replaceTopLevelTypeName(str, ucCollectionName);
    })).concat(checkpointOutputGraphQL.typeDefinitions.map(function (str) {
      return replaceTopLevelTypeName(str, ucCollectionName + prefixes.checkpoint);
    })).concat(pullBulkOutputGraphQL.typeDefinitions.map(function (str) {
      return replaceTopLevelTypeName(str, ucCollectionName + prefixes.pullBulk);
    })); // query

    var queryName = prefixes.pull + ucCollectionName;
    var queryKeys = ['checkpoint: ' + collectionNameInput + prefixes.checkpoint, 'limit: Int!'];
    var queryString = queryName + '(' + queryKeys.join(', ') + '): ' + ucCollectionName + prefixes.pullBulk + '!';
    ret.queries.push(SPACING + queryString); // mutation

    var mutationName = prefixes.push + ucCollectionName;
    var mutationString = mutationName + '(' + collectionName + prefixes.pushRow + ': [' + collectionNameInput + prefixes.pushRow + ']): [' + ucCollectionName + '!]!';
    ret.mutations.push(SPACING + mutationString); // subscription

    var subscriptionHeaderInputString = '';

    if (collectionSettings.headerFields && collectionSettings.headerFields.length > 0) {
      subscriptionHeaderInputString = '(headers: ' + headersInputName + ')';
    }

    var subscriptionName = prefixes.stream + ucCollectionName;
    var subscriptionString = subscriptionName + subscriptionHeaderInputString + ': ' + ucCollectionName + prefixes.pullBulk + '!';
    ret.subscriptions.push(SPACING + subscriptionString);
  }); // build full string

  var fullQueryString = 'type Query {\n' + ret.queries.join('\n') + '\n}\n';
  var fullMutationString = 'type Mutation {\n' + ret.mutations.join('\n') + '\n}\n';
  var fullSubscriptionString = 'type Subscription {\n' + ret.subscriptions.join('\n') + '\n}\n';
  var fullTypeString = ret.types.join('\n');
  var fullInputString = ret.inputs.join('\n');
  var fullSchemaString = '' + 'schema {\n' + SPACING + 'query: Query\n' + SPACING + 'mutation: Mutation\n' + SPACING + 'subscription: Subscription\n' + '}\n';
  ret.asString = '' + fullQueryString + '\n' + fullMutationString + '\n' + fullSubscriptionString + '\n' + fullTypeString + '\n' + fullInputString + '\n' + fullSchemaString;
  return ret;
}

function fillUpOptionals(input) {
  input = (0, _util.flatClone)(input);
  var schema = (0, _rxSchemaHelper.fillWithDefaultSettings)(input.schema); // strip internal attributes

  Object.keys(schema.properties).forEach(function (key) {
    if (key.startsWith('_')) {
      delete schema.properties[key];
    }
  });
  input.schema = schema; // add deleted field to schema

  if (!input.deletedField) {
    input.deletedField = '_deleted';
  }

  schema.properties[input.deletedField] = {
    type: 'boolean'
  };
  schema.required.push(input.deletedField); // fill up prefixes

  if (!input.prefixes) {
    input.prefixes = {};
  }

  var prefixes = input.prefixes;

  if (!prefixes.push) {
    prefixes.push = 'push';
  }

  if (!prefixes.pushRow) {
    prefixes.pushRow = 'PushRow';
  }

  if (!prefixes.checkpoint) {
    prefixes.checkpoint = 'Checkpoint';
  }

  if (!prefixes.pull) {
    prefixes.pull = 'pull';
  }

  if (!prefixes.pullBulk) {
    prefixes.pullBulk = 'PullBulk';
  }

  if (!prefixes.stream) {
    prefixes.stream = 'stream';
  }

  if (!prefixes.headers) {
    prefixes.headers = 'Headers';
  }

  if (!input.headerFields) {
    input.headerFields = [];
  }

  if (!input.withRevisions) {
    input.withRevisions = false;
  }

  if (!input.ignoreInputKeys) {
    input.ignoreInputKeys = [];
  }

  if (!input.ignoreOutputKeys) {
    input.ignoreOutputKeys = [];
  }

  return input;
}

function stripKeysFromSchema(schema, strip) {
  var cloned = (0, _util.clone)(schema);
  strip.forEach(function (key) {
    delete cloned.properties[key];
  });
  return cloned;
}
/**
 * get-graphql-from-jsonschema add a T0-suffix
 * that we do not want for the top level type
 */


function replaceTopLevelTypeName(str, ucCollectionName) {
  return str.replace(' ' + ucCollectionName + 'T0 ', ' ' + ucCollectionName + ' ');
}
//# sourceMappingURL=graphql-schema-from-rx-schema.js.map