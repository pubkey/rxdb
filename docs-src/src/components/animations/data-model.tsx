import React from 'react';

const COLLECTIONS = [
    {
        name: 'todos',
        x: 18,
        width: 123,
        docs: [
            { id: 'todo1', name: 'Learn RxDB' },
            { id: 'todo2', name: 'Buy groceries' },
            { id: 'todo3', name: 'Set up replication' }
        ]
    },
    {
        name: 'assignees',
        x: 147,
        width: 79,
        docs: [
            { id: 'alice', name: 'Alice' },
            { id: 'bob', name: 'Bob' }
        ]
    }
];
const DOC_Y = [58, 88, 118];
const MORE = { x: 232, width: 50 };
const STORAGE_Y = 180;

const DOCS = COLLECTIONS.flatMap(c => c.docs.map((d, i) => ({
    ...d,
    x: c.x + 8,
    width: c.width - 16,
    y: DOC_Y[i]
})));

/**
 * The data model of RxDB: an RxDatabase contains RxCollections,
 * each RxCollection contains RxDocuments, and all data is stored
 * in the one RxStorage the database was created with. Documents are written one after another
 * and each write travels down into the storage.
 */
export function DataModel() {
    return (
        <div className="data-model">
            <style>{`
                .data-model { line-height: 0; }
                .data-model > svg { display: block; width: 100%; height: auto; }
                .data-model text { font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                .data-model .dm-box { fill: #141726; stroke: #262B40; stroke-width: 1.2; }
                .data-model .dm-col { fill: #1A1E30; stroke: #B2218B; stroke-width: 1.2; }
                .data-model .dm-label { fill: #A29DB6; font-size: 8px; letter-spacing: .06em; }
                .data-model .dm-name { fill: #FFFFFF; font-size: 8px; }
                .data-model .dm-doc rect { fill: #20243A; stroke: #752A8A; stroke-width: 1; }
                .data-model .dm-doc text { fill: #FFFFFF; font-size: 5.6px; white-space: pre; }
                .data-model .dm-doc .dm-json { fill: #A29DB6; }
                .data-model .dm-more { fill: none; stroke: #262B40; stroke-width: 1.2; stroke-dasharray: 4 3; }
                .data-model .dm-more-text { fill: #A29DB6; font-size: 6.2px; letter-spacing: .04em; }
                .data-model .dm-doc .dm-id { fill: #ED168F; }
                .data-model .dm-doc { animation: data-model-doc 4.8s cubic-bezier(.16, 1, .3, 1) infinite; }
                .data-model .dm-storage { fill: #ED168F; animation: data-model-storage 4.8s ease-out infinite; }
                .data-model .dm-storage-text { fill: #FFFFFF; font-size: 8px; letter-spacing: .04em; }
                .data-model .dm-pulse { fill: #ED168F; opacity: 0; animation: data-model-pulse 4.8s ease-in infinite; }
                @keyframes data-model-doc {
                    0% { opacity: 0; transform: translateY(-6px); }
                    10%, 85% { opacity: 1; transform: none; }
                    100% { opacity: 0; transform: none; }
                }
                @keyframes data-model-pulse {
                    0%, 10% { opacity: 0; transform: translateY(0); }
                    12% { opacity: 1; }
                    24% { opacity: 1; transform: translateY(var(--dm-fall)); }
                    26%, 100% { opacity: 0; transform: translateY(var(--dm-fall)); }
                }
                @keyframes data-model-storage {
                    0%, 22% { fill: #B2218B; }
                    30% { fill: #ED168F; }
                    100% { fill: #B2218B; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .data-model .dm-doc, .data-model .dm-storage { animation: none; }
                    .data-model .dm-pulse { animation: none; opacity: 0; }
                }
            `}</style>
            <svg
                viewBox="0 0 300 216"
                role="img"
                aria-label="RxDB data model: an RxDatabase contains RxCollections, here todos and assignees, and can hold more collections. Each RxCollection contains RxDocuments like todo1, todo2 and todo3 or alice and bob, and all documents are stored in the RxStorage of the database, here IndexedDB."
            >
                <rect className="dm-box" x="8" y="6" width="284" height="174" />
                <text className="dm-label" x="18" y="20">RxDatabase</text>
                <text className="dm-name" x="80" y="20">myDatabase</text>

                {COLLECTIONS.map(c => (
                    <g key={c.name}>
                        <rect className="dm-col" x={c.x} y="28" width={c.width} height="142" />
                        <text className="dm-label" x={c.x + 8} y="40">RxCollection</text>
                        <text className="dm-name" x={c.x + 8} y="51">{c.name}</text>
                    </g>
                ))}

                <rect className="dm-more" x={MORE.x} y="28" width={MORE.width} height="142" />
                <text className="dm-more-text" x={MORE.x + MORE.width / 2} y="96" textAnchor="middle">more</text>
                <text className="dm-more-text" x={MORE.x + MORE.width / 2} y="106" textAnchor="middle">collections</text>

                {DOCS.map((d, i) => (
                    <g
                        key={d.id}
                        className="dm-doc"
                        style={{ animationDelay: (i * 0.4) + 's' }}
                    >
                        <rect x={d.x} y={d.y} width={d.width} height="24" />
                        <text x={d.x + 5} y={d.y + 10}>
                            <tspan className="dm-json">{'{ id: '}</tspan>
                            <tspan className="dm-id">{'\'' + d.id + '\''}</tspan>
                            <tspan className="dm-json">,</tspan>
                        </text>
                        <text x={d.x + 5} y={d.y + 19}>
                            <tspan className="dm-json">{'  name: '}</tspan>
                            <tspan>{'\'' + d.name + '\''}</tspan>
                            <tspan className="dm-json">{' }'}</tspan>
                        </text>
                    </g>
                ))}

                {DOCS.map((d, i) => (
                    <circle
                        key={d.id}
                        className="dm-pulse"
                        cx={d.x + d.width - 6}
                        cy={d.y + 12}
                        r="3"
                        style={{
                            animationDelay: (i * 0.4) + 's',
                            ['--dm-fall' as string]: (STORAGE_Y + 6 - (d.y + 12)) + 'px'
                        } as React.CSSProperties}
                    />
                ))}

                <rect className="dm-storage" x="8" y={STORAGE_Y} width="284" height="30" />
                <text className="dm-storage-text" x="150" y={STORAGE_Y + 18.5} textAnchor="middle">RxStorage: IndexedDB</text>
            </svg>
        </div>
    );
}
