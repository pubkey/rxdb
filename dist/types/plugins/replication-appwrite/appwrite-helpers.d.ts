import type { WithDeleted, WithDeletedAndAttachments } from '../../types';
export declare function appwriteDocToRxDB<RxDocType>(appwriteDoc: any, primaryKey: string, deletedField: string): WithDeleted<RxDocType>;
export declare function rxdbDocToAppwrite<RxDocType>(rxdbDoc: WithDeletedAndAttachments<RxDocType>, primaryKey: string, deletedField: string): any;
