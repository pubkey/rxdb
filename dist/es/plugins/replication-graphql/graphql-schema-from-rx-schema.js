import { getGraphqlFromJsonSchema } from 'get-graphql-from-jsonschema';
import { scalarTypes } from 'get-graphql-from-jsonschema/build/lib/scalarTypes';
import { fillWithDefaultSettings } from '../../rx-schema';
import { clone, ucfirst } from '../../util';
// we use two spaces because get-graphql-from-jsonschema does also
export var SPACING = '  ';
/**
 * TODO this is in beta mode,
 * use it at your own risk.
 * Fix bugs when you find them.
 */

export function graphQLSchemaFromRxSchema(input) {
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
    var prefixes = collectionSettings.prefixes;
    var ucCollectionName = ucfirst(collectionName);
    var collectionNameInput = ucfirst(collectionName) + 'Input'; // input

    var inputSchema = stripKeysFromSchema(schema, collectionSettings.ignoreInputKeys);
    var inputGraphQL = getGraphqlFromJsonSchema({
      rootName: collectionNameInput,
      schema: inputSchema,
      direction: 'input'
    });
    ret.inputs = ret.inputs.concat(inputGraphQL.typeDefinitions.map(function (str) {
      return replaceTopLevelTypeName(str, collectionNameInput);
    })); // output

    var outputSchema = stripKeysFromSchema(schema, collectionSettings.ignoreOutputKeys);
    var outputGraphQL = getGraphqlFromJsonSchema({
      rootName: collectionName,
      schema: outputSchema,
      direction: 'output'
    });
    ret.types = ret.types.concat(outputGraphQL.typeDefinitions.map(function (str) {
      return replaceTopLevelTypeName(str, ucCollectionName);
    })); // query

    var queryName = prefixes.feed + ucCollectionName;
    var queryKeys = collectionSettings.feedKeys.map(function (key) {
      var subSchema = schema.properties[key];
      var graphqlType = scalarTypes[subSchema.type];
      var keyString = key + ': ' + graphqlType + '';
      return keyString;
    });
    queryKeys.push('limit: Int!');
    var queryString = queryName + '(' + queryKeys.join(', ') + '): [' + ucCollectionName + '!]!';
    ret.queries.push(SPACING + queryString); // mutation

    var mutationName = prefixes.set + ucCollectionName;
    var mutationString = mutationName + '(' + collectionName + ': ' + collectionNameInput + '): ' + ucCollectionName;
    ret.mutations.push(SPACING + mutationString); // subscription

    var subscriptionParamsString = '';

    if (collectionSettings.subscriptionParams && Object.keys(collectionSettings.subscriptionParams).length > 0) {
      subscriptionParamsString = '(' + Object.entries(collectionSettings.subscriptionParams).map(function (_ref2) {
        var name = _ref2[0],
            type = _ref2[1];
        return name + ': ' + type;
      }).join(', ') + ')';
    }

    var subscriptionName = prefixes.changed + ucCollectionName;
    var subscriptionString = subscriptionName + subscriptionParamsString + ': ' + ucCollectionName;
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
export function fillUpOptionals(input) {
  var schema = fillWithDefaultSettings(input.schema); // strip internal attributes

  Object.keys(schema.properties).forEach(function (key) {
    if (key.startsWith('_')) {
      delete schema.properties[key];
    }
  });
  input.schema = schema; // add deleted flag to schema

  schema.properties[input.deletedFlag] = {
    type: 'boolean'
  };
  schema.required.push(input.deletedFlag); // fill up prefixes

  if (!input.prefixes) {
    input.prefixes = {};
  }

  var prefixes = input.prefixes;

  if (!prefixes.set) {
    prefixes.set = 'set';
  }

  if (!prefixes.feed) {
    prefixes.feed = 'feed';
  }

  if (!prefixes.changed) {
    prefixes.changed = 'changed';
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
  var cloned = clone(schema);
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