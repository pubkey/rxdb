"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.cosineSimilarity = cosineSimilarity;
exports.euclideanDistance = euclideanDistance;
exports.jaccardSimilarity = jaccardSimilarity;
exports.manhattanDistance = manhattanDistance;
/**
 * Vector comparison methods
 * @link https://www.restack.io/p/vector-database-knowledge-answer-javascript-cat-ai
 * @returns 
 */
function euclideanDistance(A, B) {
  return Math.sqrt(A.reduce((sum, a, i) => sum + Math.pow(a - B[i], 2), 0));
}
function manhattanDistance(A, B) {
  return A.reduce((sum, a, i) => sum + Math.abs(a - B[i]), 0);
}
function cosineSimilarity(A, B) {
  var dotProduct = A.reduce((sum, a, i) => sum + a * B[i], 0);
  var magnitudeA = Math.sqrt(A.reduce((sum, a) => sum + a * a, 0));
  var magnitudeB = Math.sqrt(B.reduce((sum, b) => sum + b * b, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * @link https://github.com/vector5ai/vector5db/blob/main/src/metrics/JaccardSimilarity.ts
 */
function jaccardSimilarity(a, b) {
  var setA = new Set(a);
  var setB = new Set(b);
  var intersection = new Set([...setA].filter(x => setB.has(x))).size;
  var union = new Set([...setA, ...setB]).size;
  return 1 - intersection / union;
}
//# sourceMappingURL=vector-distance.js.map