import React from 'react';
import PerformanceChart from './performance-chart';

export const browserMetrics = [
    { key: 'time-to-first-insert', name: 'Time to first insert', color: '#FF8BE0' }, // Very Light Pink
    { key: 'insert-documents-500', name: 'Insert 500 docs (bulk)', color: '#ED168F' }, // Base Top
    { key: 'find-by-ids-3000', name: 'Find 3000 docs by ID (bulk)', color: '#FFB3DF' }, // Very Light Magenta
    { key: 'serial-inserts-50', name: 'Insert 50 docs (serial)', color: '#DE48B8' }, // Light Magenta
    { key: 'serial-find-by-id-50', name: 'Find 50 docs by ID (serial)', color: '#b2218b' }, // Base Middle
    { key: 'find-by-query', name: 'Find 3000 docs by query', color: '#DA93E5' }, // Very Light Purple
    { key: 'find-by-query-parallel-4', name: 'Run 4 Queries in parallel, 750 docs each', color: '#A94FBE' }, // Light Purple
    { key: '4x-count', name: 'Count 300 docs (4x)', color: '#FF59B9' } // Bright Pink
] as const;

export type MetricsKey = typeof browserMetrics[number]['key'];

export type PerformanceData = {
    name: string;
} & {
    [K in MetricsKey]: number;
};

const browserData: PerformanceData[] = [
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

export default function PerformanceBrowser() {
    return <PerformanceChart title="Browser based storages" metrics={browserMetrics as any} data={browserData} />;
}
