import React from 'react';
import { LogoParts, logoColorsCss } from './shared';

/**
 * An empty dashed copy of the RxDB logo appears and each layer
 * is copied into it, one after another. A backup written to plain JSON files.
 */
export function BackupCopy() {
    return (
        <div className="backup-copy">
            <style>{`
                .backup-copy { line-height: 0; }
                .backup-copy > svg { display: block; width: 100%; height: auto; }
                ${logoColorsCss('.backup-copy')}
                .backup-copy .part { transform-box: fill-box; transform-origin: center; }
                .backup-copy .ghost .part { fill: none; stroke: #A29DB6; stroke-width: 1.2; stroke-dasharray: 3 3; }
                .backup-copy .ghost, .backup-copy .blbl { animation: backup-copy-ghost 4.4s infinite; }
                .backup-copy .blbl { fill: #A29DB6; font-size: 8.5px; font-family: var(--ifm-font-family-monospace, ui-monospace, monospace); }
                .backup-copy .fly { animation: backup-copy-fly 4.4s cubic-bezier(.2, 1.4, .4, 1) infinite both; }
                .backup-copy .fly.b2 { animation-delay: .18s; }
                .backup-copy .fly.b3 { animation-delay: .36s; }
                @keyframes backup-copy-ghost { 0%, 4% { opacity: 0; } 12%, 88% { opacity: 1; } 96%, 100% { opacity: 0; } }
                @keyframes backup-copy-fly {
                    0%, 16% { opacity: 0; transform: none; }
                    18% { opacity: 1; transform: none; }
                    40%, 88% { opacity: 1; transform: translateX(125px); }
                    96%, 100% { opacity: 0; transform: translateX(125px); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .backup-copy .ghost, .backup-copy .blbl, .backup-copy .fly { animation: none; }
                    .backup-copy .fly { transform: translateX(125px); }
                }
            `}</style>
            <svg
                viewBox="-28.8 -31 291 218"
                role="img"
                aria-label="The layers of the RxDB logo are copied one after another into a backup file."
            >
                <LogoParts />
                <g className="ghost" transform="translate(125 0)"><LogoParts /></g>
                <rect className="bar b1 fly" x="6.66" y="33.34" width="90" height="20" />
                <rect className="bar b2 fly" x="6.67" y="60" width="90" height="20" />
                <rect className="bar b3 fly" x="6.66" y="86.66" width="90" height="20" />
                <text className="blbl" x="176.66" y="156" textAnchor="middle">backup/2026-09-29.json</text>
            </svg>
        </div>
    );
}
