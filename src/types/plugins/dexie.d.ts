import {
    Dexie,
    DexieOptions,
    Table as DexieTable
} from 'dexie';

export type DexieSettings = DexieOptions;

export type DexieStorageInternals = {
    dexieDb: Dexie;
    dexieTable: DexieTable;
};
