import type { RxDatabase } from '../../types/index.d.ts';
export type CreateRxDatabaseFunctionType = (databaseName: string) => Promise<RxDatabase>;
export declare function setFlutterRxDatabaseConnector(createDB: CreateRxDatabaseFunctionType): void;
/**
 * Create a simple lokijs adapter so that we can persist string via flutter
 * @link https://github.com/techfort/LokiJS/blob/master/tutorials/Persistence%20Adapters.md#creating-your-own-basic-persistence-adapter
 */
export declare function getLokijsAdapterFlutter(): {
    loadDatabase(databaseName: string, callback: (v: string | Error) => {}): Promise<void>;
    saveDatabase(databaseName: string, dbstring: string, callback: (v: string | Error | null) => {}): Promise<void>;
};
