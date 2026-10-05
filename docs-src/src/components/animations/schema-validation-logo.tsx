import React from 'react';
import { LogoParts, logoColorsCss } from './shared';

/**
 * A document with the wrong type hits the RxDB logo, shakes and falls out.
 * Then the valid document slides into its slot.
 */
export function SchemaValidationLogo() {
    return (
        <div className="schema-validation-logo">
            <style>{`
                .schema-validation-logo { line-height: 0; }
                .schema-validation-logo > svg { display: block; width: 100%; height: auto; }
                .schema-validation-logo .logo { overflow: visible; }
                .schema-validation-logo .part { transform-box: fill-box; transform-origin: center; }
                ${logoColorsCss('.schema-validation-logo')}
                .schema-validation-logo .b2 { animation: schema-validation-logo-valid 4.4s cubic-bezier(.2, 1.4, .4, 1) infinite; }
                .schema-validation-logo .bad { transform-box: fill-box; transform-origin: center; opacity: 0; animation: schema-validation-logo-invalid 4.4s cubic-bezier(.16, 1, .3, 1) infinite; }
                .schema-validation-logo .bad rect { fill: #5A5F78; }
                .schema-validation-logo .bad path { stroke: #FFFFFF; stroke-width: 2.4; stroke-linecap: round; fill: none; }
                .schema-validation-logo .readout {
                    font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
                    font-size: 10px;
                }
                .schema-validation-logo .r1 { fill: #ECE9F2; animation: schema-validation-logo-sv1 4.4s infinite; }
                .schema-validation-logo .r2 { fill: #ED168F; opacity: 0; animation: schema-validation-logo-sv2 4.4s infinite; }
                @keyframes schema-validation-logo-invalid {
                    0% { opacity: 0; transform: translateX(-70%); }
                    8% { opacity: 1; }
                    22% { transform: translateX(-6%); }
                    25% { transform: translateX(-14%); }
                    28% { transform: translateX(-7%); }
                    31% { transform: translateX(-11%); }
                    34% { opacity: 1; transform: translateX(-9%); }
                    48%, 100% { opacity: 0; transform: translate(-24%, 150%) rotate(-24deg); }
                }
                @keyframes schema-validation-logo-valid {
                    0%, 52% { opacity: 0; transform: translateX(-70%); }
                    56% { opacity: 1; }
                    68%, 90% { opacity: 1; transform: none; }
                    97%, 100% { opacity: 0; transform: none; }
                }
                @keyframes schema-validation-logo-sv1 { 0%, 46% { opacity: 1; } 50%, 100% { opacity: 0; } }
                @keyframes schema-validation-logo-sv2 { 0%, 52% { opacity: 0; } 56%, 92% { opacity: 1; } 97%, 100% { opacity: 0; } }
                @media (prefers-reduced-motion: reduce) {
                    .schema-validation-logo .b2, .schema-validation-logo .bad, .schema-validation-logo .r1, .schema-validation-logo .r2 { animation: none; }
                    .schema-validation-logo .r1 { opacity: 0; }
                    .schema-validation-logo .r2 { opacity: 1; }
                }
            `}</style>
            <svg viewBox="0 0 300 225" role="img" aria-label="An invalid document with age set to a string bounces off the RxDB logo and falls out, then a valid document with a numeric age slides into its slot">
                <svg className="logo" x="0" y="25.9" width="300" height="148.5" viewBox="-50 0 153.33 160">
                    <LogoParts />
                    <g className="bad">
                        <rect x="6.67" y="60" width="90" height="20" />
                        <path d="M46.7 65 l10 10 M56.7 65 l-10 10" />
                    </g>
                </svg>
                <g className="readout" aria-hidden="true">
                    <text className="r1" x="150" y="195" textAnchor="middle">{'{ age: "abc" } · rejected'}</text>
                    <text className="r2" x="150" y="195" textAnchor="middle">{'{ age: 42 } · valid'}</text>
                </g>
            </svg>
        </div>
    );
}
