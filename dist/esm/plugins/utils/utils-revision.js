export function parseRevision(revision) {
  var split = revision.split('-');
  if (split.length !== 2) {
    throw new Error('malformatted revision: ' + revision);
  }
  return {
    height: parseInt(split[0], 10),
    hash: split[1]
  };
}

/**
 * @hotPath
 */
export function getHeightOfRevision(revision) {
  var ret = parseInt(revision.split('-')[0], 10);
  return ret;
}

/**
 * Creates the next write revision for a given document.
 */
export function createRevision(databaseInstanceToken, previousDocData) {
  var previousRevision = previousDocData ? previousDocData._rev : null;
  var previousRevisionHeight = previousRevision ? parseRevision(previousRevision).height : 0;
  var newRevisionHeight = previousRevisionHeight + 1;
  return newRevisionHeight + '-' + databaseInstanceToken;
}
//# sourceMappingURL=utils-revision.js.map