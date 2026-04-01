export type RxStoragePerformanceMeasurement = {
    name: string;
    'time-to-first-insert': number;
    'insert-documents-500': number;
    'find-by-ids-3000': number;
    'serial-inserts-50': number;
    'serial-find-by-id-50': number;
    'find-by-query': number;
    'find-by-query-parallel-4': number;
    '4x-count': number;
};

export const PERFORMANCE_METRICS = [
    { key: 'time-to-first-insert', name: 'Time to first insert', color: '#FF8BE0' }, // Very Light Pink
    { key: 'insert-documents-500', name: 'Insert 500 docs (bulk)', color: '#ED168F' }, // Base Top
    { key: 'find-by-ids-3000', name: 'Find 3000 docs by ID (bulk)', color: '#FFB3DF' }, // Very Light Magenta
    { key: 'serial-inserts-50', name: 'Insert 50 docs (serial)', color: '#DE48B8' }, // Light Magenta
    { key: 'serial-find-by-id-50', name: 'Find 50 docs by ID (serial)', color: '#b2218b' }, // Base Middle
    { key: 'find-by-query', name: 'Find 3000 docs by query', color: '#DA93E5' }, // Very Light Purple
    { key: 'find-by-query-parallel-4', name: 'Find 3000 docs by query (parallel)', color: '#A94FBE' }, // Light Purple
    { key: '4x-count', name: 'Count 3000 docs (4x)', color: '#FF59B9' } // Bright Pink
];

export const PERFORMANCE_BROWSER_INDEXEDDB: RxStoragePerformanceMeasurement = {
    name: 'IndexedDB',
    'time-to-first-insert': 5.7,
    'insert-documents-500': 9.67,
    'find-by-ids-3000': 67.7,
    'serial-inserts-50': 18.55,
    'serial-find-by-id-50': 7.9,
    'find-by-query': 58.7,
    'find-by-query-parallel-4': 43.45,
    '4x-count': 18.5,
};

export const PERFORMANCE_BROWSER_DEXIE: RxStoragePerformanceMeasurement = {
    'name': 'Dexie.js',
    'time-to-first-insert': 5.8,
    'insert-documents-500': 73.92,
    'find-by-ids-3000': 76.9,
    'serial-inserts-50': 39.8,
    'serial-find-by-id-50': 14.35,
    'find-by-query': 112.95,
    'find-by-query-parallel-4': 62.6,
    '4x-count': 23.75
};


const PERFORMANCE_NODE_MEMORY: RxStoragePerformanceMeasurement = {
    name: 'Memory',
    'time-to-first-insert': 1.25,
    'insert-documents-500': 0.31,
    'find-by-ids-3000': 5.37,
    'serial-inserts-50': 1.56,
    'serial-find-by-id-50': 0.55,
    'find-by-query': 2.82,
    'find-by-query-parallel-4': 4.02,
    '4x-count': 0.28,
};

const PERFORMANCE_BROWSER_MEMORY: RxStoragePerformanceMeasurement = {
    name: 'Memory',
    'time-to-first-insert': 0.9,
    'insert-documents-500': 0.27,
    'find-by-ids-3000': 3.8,
    'serial-inserts-50': 1.1,
    'serial-find-by-id-50': 0.5,
    'find-by-query': 2.4,
    'find-by-query-parallel-4': 3.3,
    '4x-count': 0.25,
};



export const PERFORMANCE_BROWSER_SHARDING_INDEXEDDB: RxStoragePerformanceMeasurement = {
    name: 'Sharding IndexedDB',
    'time-to-first-insert': 7.55,
    'insert-documents-500': 9.37,
    'find-by-ids-3000': 66.2,
    'serial-inserts-50': 24.65,
    'serial-find-by-id-50': 13.15,
    'find-by-query': 45.9,
    'find-by-query-parallel-4': 39.15,
    '4x-count': 21.2,
};

