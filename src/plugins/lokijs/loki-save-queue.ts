import { IdleQueue } from 'custom-idle-queue';
import { promiseWait, requestIdlePromise } from '../../util';

/**
 * The autosave feature of lokijs has strange behaviors
 * and often runs a save in critical moments when other
 * more important tasks are running.
 * So instead we use a custom save queue that ensures we
 * only run loki.saveDatabase() when nothing else is running.
 */
export class LokiSaveQueue {
    public writesSinceLastRun: number = 0;
    public readonly runningSavesIdleQueue: IdleQueue = new IdleQueue(1);

    constructor(
        public readonly lokiDatabase: Loki,
        public readonly rxDatabaseIdleQueue: IdleQueue
    ) {

    }

    public addWrite() {
        this.writesSinceLastRun = this.writesSinceLastRun + 1;
        this.run();
    }

    public async run() {
        if (this.writesSinceLastRun === 0) {
            return;
        }

        await Promise.all([
            requestIdlePromise(),
            promiseWait(100)
        ]);
        while (
            (
                !this.rxDatabaseIdleQueue.isIdle() ||
                !this.runningSavesIdleQueue.isIdle()
            ) && this.writesSinceLastRun !== 0
        ) {
            await requestIdlePromise();
            await Promise.all([
                this.rxDatabaseIdleQueue.requestIdlePromise(),
                this.runningSavesIdleQueue.requestIdlePromise(),
                promiseWait(100)
            ]);
        }

        if (this.writesSinceLastRun === 0) {
            return;
        }
        const writeAmount = this.writesSinceLastRun;
        this.writesSinceLastRun = 0;

        return this.runningSavesIdleQueue.requestIdlePromise().then(() => {
            return this.runningSavesIdleQueue.wrapCall(
                () => {
                    return new Promise<void>((res, rej) => {
                        this.lokiDatabase.saveDatabase(err => {
                            if (err) {
                                this.writesSinceLastRun = this.writesSinceLastRun + writeAmount;
                                rej(err);
                            } else {
                                res();
                            }
                        });
                    })
                }
            );
        })
    }
}
