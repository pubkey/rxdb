import type { WithDeleted } from '../../types';
export declare function appwriteDocToRxDB<RxDocType>(appwriteDoc: any, primaryKey: string, deletedField: string): WithDeleted<RxDocType>;
