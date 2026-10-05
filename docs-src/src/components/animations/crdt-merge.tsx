import React from 'react';
import { LogoParts } from './shared';

/**
 * Two clients send an $inc operation at the same time.
 * Both operations merge into the middle layer of the RxDB logo
 * and the count goes from 3 to 5 without a conflict.
 */
export function CrdtMerge() {
    return (
        <div className="crdt-merge">
            <style>{`
                .crdt-merge { line-height: 0; }
                .crdt-merge > svg { display: block; width: 100%; height: auto; }
                .crdt-merge text { font-family: 'Atkinson Hyperlegible Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace; }
                .crdt-merge .part { transform-box: fill-box; transform-origin: center; }
                .crdt-merge .outline { fill: #FFFFFF; }
                .crdt-merge .b1 { --c: #ED168F; }
                .crdt-merge .b2 { --c: #B2218B; }
                .crdt-merge .b3 { --c: #752A8A; }
                .crdt-merge .bar { fill: var(--c); }
                .crdt-merge .corner { fill: #ED168F; }
                .crdt-merge .foot { fill: #752A8A; }
                .crdt-merge .op { transform-box: fill-box; transform-origin: center; opacity: 0; }
                .crdt-merge .op text { fill: #FFFFFF; font-size: 8px; font-weight: 800; }
                .crdt-merge .op-a rect { fill: #ED168F; }
                .crdt-merge .op-b rect { fill: #752A8A; }
                .crdt-merge .op-a { animation: crdt-merge-a 4.4s cubic-bezier(.16, 1, .3, 1) infinite; }
                .crdt-merge .op-b { animation: crdt-merge-b 4.4s cubic-bezier(.16, 1, .3, 1) infinite; }
                .crdt-merge .b2 { animation: crdt-merge-absorb 4.4s cubic-bezier(.2, 1.4, .4, 1) infinite; }
                .crdt-merge .count { font-size: 10px; font-weight: 700; }
                .crdt-merge .c1 { fill: #A29DB6; animation: crdt-merge-c1 4.4s infinite; }
                .crdt-merge .c2 { fill: #ED168F; opacity: 0; animation: crdt-merge-c2 4.4s infinite; }
                @keyframes crdt-merge-a {
                    0% { opacity: 0; transform: none; }
                    10% { opacity: 1; }
                    40% { opacity: 1; transform: translateX(64px); }
                    46%, 100% { opacity: 0; transform: translateX(66px) scale(.3); }
                }
                @keyframes crdt-merge-b {
                    0% { opacity: 0; transform: none; }
                    10% { opacity: 1; }
                    40% { opacity: 1; transform: translateX(-62px); }
                    46%, 100% { opacity: 0; transform: translateX(-64px) scale(.3); }
                }
                @keyframes crdt-merge-absorb {
                    0%, 40% { transform: none; fill: var(--c); }
                    44% { transform: scale(1.08, 1.25); fill: #FFFFFF; }
                    56%, 100% { transform: none; fill: var(--c); }
                }
                @keyframes crdt-merge-c1 { 0%, 46% { opacity: 1; } 50%, 100% { opacity: 0; } }
                @keyframes crdt-merge-c2 { 0%, 46% { opacity: 0; } 50%, 94% { opacity: 1; } 98%, 100% { opacity: 0; } }
                @media (prefers-reduced-motion: reduce) {
                    .crdt-merge .op, .crdt-merge .b2, .crdt-merge .c1, .crdt-merge .c2 { animation: none; }
                    .crdt-merge .op { opacity: 1; }
                }
            `}</style>
            <svg
                viewBox="0 0 400 300"
                role="img"
                aria-label="Two concurrent increments merge into the middle layer of the RxDB logo without a conflict and the likes count goes from 3 to 5."
            >
                <svg x="24" y="51" width="352" height="198" viewBox="-50 -26 203.33 166" overflow="visible">
                    <LogoParts />
                    <g className="op op-a"><rect x="-44" y="64" width="26" height="12" rx="6" /><text x="-31" y="73" textAnchor="middle">+1</text></g>
                    <g className="op op-b"><rect x="122" y="64" width="26" height="12" rx="6" /><text x="135" y="73" textAnchor="middle">+1</text></g>
                    <text className="count c1" x="51.66" y="-10" textAnchor="middle">likes: 3</text>
                    <text className="count c2" x="51.66" y="-10" textAnchor="middle">likes: 5</text>
                </svg>
            </svg>
        </div>
    );
}
