export function appwriteDocToRxDB(appwriteDoc, primaryKey, deletedField) {
  var useDoc = {};
  Object.keys(appwriteDoc).forEach(key => {
    if (!key.startsWith('$')) {
      useDoc[key] = appwriteDoc[key];
    }
  });
  useDoc[primaryKey] = appwriteDoc.$id;
  useDoc._deleted = appwriteDoc[deletedField];
  if (deletedField !== '_deleted') {
    delete useDoc[deletedField];
  }
  return useDoc;
}
//# sourceMappingURL=appwrite-helpers.js.map