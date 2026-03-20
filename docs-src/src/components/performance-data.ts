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

export const PERFORMANCE_DATA_BROWSER: RxStoragePerformanceMeasurement[] = [
    {
        name: 'IndexedDB',
        'time-to-first-insert': 150, 'insert-documents-500': 80, 'find-by-ids-3000': 40,
        'serial-inserts-50': 200, 'serial-find-by-id-50': 100, 'find-by-query': 150,
        'find-by-query-parallel-4': 140, '4x-count': 20
    },
    {
        name: 'OPFS',
        'time-to-first-insert': 200, 'insert-documents-500': 60, 'find-by-ids-3000': 30,
        'serial-inserts-50': 250, 'serial-find-by-id-50': 120, 'find-by-query': 100,
        'find-by-query-parallel-4': 90, '4x-count': 15
    },
    {
        name: 'Memory-mapped',
        'time-to-first-insert': 50, 'insert-documents-500': 30, 'find-by-ids-3000': 20,
        'serial-inserts-50': 40, 'serial-find-by-id-50': 25, 'find-by-query': 40,
        'find-by-query-parallel-4': 35, '4x-count': 5
    },
    {
        name: 'WebSQL',
        'time-to-first-insert': 180, 'insert-documents-500': 90, 'find-by-ids-3000': 45,
        'serial-inserts-50': 220, 'serial-find-by-id-50': 110, 'find-by-query': 160,
        'find-by-query-parallel-4': 150, '4x-count': 30
    },
    {
        name: 'LokiJS',
        'time-to-first-insert': 60, 'insert-documents-500': 35, 'find-by-ids-3000': 25,
        'serial-inserts-50': 50, 'serial-find-by-id-50': 30, 'find-by-query': 45,
        'find-by-query-parallel-4': 40, '4x-count': 8
    },
    {
        name: 'Dexie',
        'time-to-first-insert': 140, 'insert-documents-500': 75, 'find-by-ids-3000': 35,
        'serial-inserts-50': 190, 'serial-find-by-id-50': 95, 'find-by-query': 140,
        'find-by-query-parallel-4': 130, '4x-count': 18
    }
];


const PERFORMANCE_NODE_MEMORY: RxStoragePerformanceMeasurement = {
    name: 'Memory',
    'time-to-first-insert': 0.97,
    'insert-documents-500': 0.31,
    'find-by-ids-3000': 4.32,
    'serial-inserts-50': 51.44,
    'serial-find-by-id-50': 0.57,
    'find-by-query': 2.51,
    'find-by-query-parallel-4': 3.25,
    '4x-count': 0.29
};

export const PERFORMANCE_DATA_SERVER: RxStoragePerformanceMeasurement[] = [
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
    },
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
    PERFORMANCE_NODE_MEMORY
];

export const PERFORMANCE_DATA_NODE: RxStoragePerformanceMeasurement[] = [
    PERFORMANCE_NODE_MEMORY
];

export const PERFORMANCE_DATA_ENCRYPTION: RxStoragePerformanceMeasurement[] = [
    {
        name: 'CryptoJS',
        'time-to-first-insert': 2.1,
        'insert-documents-500': 263.1,
        'find-by-ids-3000': 727.31,
        'serial-inserts-50': 81.68,
        'serial-find-by-id-50': 13.5,
        'find-by-query': 739.91,
        'find-by-query-parallel-4': 726.94,
        '4x-count': 0.38
    },
    {
        'name': 'WebCrypto AES-GCM',
        'time-to-first-insert': 2.21,
        'insert-documents-500': 51.82,
        'find-by-ids-3000': 141.45,
        'serial-inserts-50': 54.05,
        'serial-find-by-id-50': 5.57,
        'find-by-query': 140.01,
        'find-by-query-parallel-4': 144.75,
        '4x-count': 0.38
    },
    {
        'name': 'WebCrypto AES-CBC',
        'time-to-first-insert': 2,
        'insert-documents-500': 43.62,
        'find-by-ids-3000': 113.15,
        'serial-inserts-50': 50.58,
        'serial-find-by-id-50': 3.53,
        'find-by-query': 110.19,
        'find-by-query-parallel-4': 108.76,
        '4x-count': 0.3,
    },
    {
        'name': 'WebCrypto AES-CTR',
        'time-to-first-insert': 1.98,
        'insert-documents-500': 46.26,
        'find-by-ids-3000': 134.05,
        'serial-inserts-50': 52.06,
        'serial-find-by-id-50': 4.39,
        'find-by-query': 128.64,
        'find-by-query-parallel-4': 124.82,
        '4x-count': 0.29,
    }
];
