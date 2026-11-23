import React from 'react';

const DOCS = [
    { id: 'todo1', name: 'Learn RxDB', y: 52 },
    { id: 'todo2', name: 'Buy groceries', y: 84 },
    { id: 'todo3', name: 'Set up replication', y: 116 }
];

/**
 * The data model of RxDB: an RxDatabase contains RxCollections,
 * each RxCollection contains RxDocuments, and all data is stored
 * in the RxStorage below. Documents are written one after another
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
                .data-model .dm-more { fill: none; stroke: #262B40; stroke-width: 1.2; stroke-dasharray: 4 3; }
                .data-model .dm-label { fill: #A29DB6; font-size: 8px; letter-spacing: .06em; }
                .data-model .dm-name { fill: #FFFFFF; font-size: 8px; }
                .data-model .dm-doc rect { fill: #20243A; stroke: #752A8A; stroke-width: 1; }
                .data-model .dm-doc text { fill: #FFFFFF; font-size: 7.5px; }
                .data-model .dm-doc .dm-id { fill: #ED168F; }
                .data-model .dm-doc { animation: data-model-doc 4.8s cubic-bezier(.16, 1, .3, 1) infinite; }
                .data-model .dm-d2 { animation-delay: .4s; }
                .data-model .dm-d3 { animation-delay: .8s; }
                .data-model .dm-storage { fill: #ED168F; animation: data-model-storage 4.8s ease-out infinite; }
                .data-model .dm-storage-text { fill: #FFFFFF; font-size: 8px; letter-spacing: .04em; }
                .data-model .dm-pulse { fill: #ED168F; opacity: 0; animation: data-model-pulse 4.8s ease-in infinite; }
                .data-model .dm-p2 { animation-delay: .4s; }
                .data-model .dm-p3 { animation-delay: .8s; }
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
                viewBox="0 0 300 225"
                role="img"
                aria-label="RxDB data model: an RxDatabase contains RxCollections like todos, each RxCollection contains RxDocuments like todo1, todo2 and todo3, and all documents are stored in the RxStorage below."
            >
                <rect className="dm-box" x="8" y="6" width="284" height="174" rx="6" />
                <text className="dm-label" x="18" y="20">RxDatabase</text>
                <text className="dm-name" x="80" y="20">myDatabase</text>

                <rect className="dm-col" x="18" y="28" width="184" height="142" rx="5" />
                <text className="dm-label" x="28" y="42">RxCollection</text>
                <text className="dm-name" x="100" y="42">todos</text>
                {DOCS.map((d, i) => (
                    <g key={d.id} className={'dm-doc dm-d' + (i + 1)}>
                        <rect x="28" y={d.y} width="164" height="24" rx="4" />
                        <text className="dm-id" x="36" y={d.y + 15}>{d.id}</text>
                        <text x="72" y={d.y + 15}>{'name: \'' + d.name + '\''}</text>
                    </g>
                ))}
                <text className="dm-label" x="28" y="160">RxDocuments</text>

                <rect className="dm-more" x="210" y="28" width="72" height="142" rx="5" />
                <text className="dm-label" x="246" y="96" textAnchor="middle">more</text>
                <text className="dm-label" x="246" y="108" textAnchor="middle">collections</text>

                {DOCS.map((d, i) => (
                    <circle
                        key={d.id}
                        className={'dm-pulse dm-p' + (i + 1)}
                        cx={194 - i * 4}
                        cy={d.y + 12}
                        r="3"
                        style={{ ['--dm-fall' as string]: (194 - d.y) + 'px' } as React.CSSProperties}
                    />
                ))}

                <rect className="dm-storage" x="8" y="188" width="284" height="30" rx="5" />
                <text className="dm-storage-text" x="150" y="206.5" textAnchor="middle">RxStorage: IndexedDB, SQLite, OPFS, memory, ...</text>
            </svg>
        </div>
    );
}
