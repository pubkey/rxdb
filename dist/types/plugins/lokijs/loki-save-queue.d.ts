import { IdleQueue } from 'custom-idle-queue';
import { LokiDatabaseSettings } from '../../types';
/**
 * The autosave feature of lokijs has strange behaviors
 * and often runs a save in critical moments when other
 * more important tasks are running.
 * So instead we use a custom save queue that ensures we
 * only run loki.saveDatabase() when nothing else is running.
 */
export declare class LokiSaveQueue {
    readonly lokiDatabase: Loki;
    readonly databaseSettings: LokiDatabaseSettings;
    readonly rxDatabaseIdleQueue: IdleQueue;
    writesSinceLastRun: number;
    readonly runningSavesIdleQueue: IdleQueue;
    constructor(lokiDatabase: Loki, databaseSettings: LokiDatabaseSettings, rxDatabaseIdleQueue: IdleQueue);
    addWrite(): void;
    run(): Promise<any>;
}
