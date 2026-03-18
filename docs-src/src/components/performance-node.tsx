import React from 'react';
import PerformanceChart from './performance-chart';

import { browserMetrics, PerformanceData } from './performance-browser';

const nodeData: PerformanceData[] = [
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
        name: 'Memory',
        'time-to-first-insert': 0.999, 'insert-documents-500': 0.317, 'find-by-ids-3000': 4.305,
        'serial-inserts-50': 51.114, 'serial-find-by-id-50': 0.547, 'find-by-query': 2.307,
        'find-by-query-parallel-4': 3.224, '4x-count': 0.294
    }
];

export default function PerformanceNode() {
    return <PerformanceChart title="Node.js based storages" metrics={browserMetrics as any} data={nodeData} />;
}
