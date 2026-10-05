import React from 'react';
import { LogoParts, logoColorsCss } from './shared';

/**
 * The first run of a query scans the RxDB logo layer by layer.
 * The second run of the same query is answered from the query cache
 * and all results light up at once.
 */
export function QueryCacheScan() {
    return (
        <div className="query-cache-scan">
            <style>{`
                .query-cache-scan { line-height: 0; }
                .query-cache-scan > svg { display: block; width: 100%; height: auto; overflow: visible; }
                .query-cache-scan text { font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                .query-cache-scan .part { transform-box: fill-box; transform-origin: center; }
                ${logoColorsCss('.query-cache-scan')}
                .query-cache-scan .qcs-scan { fill: #FFFFFF; opacity: 0; animation: qcs-scan 5s linear infinite; }
                .query-cache-scan .b1 { animation: qcs-cache-1 5s infinite; }
                .query-cache-scan .b2 { animation: qcs-cache-2 5s infinite; }
                .query-cache-scan .b3 { animation: qcs-cache-3 5s infinite; }
                .query-cache-scan .qcs-chip rect { fill: #141725; stroke: #A29DB6; stroke-width: 1; }
                .query-cache-scan .qcs-chip text { fill: #ECE9F2; font-size: 7px; }
                .query-cache-scan .qcs-chip { transform-box: fill-box; transform-origin: center; animation: qcs-chip 5s cubic-bezier(.2, 1.4, .4, 1) infinite; }
                .query-cache-scan .qcs-readout { font-size: 9.5px; }
                .query-cache-scan .qcs-r1 { fill: #ECE9F2; animation: qcs-q1 5s infinite; }
                .query-cache-scan .qcs-r2 { fill: #ED168F; opacity: 0; animation: qcs-q2 5s infinite; }
                @keyframes qcs-scan { 0%, 4% { opacity: 0; transform: none; } 6% { opacity: 1; } 36% { opacity: 1; transform: translateY(76px); } 38%, 100% { opacity: 0; transform: translateY(76px); } }
                @keyframes qcs-cache-1 { 0%, 10%, 16%, 56%, 64%, 100% { fill: #ED168F; } 12%, 58% { fill: #FFFFFF; } }
                @keyframes qcs-cache-2 { 0%, 19%, 25%, 56%, 64%, 100% { fill: #B2218B; } 21%, 58% { fill: #FFFFFF; } }
                @keyframes qcs-cache-3 { 0%, 29%, 35%, 56%, 64%, 100% { fill: #752A8A; } 31%, 58% { fill: #FFFFFF; } }
                @keyframes qcs-chip { 0%, 52% { transform: none; } 56% { transform: scale(1.25); } 64%, 100% { transform: none; } }
                @keyframes qcs-q1 { 0%, 48% { opacity: 1; } 52%, 100% { opacity: 0; } }
                @keyframes qcs-q2 { 0%, 50% { opacity: 0; } 54%, 94% { opacity: 1; } 98%, 100% { opacity: 0; } }
                @media (prefers-reduced-motion: reduce) {
                    .query-cache-scan .qcs-scan,
                    .query-cache-scan .b1,
                    .query-cache-scan .b2,
                    .query-cache-scan .b3,
                    .query-cache-scan .qcs-chip,
                    .query-cache-scan .qcs-r1,
                    .query-cache-scan .qcs-r2 { animation: none; }
                }
            `}</style>
            <svg
                viewBox="-82 -22 300 200"
                role="img"
                aria-label="The first run of a query scans the RxDB logo layer by layer. The second run of the same query is answered from the query cache."
            >
                <LogoParts />
                <rect className="qcs-scan" x="4" y="30" width="95" height="2" />
                <g className="qcs-chip">
                    <rect x="106" y="-10" width="30" height="14" rx="3" />
                    <text x="121" y="0" textAnchor="middle">cache</text>
                </g>
                <g className="qcs-readout">
                    <text className="qcs-r1" x="68" y="166" textAnchor="middle">find() · 1st run: scan</text>
                    <text className="qcs-r2" x="68" y="166" textAnchor="middle">find() · 2nd run: from cache</text>
                </g>
            </svg>
        </div>
    );
}
