import React from 'react';

const SOURCES = [
    { label: 'insert()', x: 8 },
    { label: 'other browser tab', x: 104 },
    { label: 'replication', x: 200 }
];
const ROWS = [62, 92, 122];
const COLORS = ['#ED168F', '#B2218B', '#752A8A'];

/**
 * A query observable re-emits whenever a matching document changes.
 * The write can come from the same tab, from another browser tab
 * or from the replication. Each change travels from the collection
 * through the query to the UI.
 */
export function ReactiveQuery() {
    return (
        <div className="reactive-query">
            <style>{`
                .reactive-query { line-height: 0; }
                .reactive-query > svg { display: block; width: 100%; height: auto; }
                .reactive-query text { font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                .reactive-query .rq-pill rect { fill: #141726; stroke: #262B40; stroke-width: 1.2; }
                .reactive-query .rq-pill text { fill: #A29DB6; font-size: 7.5px; }
                .reactive-query .rq-pill { opacity: .45; animation: reactive-query-pill 6s ease-out infinite; }
                .reactive-query .rq-box { fill: #141726; stroke: #262B40; stroke-width: 1.2; }
                .reactive-query .rq-query { fill: #1A1E30; stroke: #ED168F; stroke-width: 1.2; }
                .reactive-query .rq-label { fill: #A29DB6; font-size: 8px; letter-spacing: .06em; }
                .reactive-query .rq-code { fill: #FFFFFF; font-size: 8px; }
                .reactive-query .rq-row { fill: #20243A; stroke: #262B40; stroke-width: 1; animation: reactive-query-row 6s ease-out infinite; }
                .reactive-query .rq-track { fill: #262B40; }
                .reactive-query .rq-marble { opacity: 0; animation: reactive-query-marble 6s linear infinite; }
                .reactive-query .rq-s1, .reactive-query .rq-r1, .reactive-query .rq-m1 { animation-delay: 0s; }
                .reactive-query .rq-s2, .reactive-query .rq-r2, .reactive-query .rq-m2 { animation-delay: 2s; }
                .reactive-query .rq-s3, .reactive-query .rq-r3, .reactive-query .rq-m3 { animation-delay: 4s; }
                .reactive-query .rq-ui .rq-row { animation-name: reactive-query-ui-row; }
                @keyframes reactive-query-pill {
                    0% { opacity: .45; }
                    4%, 26% { opacity: 1; }
                    33%, 100% { opacity: .45; }
                }
                @keyframes reactive-query-row {
                    0%, 3% { fill: #20243A; stroke: #262B40; }
                    8% { fill: #3A1D3A; stroke: var(--rq-c); }
                    30%, 100% { fill: #20243A; stroke: #262B40; }
                }
                @keyframes reactive-query-ui-row {
                    0%, 20% { fill: #20243A; stroke: #262B40; }
                    24% { fill: #3A1D3A; stroke: var(--rq-c); }
                    33%, 100% { fill: #20243A; stroke: #262B40; }
                }
                @keyframes reactive-query-marble {
                    0%, 6% { opacity: 0; transform: translateX(0); }
                    8% { opacity: 1; transform: translateX(0); }
                    22% { opacity: 1; transform: translateX(118px); }
                    24%, 100% { opacity: 0; transform: translateX(118px); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .reactive-query .rq-pill, .reactive-query .rq-row, .reactive-query .rq-marble { animation: none; }
                    .reactive-query .rq-pill { opacity: 1; }
                    .reactive-query .rq-m1 { opacity: 1; transform: translateX(10px); }
                    .reactive-query .rq-m2 { opacity: 1; transform: translateX(108px); }
                }
            `}</style>
            <svg
                viewBox="0 0 300 225"
                role="img"
                aria-label="A reactive RxDB query: a change from insert(), from another browser tab or from the replication updates the todos collection, the query observable emits the new result and the UI renders it."
            >
                {SOURCES.map((s, i) => (
                    <g key={s.label} className={'rq-pill rq-s' + (i + 1)}>
                        <rect x={s.x} y="8" width="92" height="20" />
                        <text x={s.x + 46} y="21" textAnchor="middle">{s.label}</text>
                    </g>
                ))}

                <rect className="rq-box" x="8" y="40" width="84" height="116" />
                <text className="rq-label" x="16" y="54">todos</text>
                {ROWS.map((y, i) => (
                    <rect key={y} className={'rq-row rq-r' + (i + 1)} x="16" y={y} width="68" height="20" style={{ ['--rq-c' as string]: COLORS[i] } as React.CSSProperties} />
                ))}

                <rect className="rq-track" x="92" y="97" width="118" height="2" />
                {COLORS.map((c, i) => (
                    <circle key={c} className={'rq-marble rq-m' + (i + 1)} cx="92" cy="98" r="5" fill={c} />
                ))}
                <rect className="rq-query" x="112" y="78" width="78" height="40" />
                <text className="rq-label" x="151" y="94" textAnchor="middle">RxQuery</text>
                <text className="rq-code" x="151" y="108" textAnchor="middle">query.$</text>

                <g className="rq-ui">
                    <rect className="rq-box" x="208" y="40" width="84" height="116" />
                    <text className="rq-label" x="216" y="54">UI</text>
                    {ROWS.map((y, i) => (
                        <rect key={y} className={'rq-row rq-r' + (i + 1)} x="216" y={y} width="68" height="20" style={{ ['--rq-c' as string]: COLORS[i] } as React.CSSProperties} />
                    ))}
                </g>

                <text className="rq-code" x="150" y="186" textAnchor="middle">query.$.subscribe(todos =&gt; render(todos))</text>
                <text className="rq-label" x="150" y="204" textAnchor="middle">every change emits a new result</text>
            </svg>
        </div>
    );
}
