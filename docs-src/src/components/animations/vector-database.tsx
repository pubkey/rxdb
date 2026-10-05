import React, { useEffect, useRef } from 'react';
import { LogoParts, COLORS, createRunner, prefersReducedMotion } from './shared';

const OX = 0;
const OY = 125;
const ANG = [[14, 20, 26], [44, 50, 56], [72, 78, 84]];
const LEN = [[95, 70, 82], [88, 100, 76], [80, 92, 70]];
const Q = 47;
const QL = 108;

type Vec = { a: number; l: number; c: string; };

function tip(a: number, l: number): [number, number] {
    const rad = a * Math.PI / 180;
    return [OX + Math.cos(rad) * l, OY - Math.sin(rad) * l];
}

const ALL: Vec[] = [];
ANG.forEach((group, k) => group.forEach((a, i) => ALL.push({ a, l: LEN[k][i], c: COLORS[k] })));
const NN = ALL
    .map((v, n): [number, number] => [Math.abs(v.a - Q), n])
    .sort((x, y) => x[0] - y[0])
    .slice(0, 3)
    .map(row => row[1]);

const A1 = ALL[NN[0]].a;
const ARC_R = 34;
const ARC_P1 = tip(Q, ARC_R);
const ARC_P2 = tip(A1, ARC_R);
const ARC_D = 'M' + ARC_P1[0].toFixed(1) + ' ' + ARC_P1[1].toFixed(1) +
    ' A' + ARC_R + ' ' + ARC_R + ' 0 0 ' + (A1 > Q ? 0 : 1) + ' ' + ARC_P2[0].toFixed(1) + ' ' + ARC_P2[1].toFixed(1);
const LABEL_POS = tip(Q - 17, 42);
const LABEL = 'cos ' + Math.cos((Q - A1) * Math.PI / 180).toFixed(3);
const QUERY_TIP = tip(Q, QL);
const QUERY_TEXT = 'query [' + Math.cos(Q * Math.PI / 180).toFixed(2) + ', ' + Math.sin(Q * Math.PI / 180).toFixed(2) + ']';

function Arrow(props: { a: number; l: number; cls: string; color: string; delay: number; }) {
    const t = tip(props.a, props.l);
    const x = t[0].toFixed(1);
    const y = t[1].toFixed(1);
    return (
        <g className={'vec' + props.cls} style={{ transitionDelay: props.delay + 'ms' }}>
            <line x1={OX} y1={OY} x2={x} y2={y} stroke={props.color} />
            <path d="M1 0 L-6 -3.4 L-6 3.4z" fill={props.color} transform={'translate(' + x + ' ' + y + ') rotate(' + (-props.a) + ')'} />
        </g>
    );
}

const STATES = ['embed', 'query', 'found'];

/**
 * The layers of the RxDB logo turn into document vectors in embedding space.
 * A query vector finds its three nearest neighbors by cosine similarity,
 * then the vectors fold back into the logo.
 */
export function VectorDatabase() {
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const root = rootRef.current;
        if (!root) {
            return;
        }
        if (prefersReducedMotion()) {
            root.classList.add(...STATES);
            return () => root.classList.remove(...STATES);
        }
        const runner = createRunner(root);
        (async () => {
            while (!runner.isStopped()) {
                await runner.wait(1200);
                root.classList.add('embed');
                await runner.wait(1500);
                root.classList.add('query');
                await runner.wait(1000);
                root.classList.add('found');
                await runner.wait(2400);
                root.classList.remove('found', 'query');
                await runner.wait(500);
                root.classList.remove('embed');
            }
        })();
        return () => {
            runner.stop();
            root.classList.remove(...STATES);
        };
    }, []);

    return (
        <div className="vector-database" ref={rootRef}>
            <style>{`
                .vector-database { line-height: 0; }
                .vector-database > svg { display: block; width: 100%; height: auto; }
                .vector-database text { font-family: var(--ifm-font-family-monospace, ui-monospace, monospace); }
                .vector-database .part { transform-box: fill-box; transform-origin: center; }
                .vector-database .outline { fill: #FFFFFF; }
                .vector-database .b1, .vector-database .corner { fill: #ED168F; }
                .vector-database .b2 { fill: #B2218B; }
                .vector-database .b3, .vector-database .foot { fill: #752A8A; }
                .vector-database .bar, .vector-database .outline, .vector-database .corner, .vector-database .foot { transition: opacity .35s; }
                .vector-database.embed .bar { opacity: 0; }
                .vector-database.embed .outline, .vector-database.embed .corner, .vector-database.embed .foot { opacity: .12; }
                .vector-database .axes path { stroke: #A29DB6; stroke-width: 1; fill: none; }
                .vector-database .axes text { fill: #A29DB6; font-size: 7px; }
                .vector-database .axes { opacity: 0; transition: opacity .4s; }
                .vector-database.embed .axes { opacity: .8; }
                .vector-database .vec { transform-box: view-box; transform-origin: 0 125px; transform: scale(0); opacity: 0; transition: transform .8s cubic-bezier(.2, 1.4, .4, 1), opacity .3s; }
                .vector-database .vec line { stroke-width: 2; stroke-linecap: round; transition: stroke-width .3s; }
                .vector-database.embed .vec { transform: scale(1); opacity: 1; }
                .vector-database.embed .vec.q { transform: scale(0); opacity: 0; }
                .vector-database.query .vec.q { transform: scale(1); opacity: 1; }
                .vector-database .vec.q line { stroke-dasharray: 4 3; }
                .vector-database.found .vec:not(.nn):not(.q) { opacity: .18; }
                .vector-database.found .vec.nn line { stroke-width: 3.2; }
                .vector-database .arc { fill: none; stroke: #FFFFFF; stroke-width: 1.2; }
                .vector-database .vlbl { fill: #ECE9F2; font-size: 8px; font-weight: 700; }
                .vector-database .qtxt { fill: #ECE9F2; font-size: 7.5px; }
                .vector-database .arc, .vector-database .vlbl, .vector-database .qtxt { opacity: 0; transition: opacity .4s; }
                .vector-database.query .qtxt, .vector-database.found .arc, .vector-database.found .vlbl { opacity: 1; }
                @media (prefers-reduced-motion: reduce) {
                    .vector-database *, .vector-database .vec { transition: none; }
                }
            `}</style>
            <svg
                viewBox="-77 -42.5 284 213"
                role="img"
                aria-label="The RxDB logo layers turn into embedding vectors and a query vector finds its three nearest neighbors by cosine similarity."
            >
                <LogoParts />
                <g className="axes">
                    <path d="M0 125 H128 M0 125 V-8" />
                    <text x="128" y="136" textAnchor="end">dim 1</text>
                    <text x="4" y="-8">dim 2</text>
                </g>
                <g className="vecs">
                    {ALL.map((v, n) => (
                        <Arrow key={n} a={v.a} l={v.l} cls={NN.includes(n) ? ' nn' : ''} color={v.c} delay={n * 55} />
                    ))}
                </g>
                <g className="qwrap">
                    <Arrow a={Q} l={QL} cls=" q" color="#FFFFFF" delay={0} />
                </g>
                <path className="arc" d={ARC_D} />
                <text className="vlbl" x={LABEL_POS[0].toFixed(1)} y={LABEL_POS[1].toFixed(1)}>{LABEL}</text>
                <text className="qtxt" x={(QUERY_TIP[0] + 4).toFixed(1)} y={(QUERY_TIP[1] - 3).toFixed(1)}>{QUERY_TEXT}</text>
            </svg>
        </div>
    );
}
