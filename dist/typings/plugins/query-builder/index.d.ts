import { RxPlugin } from '../../types/rx-plugin';
import { RxQuery } from '../../types';
export declare function runBuildingStep<RxDocumentType, RxQueryResult>(rxQuery: RxQuery<RxDocumentType, RxQueryResult>, functionName: string, value: any): RxQuery<RxDocumentType, RxQueryResult>;
export declare function applyBuildingStep(proto: any, functionName: string): void;
export declare const RxDBQueryBuilderPlugin: RxPlugin;
