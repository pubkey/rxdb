import type { RxPlugin, RxQuery } from '../../types/index.d.ts';
export declare function runBuildingStep<RxDocumentType, RxQueryResult>(rxQuery: RxQuery<RxDocumentType, RxQueryResult>, functionName: string, value: any): RxQuery<RxDocumentType, RxQueryResult>;
export declare function applyBuildingStep(proto: any, functionName: string): void;
export * from './mquery/nosql-query-builder.ts';
export declare const RxDBQueryBuilderPlugin: RxPlugin;
