import type { WithDeleted } from '../../types';
export declare const DEFAULT_MODIFIER: (d: any) => Promise<any>;
export declare function swapDefaultDeletedTodeletedField<RxDocType>(deletedField: string, doc: WithDeleted<RxDocType>): RxDocType;
export declare function swapdeletedFieldToDefaultDeleted<RxDocType>(deletedField: string, doc: RxDocType): WithDeleted<RxDocType>;
