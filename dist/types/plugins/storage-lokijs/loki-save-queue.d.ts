import type { LokiDatabaseSettings } from '../../types';
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
    writesSinceLastRun: number;
    /**
     * Ensures that we do not run multiple saves
     * in parallel
     */
    saveQueue: Promise<void>;
    saveQueueC: number;
    constructor(lokiDatabase: Loki, databaseSettings: LokiDatabaseSettings);
    addWrite(): void;
    run(): Promise<void>;
}
