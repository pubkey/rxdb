import React from 'react';
import { LogoParts, logoColorsCss } from './shared';

/**
 * A document written to the source collection runs through the
 * handler function of an RxPipeline and lands as a new document
 * in the destination collection.
 */
export function RxPipelineFlow() {
    return (
        <div className="rx-pipeline-flow">
            <style>{`
                .rx-pipeline-flow { line-height: 0; }
                .rx-pipeline-flow > svg { display: block; width: 100%; height: auto; overflow: visible; }
                .rx-pipeline-flow text { font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                .rx-pipeline-flow .part { transform-box: fill-box; transform-origin: center; }
                ${logoColorsCss('.rx-pipeline-flow .rpf-logo')}
                .rx-pipeline-flow .rpf-pipe { stroke: #262B40; stroke-width: 8; stroke-linecap: round; fill: none; }
                .rx-pipeline-flow .rpf-fn rect { fill: #0D0F18; stroke: #FFFFFF; stroke-width: 1.2; }
                .rx-pipeline-flow .rpf-fn text { fill: #ECE9F2; font-size: 8px; font-weight: 700; }
                .rx-pipeline-flow .rpf-fn { transform-box: fill-box; transform-origin: center; animation: rpf-fn 2.6s cubic-bezier(.2, 1.4, .4, 1) infinite; }
                .rx-pipeline-flow .rpf-pa, .rx-pipeline-flow .rpf-pb { transform-box: fill-box; opacity: 0; }
                .rx-pipeline-flow .rpf-pa { fill: #ED168F; animation: rpf-pipe-a 2.6s ease-in infinite; }
                .rx-pipeline-flow .rpf-pb { fill: #752A8A; animation: rpf-pipe-b 2.6s ease-out infinite; }
                .rx-pipeline-flow .rpf-src .b1 { animation: rpf-flash-pink 2.6s infinite; }
                .rx-pipeline-flow .rpf-dst .b3 { animation: rpf-flash-purple 2.6s 2.24s infinite; }
                .rx-pipeline-flow .rpf-lbl { fill: #A29DB6; font-size: 9px; letter-spacing: .06em; }
                @keyframes rpf-pipe-a { 0% { opacity: 0; transform: none; } 6% { opacity: 1; } 40% { opacity: 1; transform: translateX(50px); } 44%, 100% { opacity: 0; transform: translateX(50px); } }
                @keyframes rpf-pipe-b { 0%, 46% { opacity: 0; transform: none; } 50% { opacity: 1; } 84% { opacity: 1; transform: translateX(50px); } 88%, 100% { opacity: 0; transform: translateX(50px); } }
                @keyframes rpf-fn { 0%, 38% { transform: none; } 43% { transform: scale(1.15); } 50%, 100% { transform: none; } }
                @keyframes rpf-flash-pink { 0% { fill: #FFFFFF; } 40%, 100% { fill: #ED168F; } }
                @keyframes rpf-flash-purple { 0% { fill: #FFFFFF; } 40%, 100% { fill: #752A8A; } }
                @media (prefers-reduced-motion: reduce) {
                    .rx-pipeline-flow .rpf-fn,
                    .rx-pipeline-flow .rpf-pa,
                    .rx-pipeline-flow .rpf-pb,
                    .rx-pipeline-flow .rpf-src .b1,
                    .rx-pipeline-flow .rpf-dst .b3 { animation: none; }
                }
            `}</style>
            <svg
                viewBox="0 0 300 145"
                role="img"
                aria-label="A document written to the source RxDB collection flows through the handler function of an RxPipeline and becomes a new document in the destination collection."
            >
                <svg className="rpf-logo rpf-src" x="12" y="18" width="70" height="95" viewBox="0 0 103.33 140">
                    <LogoParts />
                </svg>
                <svg className="rpf-logo rpf-dst" x="218" y="18" width="70" height="95" viewBox="0 0 103.33 140">
                    <LogoParts />
                </svg>
                <path className="rpf-pipe" d="M88 65 H212" />
                <rect className="rpf-pa" x="90" y="62" width="10" height="6" rx="1.5" />
                <rect className="rpf-pb" x="152" y="62" width="10" height="6" rx="1.5" />
                <g className="rpf-fn">
                    <rect x="133" y="56" width="34" height="18" rx="4" />
                    <text x="150" y="68" textAnchor="middle">fn()</text>
                </g>
                <text className="rpf-lbl" x="47" y="134" textAnchor="middle">source</text>
                <text className="rpf-lbl" x="253" y="134" textAnchor="middle">destination</text>
            </svg>
        </div>
    );
}
