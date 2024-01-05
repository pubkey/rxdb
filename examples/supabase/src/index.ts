import '../public/style.css';

import { startReplication } from './replication';
import { createDatabase } from './database';
import { addClickHandlers } from './handlers';

window.addEventListener('unhandledrejection', (e) => {
    console.error(
        `got unhandled error`,
        e.reason.message,
        JSON.stringify({
            // @ts-expect-error ignore
            frame: e.currentTarget?.ifrm?.id,
        }),
        e
    );
});

async function run() {
    console.log('run()', { location: window.location.pathname });

    const heroesList = document.querySelector('#heroes-list');
    if (!heroesList) {
        // if no heroes list we're on some other page like multitab, skip
        return;
    }

    heroesList.innerHTML = 'Create database..';
    const database = await createDatabase();

    heroesList.innerHTML = 'Subscribe to query..';
    database.heroes
        .find({
            sort: [{ name: 'asc' }],
        })
        .$.subscribe((heroes) => {
            console.log('emitted heroes:');
            console.dir(heroes.map((d) => d.toJSON(true)));
            let html = '';
            heroes.forEach((hero) => {
                html += `
                    <li class="hero-item">
                        <div class="color-box" style="background:${hero.color}"></div>
                        <div class="name">${hero.name} (updatedAt: ${hero.updatedAt})</div>
                        <div class="delete-icon" onclick="window.deleteHero('${hero.primary}')">DELETE</div>
                    </li>
                `;
            });
            heroesList.innerHTML = html;
        });

    startReplication(database);
    addClickHandlers(database);
}

document.addEventListener('DOMContentLoaded', () => run(), false);
