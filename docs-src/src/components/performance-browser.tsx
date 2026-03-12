import React from 'react';
import PerformanceChart from './performance-chart';

const browserMetrics = [
    { key: 'timeToFirstInsert', name: 'Time to first insert', color: '#FF8BE0' }, // Very Light Pink
    { key: 'insertDocsBulk', name: 'Insert docs (bulk)', color: '#ED168F' }, // Base Top
    { key: 'findByIdBulk', name: 'Find by ID (bulk)', color: '#FFB3DF' }, // Very Light Magenta
    { key: 'insertDocsSerial', name: 'Insert docs (serial)', color: '#DE48B8' }, // Light Magenta
    { key: 'findByIdSerial', name: 'Find by ID (serial)', color: '#b2218b' }, // Base Middle
    { key: 'findDocsQuery', name: 'Find docs by query', color: '#DA93E5' }, // Very Light Purple
    { key: 'findDocsQueryParallel', name: 'Find docs (parallel)', color: '#A94FBE' }, // Light Purple
    { key: 'countDocs', name: 'Count docs', color: '#FF59B9' } // Bright Pink
];

const browserData = [
    {
        name: 'IndexedDB',
        timeToFirstInsert: 150, insertDocsBulk: 80, findByIdBulk: 40,
        insertDocsSerial: 200, findByIdSerial: 100, findDocsQuery: 150,
        findDocsQueryParallel: 140, countDocs: 20
    },
    {
        name: 'OPFS',
        timeToFirstInsert: 200, insertDocsBulk: 60, findByIdBulk: 30,
        insertDocsSerial: 250, findByIdSerial: 120, findDocsQuery: 100,
        findDocsQueryParallel: 90, countDocs: 15
    },
    {
        name: 'Memory-mapped',
        timeToFirstInsert: 50, insertDocsBulk: 30, findByIdBulk: 20,
        insertDocsSerial: 40, findByIdSerial: 25, findDocsQuery: 40,
        findDocsQueryParallel: 35, countDocs: 5
    },
    {
        name: 'WebSQL',
        timeToFirstInsert: 180, insertDocsBulk: 90, findByIdBulk: 45,
        insertDocsSerial: 220, findByIdSerial: 110, findDocsQuery: 160,
        findDocsQueryParallel: 150, countDocs: 30
    },
    {
        name: 'LokiJS',
        timeToFirstInsert: 60, insertDocsBulk: 35, findByIdBulk: 25,
        insertDocsSerial: 50, findByIdSerial: 30, findDocsQuery: 45,
        findDocsQueryParallel: 40, countDocs: 8
    },
    {
        name: 'Dexie',
        timeToFirstInsert: 140, insertDocsBulk: 75, findByIdBulk: 35,
        insertDocsSerial: 190, findByIdSerial: 95, findDocsQuery: 140,
        findDocsQueryParallel: 130, countDocs: 18
    }
];

export default function PerformanceBrowser() {
    return <PerformanceChart title="Browser based storages" metrics={browserMetrics} data={browserData} />;
}