const PERFORMANCE_NODE_FILESYSTEM: RxStoragePerformanceMeasurement = {
    name: 'Filesystem Node.js',
    'time-to-first-insert': 3.33,
    'insert-documents-500': 5.78,
    'find-by-ids-3000': 22.04,
    'serial-inserts-50': 2.42,
    'serial-find-by-id-50': 5,
    'find-by-query': 19.37,
    'find-by-query-parallel-4': 21.08,
    '4x-count': 1.83
};

const PERFORMANCE_NODE_SQLITE_NATIVE: RxStoragePerformanceMeasurement = {
    name: 'SQLite (node:sqlite)',
    'time-to-first-insert': 5.2,
    'insert-documents-500': 8.62,
    'find-by-ids-3000': 26.41,
    'serial-inserts-50': 10.84,
    'serial-find-by-id-50': 2.67,
    'find-by-query': 19.68,
    'find-by-query-parallel-4': 20.38,
    '4x-count': 2.01,
};



const PERFORMANCE_EXPO_FS_ASYNC: RxStoragePerformanceMeasurement = {
    name: 'Expo Fs (Async)',
    'time-to-first-insert': 55.72,
    'insert-documents-500': 13.79,
    'find-by-ids-3000': 156.88,
    'serial-inserts-50': 8.85,
    'serial-find-by-id-50': 15.42,
    'find-by-query': 191.86,
    'find-by-query-parallel-4': 177.5,
    '4x-count': 5.04,
};

const PERFORMANCE_EXPO_FS_SYNC: RxStoragePerformanceMeasurement = {
    name: 'Expo Fs (Sync)',
    'time-to-first-insert': 72.37,
    'insert-documents-500': 10.14,
    'find-by-ids-3000': 182.04,
    'serial-inserts-50': 10.79,
    'serial-find-by-id-50': 18.64,
    'find-by-query': 219.94,
    'find-by-query-parallel-4': 222.14,
    '4x-count': 3.82,
};

const PERFORMANCE_EXPO_SQLITE: RxStoragePerformanceMeasurement = {
    name: 'Expo SQLite',
    'time-to-first-insert': 53.28,
    'insert-documents-500': 116.79,
    'find-by-ids-3000': 336.17,
    'serial-inserts-50': 13.54,
    'serial-find-by-id-50': 19.08,
    'find-by-query': 333.83,
    'find-by-query-parallel-4': 339.58,
    '4x-count': 2.67,
};

export const PERFORMANCE_DATA_EXPO: RxStoragePerformanceMeasurement[] = [
    PERFORMANCE_EXPO_FS_ASYNC,
    PERFORMANCE_EXPO_FS_SYNC,
    PERFORMANCE_EXPO_SQLITE
];


export const PERFORMANCE_OPFS_WORKER: RxStoragePerformanceMeasurement = {
    name: 'OPFS (Worker)',
    'time-to-first-insert': 27.2,
    'insert-documents-500': 10.32,
    'find-by-ids-3000': 24.5,
    'serial-inserts-50': 7.4,
    'serial-find-by-id-50': 8.25,
    'find-by-query': 21.2,
    'find-by-query-parallel-4': 35.8,
    '4x-count': 2.95,
};

export const PERFORMANCE_OPFS_MAIN_THREAD: RxStoragePerformanceMeasurement = {
    name: 'OPFS (Main-Thread)',
    'time-to-first-insert': 4,
    'insert-documents-500': 8.09,
    'find-by-ids-3000': 21.15,
    'serial-inserts-50': 1.7,
    'serial-find-by-id-50': 29.85,
    'find-by-query': 21.15,
    'find-by-query-parallel-4': 23.8,
    '4x-count': 2.35
};

export const PERFORMANCE_DATA_OPFS: RxStoragePerformanceMeasurement[] = [
    PERFORMANCE_OPFS_WORKER,
    PERFORMANCE_OPFS_MAIN_THREAD
];

