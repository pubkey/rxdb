import React, { useId } from 'react';
import { LogoParts, logoColorsCss } from './shared';

/**
 * The RxDB logo splits into three vertical shards that drift apart and snap back.
 * One collection, stored across several shards.
 */
export function ShardingSplit() {
    const id = 'sharding-split-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
    return (
        <div className="sharding-split">
            <style>{`
                .sharding-split { line-height: 0; }
                .sharding-split > svg { display: block; width: 100%; height: auto; }
                ${logoColorsCss('.sharding-split')}
                .sharding-split .part { transform-box: fill-box; transform-origin: center; }
                .sharding-split .shard { animation: 4.4s cubic-bezier(.2, 1.4, .4, 1) infinite; }
                .sharding-split .s1 { animation-name: sharding-split-1; }
                .sharding-split .s2 { animation-name: sharding-split-2; }
                .sharding-split .s3 { animation-name: sharding-split-3; }
                .sharding-split .slbl { fill: #A29DB6; font-size: 8px; opacity: 0; animation: sharding-split-lbl 4.4s infinite; font-family: var(--ifm-font-family-monospace, ui-monospace, monospace); }
                @keyframes sharding-split-1 { 0%, 18% { transform: none; } 36%, 72% { transform: translate(-14px, -6px); } 90%, 100% { transform: none; } }
                @keyframes sharding-split-2 { 0%, 18% { transform: none; } 36%, 72% { transform: translate(0, 8px); } 90%, 100% { transform: none; } }
                @keyframes sharding-split-3 { 0%, 18% { transform: none; } 36%, 72% { transform: translate(14px, -4px); } 90%, 100% { transform: none; } }
                @keyframes sharding-split-lbl { 0%, 32% { opacity: 0; } 40%, 70% { opacity: 1; } 78%, 100% { opacity: 0; } }
                @media (prefers-reduced-motion: reduce) {
                    .sharding-split .shard, .sharding-split .slbl { animation: none; }
                    .sharding-split .s1 { transform: translate(-14px, -6px); }
                    .sharding-split .s2 { transform: translate(0, 8px); }
                    .sharding-split .s3 { transform: translate(14px, -4px); }
                    .sharding-split .slbl { opacity: 1; }
                }
            `}</style>
            <svg
                viewBox="-101.3 -42.7 306 229.3"
                role="img"
                aria-label="The RxDB logo splits into three vertical shards that drift apart and snap back together."
            >
                <defs>
                    <clipPath id={id + '-1'}><rect x="-1" y="-1" width="35.4" height="142" /></clipPath>
                    <clipPath id={id + '-2'}><rect x="34.4" y="-1" width="34.5" height="142" /></clipPath>
                    <clipPath id={id + '-3'}><rect x="68.9" y="-1" width="35.5" height="142" /></clipPath>
                </defs>
                <g className="shard s1" clipPath={'url(#' + id + '-1)'}><LogoParts /></g>
                <g className="shard s2" clipPath={'url(#' + id + '-2)'}><LogoParts /></g>
                <g className="shard s3" clipPath={'url(#' + id + '-3)'}><LogoParts /></g>
                <text className="slbl" x="3" y="152" textAnchor="middle">shard 1</text>
                <text className="slbl" x="51.66" y="158" textAnchor="middle">shard 2</text>
                <text className="slbl" x="100" y="152" textAnchor="middle">shard 3</text>
            </svg>
        </div>
    );
}
