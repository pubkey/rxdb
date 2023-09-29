import {
    filter,
    firstValueFrom,
    map
} from 'rxjs';
import { newRxError } from '../../rx-error';
import type {
    NumberFunctionMap,
    RxCollection,
    RxDatabase
} from '../../types';
import {
    MIGRATION_DEFAULT_BATCH_SIZE,
    MIGRATION_STATUS_DOC_PREFIX,
    addMigrationStateToDatabase,
    getOldCollectionMeta,
    mustMigrate
} from './migration-helpers';
import { ensureNotFalsy } from '../utils';
import type {
    RxMigrationStatus,
    RxMigrationStatusDocumentData
} from './migration-types';



export class RxMigrationState {

    public database: RxDatabase;


    private started: boolean = false;
    public readonly mustMigrate: Promise<boolean>;


    public status: RxMigrationStatus = {
        status: 'NOT-STARTED',
        count: {
            handled: 0,
            percent: 0,
            purged: 0,
            success: 0,
            total: -1
        }
    };
    constructor(
        public readonly collection: RxCollection,
        public readonly migrationStrategies: NumberFunctionMap,
        public readonly statusDocId = [
            MIGRATION_STATUS_DOC_PREFIX,
            collection.name,
            'v',
            collection.schema.version
        ].join('-'),
    ) {
        this.database = collection.database;
        this.mustMigrate = mustMigrate(this);
    }

    get $() {
        return this.database
            .getLocal$<RxMigrationStatusDocumentData>(this.statusDocId)
            .pipe(
                filter(d => !!d),
                map(d => ensureNotFalsy(d)._data.data)
            );
    }

    async startMigration(_batchSize: number = MIGRATION_DEFAULT_BATCH_SIZE): Promise<RxMigrationState> {
        const must = await this.mustMigrate;
        if (!must) {
            return this;
        }
        if (this.started) {
            throw newRxError('DM1');
        }
        this.started = true;



        const oldCollectionMeta = await getOldCollectionMeta(this);
        console.dir(oldCollectionMeta);




        /**
         * Add to output of RxDatabase.migrationStates
         */
        addMigrationStateToDatabase(this);

        return null as any; // TODO
    }

    async migratePromise(batchSize?: number): Promise<any> {
        this.startMigration(batchSize);
        const must = await this.mustMigrate;
        if (!must) {
            return;
        }
        return firstValueFrom(
            this.$.pipe(
                filter(d => d.status === 'DONE')
            )
        );

    }
}
