import React from 'react';
import { LogoParts, logoColorsCss } from './shared';

/**
 * Conflict handling: two offline edits of the same document collide
 * on the middle layer of the RxDB logo, shake, and resolve into one revision.
 */
export function ConflictHandling() {
    return (
        <div className="conflict-handling">
            <style>{`
                .conflict-handling { line-height: 0; }
                .conflict-handling > svg { display: block; width: 100%; height: auto; overflow: visible; }
                .conflict-handling .part { transform-box: fill-box; transform-origin: center; }
                ${logoColorsCss('.conflict-handling')}
                .conflict-handling .b2 { animation: conflict-handling-resolved 4s cubic-bezier(.16, 1, .3, 1) infinite; }
                .conflict-handling .ca, .conflict-handling .cb { transform-box: fill-box; opacity: 0; }
                .conflict-handling .ca { fill: #ED168F; animation: conflict-handling-edit-a 4s cubic-bezier(.16, 1, .3, 1) infinite; }
                .conflict-handling .cb { fill: #752A8A; animation: conflict-handling-edit-b 4s cubic-bezier(.16, 1, .3, 1) infinite; }
                .conflict-handling .alert { transform-box: fill-box; transform-origin: center; opacity: 0; animation: conflict-handling-alert 4s cubic-bezier(.2, 1.4, .4, 1) infinite; }
                .conflict-handling .alert circle { fill: #FFFFFF; }
                .conflict-handling .alert text { fill: #0D0F18; font-size: 11px; font-weight: 800; font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                @keyframes conflict-handling-resolved {
                    0%, 54% { opacity: 0; transform: none; fill: #FFFFFF; }
                    58% { opacity: 1; transform: scaleX(1.08); fill: #FFFFFF; }
                    70%, 88% { opacity: 1; transform: none; fill: #B2218B; }
                    96%, 100% { opacity: 0; fill: #B2218B; }
                }
                @keyframes conflict-handling-edit-a {
                    0% { opacity: 0; transform: translateX(-50%); }
                    10% { opacity: .85; }
                    32% { transform: translateX(-8%); }
                    36% { transform: translateX(-3%); }
                    40% { transform: translateX(-7%); }
                    44% { transform: translateX(-2%); }
                    48% { transform: translateX(-6%); }
                    54% { opacity: .85; transform: none; }
                    60%, 100% { opacity: 0; transform: none; }
                }
                @keyframes conflict-handling-edit-b {
                    0% { opacity: 0; transform: translateX(50%); }
                    10% { opacity: .85; }
                    32% { transform: translateX(8%); }
                    36% { transform: translateX(3%); }
                    40% { transform: translateX(7%); }
                    44% { transform: translateX(2%); }
                    48% { transform: translateX(6%); }
                    54% { opacity: .85; transform: none; }
                    60%, 100% { opacity: 0; transform: none; }
                }
                @keyframes conflict-handling-alert {
                    0%, 36% { opacity: 0; transform: scale(0); }
                    40%, 52% { opacity: 1; transform: none; }
                    56%, 100% { opacity: 0; transform: scale(.5); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .conflict-handling .b2, .conflict-handling .ca, .conflict-handling .cb, .conflict-handling .alert { animation: none; }
                }
            `}</style>
            <svg
                viewBox="-70 -20 243.33 180"
                role="img"
                aria-label="Two conflicting edits of the middle layer of the RxDB logo collide, shake, and merge into one revision."
            >
                <LogoParts />
                <rect className="ca" x="6.67" y="60" width="90" height="20" />
                <rect className="cb" x="6.67" y="60" width="90" height="20" />
                <g className="alert">
                    <circle cx="116" cy="70" r="8" />
                    <text x="116" y="74" textAnchor="middle">!</text>
                </g>
            </svg>
        </div>
    );
}
