"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX = exports.DEFAULT_MODIFIER = void 0;
var GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX = 'rxdb-replication-graphql-'; // does nothing

exports.GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX = GRAPHQL_REPLICATION_PLUGIN_IDENTITY_PREFIX;

var DEFAULT_MODIFIER = function DEFAULT_MODIFIER(d) {
  return Promise.resolve(d);
};

exports.DEFAULT_MODIFIER = DEFAULT_MODIFIER;
//# sourceMappingURL=helper.js.map