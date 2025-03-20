import type { WithDeleted } from '../../types';

export function appwriteDocToRxDB<RxDocType>(
    appwriteDoc: any,
    primaryKey: string,
    deletedField: string

): WithDeleted<RxDocType> {
    const useDoc: any = {};
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
