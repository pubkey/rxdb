import React from 'react';
import { LogoParts } from './shared';

/**
 * Each layer of the RxDB logo flips like a split-flap display and comes back
 * in the colors of schema version 2, one document after another.
 */
export function SchemaMigrationLogo() {
    return (
        <div className="schema-migration-logo">
            <style>{`
                .schema-migration-logo { line-height: 0; }
                .schema-migration-logo > svg { display: block; width: 100%; height: auto; }
                .schema-migration-logo .logo { overflow: visible; }
                .schema-migration-logo .part { transform-box: fill-box; transform-origin: center; }
                .schema-migration-logo .outline { fill: #FFFFFF; }
                .schema-migration-logo .corner { fill: #ED168F; }
                .schema-migration-logo .foot { fill: #752A8A; }
                .schema-migration-logo .b1 { --c: #ED168F; --o: #4B4F66; }
                .schema-migration-logo .b2 { --c: #B2218B; --o: #3F4358; animation-delay: .15s; }
                .schema-migration-logo .b3 { --c: #752A8A; --o: #34374A; animation-delay: .3s; }
                .schema-migration-logo .bar { fill: var(--c); animation: schema-migration-logo-migrate 4.8s cubic-bezier(.16, 1, .3, 1) infinite both; }
                .schema-migration-logo .ver {
                    font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
                    font-size: 10px;
                    font-weight: 700;
                }
                .schema-migration-logo .v1 { fill: #A29DB6; opacity: 0; animation: schema-migration-logo-ver1 4.8s infinite; }
                .schema-migration-logo .v2 { fill: #ED168F; animation: schema-migration-logo-ver2 4.8s infinite; }
                @keyframes schema-migration-logo-migrate {
                    0%, 18% { transform: scaleY(1); fill: var(--o); }
                    24% { transform: scaleY(0); fill: var(--o); }
                    24.1% { transform: scaleY(0); fill: var(--c); }
                    30%, 76% { transform: scaleY(1); fill: var(--c); }
                    82% { transform: scaleY(0); fill: var(--c); }
                    82.1% { transform: scaleY(0); fill: var(--o); }
                    88%, 100% { transform: scaleY(1); fill: var(--o); }
                }
                @keyframes schema-migration-logo-ver1 { 0%, 26% { opacity: 1; } 30%, 84% { opacity: 0; } 88%, 100% { opacity: 1; } }
                @keyframes schema-migration-logo-ver2 { 0%, 26% { opacity: 0; } 30%, 84% { opacity: 1; } 88%, 100% { opacity: 0; } }
                @media (prefers-reduced-motion: reduce) {
                    .schema-migration-logo .bar, .schema-migration-logo .v1, .schema-migration-logo .v2 { animation: none; }
                }
            `}</style>
            <svg viewBox="0 0 300 225" role="img" aria-label="The RxDB logo layers flip one after another from the gray colors of schema version 1 to the brand colors of schema version 2">
                <svg className="logo" x="0" y="38.25" width="300" height="148.5" viewBox="0 -22 103.33 162">
                    <LogoParts />
                    <text className="ver v1" x="0" y="-8">schema v1</text>
                    <text className="ver v2" x="0" y="-8">schema v2 · migrated</text>
                </svg>
            </svg>
        </div>
    );
}
