import React, { useEffect, useRef } from 'react';
import { LogoParts, POP, SVGNS, createRunner, logoColorsCss, prefersReducedMotion } from './shared';

type Person = {
    name: string;
    y: number;
    pets: string[];
};
type Pet = {
    name: string;
    kind: string;
    y: number;
    color: string;
};

const PEOPLE: Person[] = [
    { name: 'alice', y: 28, pets: ['rex'] },
    { name: 'bob', y: 68, pets: ['tom', 'mimi'] },
    { name: 'carol', y: 108, pets: ['kiki'] }
];
const PETS: Pet[] = [
    { name: 'rex', kind: 'dog', y: 28, color: '#ED168F' },
    { name: 'tom', kind: 'cat', y: 58, color: '#B2218B' },
    { name: 'mimi', kind: 'cat', y: 88, color: '#B2218B' },
    { name: 'kiki', kind: 'bird', y: 118, color: '#752A8A' }
];

function linkPath(person: Person, petName: string) {
    const pet = PETS.find(p => p.name === petName);
    const py = person.y + 15;
    const ty = (pet ? pet.y : 0) + 11;
    return 'M118 ' + py + ' C 150 ' + py + ', 150 ' + ty + ', 182 ' + ty;
}

function petsLabel(pets: string[]) {
    return 'pets: [' + pets.map(p => '\'' + p + '\'').join(', ') + ']';
}

/**
 * Each person document stores only the ids of its pets.
 * populate('pets') follows each id into the pets collection
 * and resolves the pet documents.
 */
