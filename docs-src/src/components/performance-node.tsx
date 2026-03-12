import React from 'react';
import PerformanceChart from './performance-chart';

const nodeMetrics = [
    { key: 'timeToFirstInsert', name: 'Time to first insert', color: '#FF8BE0' }, // Very Light Pink
    { key: 'insertDocsBulk', name: 'Insert docs (bulk)', color: '#ED168F' }, // Base Top
    { key: 'findByIdBulk', name: 'Find by ID (bulk)', color: '#FFB3DF' }, // Very Light Magenta
    { key: 'insertDocsSerial', name: 'Insert docs (serial)', color: '#DE48B8' }, // Light Magenta
    { key: 'findByIdSerial', name: 'Find by ID (serial)', color: '#b2218b' }, // Base Middle
    { key: 'findDocsQuery', name: 'Find docs by query', color: '#DA93E5' }, // Very Light Purple
    { key: 'findDocsQueryParallel', name: 'Find docs (parallel)', color: '#A94FBE' }, // Light Purple
    { key: 'countDocs', name: 'Count docs', color: '#FF59B9' } // Bright Pink
];

const nodeData = [
    {
        name: 'SQLite',
        timeToFirstInsert: 100, insertDocsBulk: 50, findByIdBulk: 20,
        insertDocsSerial: 150, findByIdSerial: 80, findDocsQuery: 100,
        findDocsQueryParallel: 90, countDocs: 10
    },
    {
        name: 'MongoDB',
        timeToFirstInsert: 200, insertDocsBulk: 150, findByIdBulk: 100,
        insertDocsSerial: 300, findByIdSerial: 200, findDocsQuery: 250,
        findDocsQueryParallel: 200, countDocs: 50
    }
];

export default function PerformanceNode() {
    return <PerformanceChart title="Node.js based storages" metrics={nodeMetrics} data={nodeData} />;
}
