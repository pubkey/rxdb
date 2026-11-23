import React from 'react';

const LAYERS = [
    { label: 'validate-ajv', sub: 'checks the schema', doc: '{name:\'Learn RxDB\'}' },
    { label: 'key-compression', sub: 'shortens the keys', doc: '{\'|a\':\'Learn RxDB\'}' },
    { label: 'encryption-crypto-js', sub: 'encrypts the values', doc: '\'U2FsdGVkX1+r9...\'' },
    { label: 'IndexedDB RxStorage', sub: 'writes to disk', doc: 'stored' }
];

/**
 * Wrapped storages form a stack. A document passes the schema validation,
 * the key compression and the encryption before the base storage
 * writes it to disk.
 */
export function StorageWrapperStack() {
    return (
        <div className="storage-wrapper-stack">
            <style>{`
                .storage-wrapper-stack { line-height: 0; }
                .storage-wrapper-stack > svg { display: block; width: 100%; height: auto; }
                .storage-wrapper-stack text { font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                .storage-wrapper-stack .sws-layer { fill: #141726; stroke: #262B40; stroke-width: 1.2; animation: storage-wrapper-stack-layer 6s ease-out infinite; }
                .storage-wrapper-stack .sws-base { fill: #752A8A; stroke: #ED168F; }
                .storage-wrapper-stack .sws-label { fill: #FFFFFF; font-size: 8.5px; }
                .storage-wrapper-stack .sws-sub { fill: #A29DB6; font-size: 7px; letter-spacing: .04em; }
                .storage-wrapper-stack .sws-base-sub { fill: #E8D8F0; }
                .storage-wrapper-stack .sws-doc rect { fill: #20243A; stroke: #ED168F; stroke-width: 1; }
                .storage-wrapper-stack .sws-doc text { fill: #FFFFFF; font-size: 7px; }
                .storage-wrapper-stack .sws-doc { opacity: 0; animation: storage-wrapper-stack-doc 6s ease-out infinite; }
                .storage-wrapper-stack .sws-link { fill: #262B40; }
                .storage-wrapper-stack .sws-1 { animation-delay: 0s; }
                .storage-wrapper-stack .sws-2 { animation-delay: 1.2s; }
                .storage-wrapper-stack .sws-3 { animation-delay: 2.4s; }
                .storage-wrapper-stack .sws-4 { animation-delay: 3.6s; }
                .storage-wrapper-stack .sws-head { fill: #A29DB6; font-size: 7.5px; letter-spacing: .06em; }
                .storage-wrapper-stack .sws-layer.sws-base { animation-name: storage-wrapper-stack-base; }
                @keyframes storage-wrapper-stack-base {
                    0% { stroke: #ED168F; }
                    5% { stroke: #FFFFFF; }
                    20%, 100% { stroke: #ED168F; }
                }
                @keyframes storage-wrapper-stack-doc {
                    0% { opacity: 0; transform: translateX(-6px); }
                    5%, 70% { opacity: 1; transform: none; }
                    80%, 100% { opacity: 0; transform: none; }
                }
                @keyframes storage-wrapper-stack-layer {
                    0% { stroke: #262B40; }
                    5% { stroke: #ED168F; }
                    20%, 100% { stroke: #262B40; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .storage-wrapper-stack .sws-doc, .storage-wrapper-stack .sws-layer { animation: none; }
                    .storage-wrapper-stack .sws-doc { opacity: 1; }
                }
            `}</style>
            <svg
                viewBox="0 0 300 225"
                role="img"
                aria-label="RxDB storage wrapper stack: a document passes the validate-ajv schema validation, the key-compression and the encryption-crypto-js wrapper before the IndexedDB RxStorage writes it to disk."
            >
                <text className="sws-head" x="8" y="14">document</text>
                <text className="sws-head" x="122" y="14">RxStorage stack</text>
                {LAYERS.map((l, i) => {
                    const y = 22 + i * 50;
                    const base = i === LAYERS.length - 1;
                    return (
                        <g key={l.label}>
                            <rect className="sws-link" x="104" y={y + 20} width="18" height="1.5" />
                            <rect className={'sws-layer sws-' + (i + 1) + (base ? ' sws-base' : '')} x="122" y={y} width="170" height="40" rx="5" />
                            <text className="sws-label" x="132" y={y + 17}>{l.label}</text>
                            <text className={'sws-sub' + (base ? ' sws-base-sub' : '')} x="132" y={y + 30}>{l.sub}</text>
                            <g className={'sws-doc sws-' + (i + 1)}>
                                <rect x="8" y={y + 9} width="96" height="22" rx="4" />
                                <text x="56" y={y + 23} textAnchor="middle">{l.doc}</text>
                            </g>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}