export function Population() {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const svg = svgRef.current;
        if (!svg) {
            return;
        }
        const links = svg.querySelector('.pop-links');
        const callEl = svg.querySelector('.pop-call');
        if (!links || !callEl) {
            return;
        }
        const row = (attr: string, name: string) => svg.querySelector('[data-' + attr + '="' + name + '"]');
        const addLink = (person: Person, petName: string) => {
            const path = document.createElementNS(SVGNS, 'path');
            path.setAttribute('class', 'pop-link');
            path.setAttribute('pathLength', '1');
            path.setAttribute('d', linkPath(person, petName));
            links.appendChild(path);
            return path;
        };

        if (prefersReducedMotion() || typeof svg.animate !== 'function') {
            const first = PEOPLE[0];
            row('person', first.name)?.classList.add('hot');
            first.pets.forEach(petName => {
                addLink(first, petName).style.strokeDashoffset = '0';
                row('pet', petName)?.classList.add('hot');
            });
            return () => {
                links.innerHTML = '';
                svg.querySelectorAll('.pop-row.hot').forEach(r => r.classList.remove('hot'));
            };
        }

        const runner = createRunner(svg);
        (async () => {
            for (let i = 0; !runner.isStopped(); i++) {
                const person = PEOPLE[i % PEOPLE.length];
                callEl.textContent = 'await ' + person.name + '.populate(\'pets\')';
                callEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 });
                row('person', person.name)?.classList.add('hot');
                await runner.wait(450);
                if (runner.isStopped()) {
                    return;
                }
                const drawn = person.pets.map((petName, k) => {
                    const path = addLink(person, petName);
                    path.animate(
                        [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
                        { duration: 600, delay: k * 160, easing: 'ease-in-out', fill: 'forwards' }
                    );
                    runner.wait(600 + k * 160).then(() => {
                        if (runner.isStopped()) {
                            return;
                        }
                        const petRow = row('pet', petName);
                        petRow?.classList.add('hot');
                        petRow?.querySelector('.pop-paw')?.animate(
                            [{ transform: 'none' }, { transform: 'scale(1.5)' }, { transform: 'none' }],
                            { duration: 450, easing: POP }
                        );
                    });
                    return path;
                });
                await runner.wait(900 + (person.pets.length - 1) * 160);
                if (runner.isStopped()) {
                    return;
                }
                callEl.textContent = '//> [' + person.pets.map(p => 'RxDocument ' + p).join(', ') + ']';
                await runner.wait(1500);
                if (runner.isStopped()) {
                    return;
                }
                drawn.forEach(path => {
                    path.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' })
                        .finished.catch(() => { }).then(() => path.remove());
                });
                svg.querySelectorAll('.pop-row.hot').forEach(r => r.classList.remove('hot'));
                await runner.wait(400);
            }
        })();
        return () => {
            runner.stop();
            links.innerHTML = '';
            svg.querySelectorAll('.pop-row.hot').forEach(r => r.classList.remove('hot'));
        };
    }, []);

    return (
        <div className="rx-population">
            <style>{`
                .rx-population { line-height: 0; }
                .rx-population > svg { display: block; width: 100%; height: auto; }
                ${logoColorsCss('.rx-population')}
                .rx-population text { font-family: "Atkinson Hyperlegible Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
                .rx-population .pop-panel { fill: #171A29; stroke: #262B40; stroke-width: 1; }
                .rx-population .pop-label { fill: #A29DB6; font-size: 7.5px; letter-spacing: .04em; }
                .rx-population .pop-bg { fill: #1E2236; stroke: #262B40; stroke-width: 1; transition: stroke .25s; }
                .rx-population .pop-row.hot .pop-bg { stroke: #ED168F; }
                .rx-population .pop-name { fill: #ECE9F2; font-size: 8px; }
                .rx-population .pop-ref { fill: #A29DB6; font-size: 6px; }
                .rx-population .pop-person { fill: #FFFFFF; }
                .rx-population .pop-paw { transform-box: fill-box; transform-origin: center; }
                .rx-population .pop-link { fill: none; stroke: #ED168F; stroke-width: 1.4; stroke-linecap: round; stroke-dasharray: 1; stroke-dashoffset: 1; }
                .rx-population .pop-call { fill: #ED168F; font-size: 9px; }
                @media (prefers-reduced-motion: reduce) {
                    .rx-population .pop-bg { transition: none; }
                }
            `}</style>
            <svg
                ref={svgRef}
                viewBox="0 0 300 180"
                role="img"
                aria-label="Person documents hold the ids of their pets. populate('pets') follows each id into the pets collection and resolves the pet documents."
            >
                <rect className="pop-panel" x="8" y="6" width="116" height="148" rx="5" />
                <rect className="pop-panel" x="176" y="6" width="116" height="148" rx="5" />
                <svg x="14" y="11" width="8" height="10.8" viewBox="0 0 103.33 140"><LogoParts /></svg>
                <text className="pop-label" x="26" y="19">db.humans</text>
                <svg x="182" y="11" width="8" height="10.8" viewBox="0 0 103.33 140"><LogoParts /></svg>
                <text className="pop-label" x="194" y="19">db.pets</text>
                {PEOPLE.map(p => (
                    <g key={p.name} className="pop-row" data-person={p.name}>
                        <rect className="pop-bg" x="14" y={p.y} width="104" height="30" rx="3" />
                        <circle className="pop-person" cx="27" cy={p.y + 11} r="3.6" />
                        <path className="pop-person" d={'M20.5 ' + (p.y + 24) + ' a6.5 6.5 0 0 1 13 0z'} />
                        <text className="pop-name" x="36" y={p.y + 13}>{p.name}</text>
                        <text className="pop-ref" x="36" y={p.y + 23}>{petsLabel(p.pets)}</text>
                    </g>
                ))}
                {PETS.map(p => (
                    <g key={p.name} className="pop-row" data-pet={p.name}>
                        <rect className="pop-bg" x="182" y={p.y} width="104" height="22" rx="3" />
                        <g className="pop-paw" fill={p.color}>
                            <ellipse cx="195" cy={p.y + 13.5} rx="3.4" ry="2.8" />
                            <circle cx="190.6" cy={p.y + 8.5} r="1.4" />
                            <circle cx="193.6" cy={p.y + 6.8} r="1.4" />
                            <circle cx="196.6" cy={p.y + 6.8} r="1.4" />
                            <circle cx="199.4" cy={p.y + 8.5} r="1.4" />
                        </g>
                        <text className="pop-name" x="206" y={p.y + 14}>{p.name}</text>
                        <text className="pop-ref" x="280" y={p.y + 14} textAnchor="end">{p.kind}</text>
                    </g>
                ))}
                <g className="pop-links"></g>
                <text className="pop-call" x="150" y="172" textAnchor="middle">alice.populate('pets')</text>
            </svg>
        </div>
    );
}
