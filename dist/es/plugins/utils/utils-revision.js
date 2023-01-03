export function parseRevision(revision) {
  var split = revision.split('-');
  if (split.length !== 2) {
    throw new Error('malformated revision: ' + revision);
  }
  return {
    height: parseInt(split[0], 10),
    hash: split[1]
  };
}
export function getHeightOfRevision(revision) {
  return parseRevision(revision).height;
}

/**
 * Creates the next write revision for a given document.
 */
export function createRevision(databaseInstanceToken, previousDocData) {
  var previousRevision = previousDocData ? previousDocData._rev : null;
  var previousRevisionHeigth = previousRevision ? parseRevision(previousRevision).height : 0;
  var newRevisionHeight = previousRevisionHeigth + 1;
  return newRevisionHeight + '-' + databaseInstanceToken;
}
//# sourceMappingURL=utils-revision.js.map