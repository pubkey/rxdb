import React from 'react';
import { LogoParts, logoColorsCss } from './shared';

/**
 * The layers of the RxDB logo keep replicating documents to a server
 * while the local document on the corner piece pulses in place
 * and never leaves the device.
 */
export function LocalDocuments() {
    return (
        <div className="local-documents">
            <style>{`
                .local-documents { line-height: 0; }
                .local-documents > svg { display: block; width: 100%; height: auto; }
                .local-documents .part { transform-box: fill-box; transform-origin: center; }
                ${logoColorsCss('.local-documents')}
                .local-documents .ld-out { transform-box: fill-box; opacity: 0; animation: local-documents-out 2.4s linear infinite; }
                .local-documents .ld-srv rect { fill: none; stroke: #A29DB6; stroke-width: 1.2; }
                .local-documents .ld-srv circle { fill: #A29DB6; }
                .local-documents .ld-halo { fill: none; stroke: #FFFFFF; stroke-width: 1.2; transform-box: fill-box; transform-origin: center; animation: local-documents-halo 2.4s ease-out infinite; }
                .local-documents text { font-size: 8px; font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
                .local-documents .ld-label { fill: #ECE9F2; font-size: 11px; font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                .local-documents .ld-srv-label { fill: #A29DB6; font-size: 9px; font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                @keyframes local-documents-out {
                    0% { opacity: 0; transform: none; }
                    10% { opacity: 1; }
                    80% { opacity: 1; transform: translateX(62px); }
                    90%, 100% { opacity: 0; transform: translateX(66px); }
                }
                @keyframes local-documents-halo {
                    0% { opacity: .9; transform: scale(.8); }
                    70%, 100% { opacity: 0; transform: scale(1.5); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .local-documents .ld-out { animation: none; opacity: 1; transform: translateX(31px); }
                    .local-documents .ld-halo { animation: none; transform: scale(1.15); opacity: .6; }
                }
            `}</style>
            <svg
                viewBox="-24 -32 248 192"
                role="img"
                aria-label="The layers of the RxDB logo replicate documents to a server while the local document on the corner piece stays on the device and never syncs."
            >
                <LogoParts />
                <circle className="ld-halo" cx="86.67" cy="16.67" r="14" />
                <text className="ld-label" x="102" y="4">_local/settings</text>
                <rect className="ld-out" x="100" y="40.3" width="10" height="6" rx="1.5" fill="#ED168F" />
                <rect className="ld-out" x="100" y="67" width="10" height="6" rx="1.5" fill="#B2218B" style={{ animationDelay: '-.8s' }} />
                <rect className="ld-out" x="100" y="93.7" width="10" height="6" rx="1.5" fill="#752A8A" style={{ animationDelay: '-1.6s' }} />
                <g className="ld-srv">
                    <rect x="172" y="44" width="24" height="12" rx="2" />
                    <rect x="172" y="60" width="24" height="12" rx="2" />
                    <rect x="172" y="76" width="24" height="12" rx="2" />
                    <circle cx="177" cy="50" r="1.5" />
                    <circle cx="177" cy="66" r="1.5" />
                    <circle cx="177" cy="82" r="1.5" />
                </g>
                <text className="ld-srv-label" x="184" y="100" textAnchor="middle">server</text>
            </svg>
        </div>
    );
}