export const PERFORMANCE_DATA_BROWSER: RxStoragePerformanceMeasurement[] = [
    PERFORMANCE_OPFS_WORKER,
    PERFORMANCE_OPFS_MAIN_THREAD,
    PERFORMANCE_BROWSER_INDEXEDDB,
    PERFORMANCE_BROWSER_DEXIE,
    PERFORMANCE_BROWSER_MEMORY,

];




export const PERFORMANCE_DATA_SERVER: RxStoragePerformanceMeasurement[] = [
    {
        name: 'FoundationDB',
        'time-to-first-insert': 6.38,
        'insert-documents-500': 34.92,
        'find-by-ids-3000': 43.14,
        'serial-inserts-50': 82.62,
        'serial-find-by-id-50': 22.41,
        'find-by-query': 51.51,
        'find-by-query-parallel-4': 44.53,
        '4x-count': 57.41
    },
    {
        name: 'MongoDB',
        'time-to-first-insert': 276.906,
        'insert-documents-500': 47.497,
        'find-by-ids-3000': 57.31,
        'serial-inserts-50': 209.467,
        'serial-find-by-id-50': 23.09,
        'find-by-query': 42.315,
        'find-by-query-parallel-4': 38.854,
        '4x-count': 6.898
    }
];

export const PERFORMANCE_DATA_NODE: RxStoragePerformanceMeasurement[] = [
    PERFORMANCE_NODE_FILESYSTEM,
    PERFORMANCE_NODE_SQLITE_NATIVE,
    PERFORMANCE_NODE_MEMORY,
];

export const PERFORMANCE_DATA_VALIDATION_INDEXEDDB = [
    { name: 'no validator', 'time-to-first-insert': 68, 'insert-3000-documents': 213 },
    { name: 'ajv', 'time-to-first-insert': 67, 'insert-3000-documents': 216 },
    { name: 'z-schema', 'time-to-first-insert': 71, 'insert-3000-documents': 230 },
];

export const PERFORMANCE_DATA_VALIDATION_MEMORY = [
    { name: 'no validator', 'time-to-first-insert': 1.15, 'insert-3000-documents': 0.8 },
    { name: 'ajv', 'time-to-first-insert': 3.05, 'insert-3000-documents': 2.7 },
    { name: 'z-schema', 'time-to-first-insert': 0.9, 'insert-3000-documents': 18 },
];

export const PERFORMANCE_DATA_ENCRYPTION: RxStoragePerformanceMeasurement[] = [
    {
        'name': 'WebCrypto AES-CBC',
        'time-to-first-insert': 2.21,
        'insert-documents-500': 43.83,
        'find-by-ids-3000': 111.83,
        'serial-inserts-50': 52.51,
        'serial-find-by-id-50': 3.68,
        'find-by-query': 106.1,
        'find-by-query-parallel-4': 103.92,
        '4x-count': 0.3,
    },
    {
        'name': 'WebCrypto AES-GCM',
        'time-to-first-insert': 2.53,
        'insert-documents-500': 51.16,
        'find-by-ids-3000': 139.59,
        'serial-inserts-50': 58.18,
        'serial-find-by-id-50': 4.32,
        'find-by-query': 137.18,
        'find-by-query-parallel-4': 143.39,
        '4x-count': 0.38,
    },
    {
        'name': 'WebCrypto AES-CTR',
        'time-to-first-insert': 2.45,
        'insert-documents-500': 45.94,
        'find-by-ids-3000': 130.18,
        'serial-inserts-50': 49.56,
        'serial-find-by-id-50': 3.96,
        'find-by-query': 127.24,
        'find-by-query-parallel-4': 128.55,
        '4x-count': 0.3,
    },
    {
        name: 'CryptoJS',
        'time-to-first-insert': 2.04,
        'insert-documents-500': 262.7,
        'find-by-ids-3000': 723.46,
        'serial-inserts-50': 31.4,
        'serial-find-by-id-50': 13.62,
        'find-by-query': 734.1,
        'find-by-query-parallel-4': 724.62,
        '4x-count': 0.38,
    },
];


