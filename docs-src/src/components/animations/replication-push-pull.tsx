import React from 'react';
import { LogoParts } from './shared';

/**
 * An RxDB client replicates documents with a generic server.
 * The server does not have to run RxDB, any backend works.
 * Pushed documents travel right, pulled documents come back,
 * and the receiving side lights up on arrival.
 */
export function ReplicationPushPull() {
    return (
        <div className="replication-push-pull">
            <style>{`
                .replication-push-pull { line-height: 0; }
                .replication-push-pull > svg { display: block; width: 100%; height: auto; }
                .replication-push-pull .rpp-logo { overflow: visible; }
                .replication-push-pull .part { transform-box: fill-box; transform-origin: center; }
                .replication-push-pull .outline { fill: #FFFFFF; }
                .replication-push-pull .b1 { --rpp-c: #ED168F; }
                .replication-push-pull .b2 { --rpp-c: #B2218B; }
                .replication-push-pull .b3 { --rpp-c: #752A8A; }
                .replication-push-pull .bar { fill: var(--rpp-c); }
                .replication-push-pull .corner { fill: #ED168F; }
                .replication-push-pull .foot { fill: #752A8A; }
                .replication-push-pull .rpp-lane { stroke: #A29DB6; stroke-width: 1; stroke-dasharray: 3 4; opacity: .55; }
                .replication-push-pull .rpp-lbl { fill: #A29DB6; font-size: 9px; letter-spacing: .06em; font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                .replication-push-pull .rpp-tag { fill: #A29DB6; font-size: 10px; letter-spacing: .04em; font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
                .replication-push-pull .rpp-pk { transform-box: fill-box; opacity: 0; animation: replication-push-pull-push 3s linear infinite; }
                .replication-push-pull .rpp-pl { transform-box: fill-box; opacity: 0; animation: replication-push-pull-pull 3s linear infinite; }
                .replication-push-pull .rpp-d1 { animation-delay: -1s; }
                .replication-push-pull .rpp-d2 { animation-delay: -2s; }
                .replication-push-pull .rpp-cli .b3 { animation: replication-push-pull-flash 1s .64s infinite; }
                .replication-push-pull .rpp-box { fill: #171A29; stroke: #FFFFFF; stroke-width: 1.6; }
                .replication-push-pull .rpp-unit { fill: #1E2236; stroke: #262B40; stroke-width: 1; }
                .replication-push-pull .rpp-vent { stroke: #4B4F66; stroke-width: 1.4; }
                .replication-push-pull .rpp-led { fill: #4B4F66; }
                .replication-push-pull .rpp-led-in { --rpp-c: #4B4F66; animation: replication-push-pull-flash 1s .64s infinite; }
                @keyframes replication-push-pull-push {
                    0% { transform: translateX(0); opacity: 0; }
                    8% { opacity: 1; }
                    88% { transform: translateX(116px); opacity: 1; }
                    92%, 100% { transform: translateX(120px); opacity: 0; }
                }
                @keyframes replication-push-pull-pull {
                    0% { transform: translateX(0); opacity: 0; }
                    8% { opacity: 1; }
                    88% { transform: translateX(-116px); opacity: 1; }
                    92%, 100% { transform: translateX(-120px); opacity: 0; }
                }
                @keyframes replication-push-pull-flash {
                    0% { fill: #FFFFFF; }
                    40%, 100% { fill: var(--rpp-c); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .replication-push-pull .rpp-pk, .replication-push-pull .rpp-pl, .replication-push-pull .part, .replication-push-pull .rpp-led-in { animation: none !important; }
                    .replication-push-pull .rpp-pk.rpp-d0 { opacity: 1; transform: translateX(58px); }
                    .replication-push-pull .rpp-pl.rpp-d0 { opacity: 1; transform: translateX(-58px); }
                }
            `}</style>
            <svg
                viewBox="0 0 330 175"
                role="img"
                aria-label="An RxDB client and a server exchange documents. Pushed documents travel from the client to the server and pulled documents travel back."
            >
                <g transform="translate(15 15)">
                    <svg className="rpp-logo rpp-cli" x="12" y="18" width="70" height="95" viewBox="0 0 103.33 140">
                        <LogoParts />
                    </svg>
                    <g className="rpp-srv">
                        <rect className="rpp-box" x="222" y="22" width="62" height="88" rx="4" />
                        <rect className="rpp-unit" x="228" y="30" width="50" height="22" rx="2" />
                        <rect className="rpp-unit" x="228" y="56" width="50" height="22" rx="2" />
                        <rect className="rpp-unit" x="228" y="82" width="50" height="22" rx="2" />
                        <path className="rpp-vent" d="M234 36v10M238 36v10M242 36v10M234 62v10M238 62v10M242 62v10M234 88v10M238 88v10M242 88v10" />
                        <circle className="rpp-led rpp-led-in" cx="270" cy="41" r="2.6" />
                        <circle className="rpp-led" cx="270" cy="67" r="2.6" />
                        <circle className="rpp-led" cx="270" cy="93" r="2.6" />
                    </g>
                    <line className="rpp-lane" x1="88" y1="53" x2="212" y2="53" />
                    <line className="rpp-lane" x1="88" y1="75" x2="212" y2="75" />
                    <text className="rpp-lbl" x="150" y="44" textAnchor="middle">push →</text>
                    <text className="rpp-lbl" x="150" y="94" textAnchor="middle">← pull</text>
                    <rect className="rpp-pk rpp-d0" x="86" y="50" width="10" height="6" rx="1.5" fill="#ED168F" />
                    <rect className="rpp-pk rpp-d1" x="86" y="50" width="10" height="6" rx="1.5" fill="#B2218B" />
                    <rect className="rpp-pk rpp-d2" x="86" y="50" width="10" height="6" rx="1.5" fill="#ED168F" />
                    <rect className="rpp-pl rpp-d0" x="204" y="72" width="10" height="6" rx="1.5" fill="#752A8A" />
                    <rect className="rpp-pl rpp-d1" x="204" y="72" width="10" height="6" rx="1.5" fill="#B2218B" />
                    <rect className="rpp-pl rpp-d2" x="204" y="72" width="10" height="6" rx="1.5" fill="#752A8A" />
                    <text className="rpp-lbl" x="47" y="134" textAnchor="middle">client</text>
                    <text className="rpp-lbl" x="253" y="134" textAnchor="middle">server</text>
                </g>
                <text className="rpp-tag" x="8" y="166">replication</text>
            </svg>
        </div>
    );
}
