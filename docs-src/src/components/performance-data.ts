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
    { key: 'insert-documents-500', name: 'Insert docs (bulk)', color: '#ED168F' }, // Base Top
    { key: 'find-by-ids-3000', name: 'Find by ID (bulk)', color: '#FFB3DF' }, // Very Light Magenta
    { key: 'serial-inserts-50', name: 'Insert docs (serial)', color: '#DE48B8' }, // Light Magenta
    { key: 'serial-find-by-id-50', name: 'Find by ID (serial)', color: '#b2218b' }, // Base Middle
    { key: 'find-by-query', name: 'Find docs by query', color: '#DA93E5' }, // Very Light Purple
    { key: 'find-by-query-parallel-4', name: 'Find docs (parallel)', color: '#A94FBE' }, // Light Purple
    { key: '4x-count', name: 'Count docs', color: '#FF59B9' } // Bright Pink
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

export const PERFORMANCE_DATA_NODE: RxStoragePerformanceMeasurement[] = [
    {
        name: 'SQLite',
        'time-to-first-insert': 100, 'insert-documents-500': 50, 'find-by-ids-3000': 20,
        'serial-inserts-50': 150, 'serial-find-by-id-50': 80, 'find-by-query': 100,
        'find-by-query-parallel-4': 90, '4x-count': 10
    },
    {
        name: 'MongoDB',
        'time-to-first-insert': 200, 'insert-documents-500': 150, 'find-by-ids-3000': 100,
        'serial-inserts-50': 300, 'serial-find-by-id-50': 200, 'find-by-query': 250,
        'find-by-query-parallel-4': 200, '4x-count': 50
    }
];
