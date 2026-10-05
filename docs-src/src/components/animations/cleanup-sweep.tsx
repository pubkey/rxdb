import React from 'react';
import { LogoParts, logoColorsCss } from './shared';

/**
 * Two layers of the RxDB logo become deleted documents (dark tombstones)
 * until the cleanup sweep passes and removes them. New documents take their slots.
 */
export function CleanupSweep() {
    return (
        <div className="cleanup-sweep">
            <style>{`
                .cleanup-sweep { line-height: 0; }
                .cleanup-sweep > svg { display: block; width: 100%; height: auto; }
                ${logoColorsCss('.cleanup-sweep')}
                .cleanup-sweep .part { transform-box: fill-box; transform-origin: center; }
                .cleanup-sweep .b2 { --c: #B2218B; }
                .cleanup-sweep .b3 { --c: #752A8A; }
                .cleanup-sweep .b2, .cleanup-sweep .b3 { transform-origin: right center; animation: cleanup-sweep-tomb 5s cubic-bezier(.16, 1, .3, 1) infinite both; }
                .cleanup-sweep .b3 { animation-delay: .1s; }
                .cleanup-sweep .sweep { fill: #FFFFFF; opacity: 0; animation: cleanup-sweep-sweep 5s linear infinite; }
                .cleanup-sweep .tlbl { fill: #A29DB6; font-size: 8px; opacity: 0; animation: cleanup-sweep-tlbl 5s infinite; font-family: var(--ifm-font-family-monospace, ui-monospace, monospace); }
                @keyframes cleanup-sweep-tomb {
                    0%, 12% { fill: var(--c); transform: none; }
                    20%, 46% { fill: #2A2E45; transform: none; }
                    62%, 78% { fill: #2A2E45; transform: scaleX(0); }
                    90%, 100% { fill: var(--c); transform: none; }
                }
                @keyframes cleanup-sweep-sweep {
                    0%, 44% { opacity: 0; transform: none; }
                    46% { opacity: 1; transform: none; }
                    62% { opacity: 1; transform: translateX(90px); }
                    64%, 100% { opacity: 0; transform: translateX(90px); }
                }
                @keyframes cleanup-sweep-tlbl { 0%, 18% { opacity: 0; } 24%, 46% { opacity: 1; } 52%, 100% { opacity: 0; } }
                @media (prefers-reduced-motion: reduce) {
                    .cleanup-sweep .b2, .cleanup-sweep .b3, .cleanup-sweep .sweep, .cleanup-sweep .tlbl { animation: none; }
                    .cleanup-sweep .b2, .cleanup-sweep .b3 { fill: #2A2E45; }
                    .cleanup-sweep .tlbl { opacity: 1; }
                }
            `}</style>
            <svg
                viewBox="-72.8 -23.3 248.9 186.7"
                role="img"
                aria-label="Deleted documents in the RxDB logo stay as dark tombstones until a cleanup sweep removes them and new documents take their slots."
            >
                <LogoParts />
                <text className="tlbl" x="12" y="73">_deleted: true</text>
                <text className="tlbl" x="12" y="99.7">_deleted: true</text>
                <rect className="sweep" x="5" y="30" width="2.5" height="80" />
            </svg>
        </div>
    );
}
