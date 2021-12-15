import { LokiDatabaseSettings } from '../../types';
import {
    promiseWait,
    PROMISE_RESOLVE_VOID,
    requestIdlePromise
} from '../../util';

/**
 * The autosave feature of lokijs has strange behaviors
 * and often runs a save in critical moments when other
 * more important tasks are running.
 * So instead we use a custom save queue that ensures we
 * only run loki.saveDatabase() when nothing else is running.
 */
export class LokiSaveQueue {
    public writesSinceLastRun: number = 0;

    /**
     * Ensures that we do not run multiple saves
     * in parallel
     */
    public saveQueue: Promise<void> = PROMISE_RESOLVE_VOID;
    // track amount of non-finished save calls in the queue.
    public saveQueueC = 0;

    constructor(
        public readonly lokiDatabase: Loki,
        public readonly databaseSettings: LokiDatabaseSettings
    ) {

    }

    public addWrite() {
        this.writesSinceLastRun = this.writesSinceLastRun + 1;
        this.run();
    }

    public async run() {
        if (
            // no persistence adapter given, so we do not need to save
            !this.databaseSettings.adapter ||
            // do not add more then two pending calls to the queue.
            this.saveQueueC > 2

        ) {
            return this.saveQueue;
        }

        this.saveQueueC = this.saveQueueC + 1;
        this.saveQueue = this.saveQueue
            .then(async () => {

                /**
                 * Always wait at least 100ms
                 * and until the JavaScript process is idle.
                 * This ensures that CPU blocking writes are finished
                 * before we proceed.
                 */
                await Promise.all([
                    requestIdlePromise(),
                    promiseWait(100)
                ]);

                // no write happened since the last save call
                if (this.writesSinceLastRun === 0) {
                    return;
                }

                /**
                 * Because LokiJS is a in-memory database,
                 * we can just wait until the JavaScript process is idle
                 * via requestIdlePromise(). Then we know that nothing important
                 * is running at the moment. Also we wait at least wait 100ms
                 * to ensure it has enough time to free up stuff.
                 */
                await Promise.all([
                    requestIdlePromise(),
                    promiseWait(100)
                ]);
                await requestIdlePromise();

                if (this.writesSinceLastRun === 0) {
                    return;
                }

                const writeAmount = this.writesSinceLastRun;
                this.writesSinceLastRun = 0;
                return new Promise<void>((res, rej) => {
                    this.lokiDatabase.saveDatabase(err => {
                        if (err) {
                            this.writesSinceLastRun = this.writesSinceLastRun + writeAmount;
                            rej(err);
                        } else {
                            if (this.databaseSettings.autosaveCallback) {
                                this.databaseSettings.autosaveCallback();
                            }
                            res();
                        }
                    });
                });

            })
            .catch(() => { })
            .then(() => {
                this.saveQueueC = this.saveQueueC - 1;
            });
        return this.saveQueue;
    }
}
