
import '../public/style.css';

import { startReplication } from './replication';
import { createDatabase } from './database';
import { addClickHandlers } from './handlers';

const heroesList = document.querySelector('#heroes-list');

async function run() {
    console.log('run()');

    heroesList.innerHTML = 'Create database..';
    const database = await createDatabase();

    heroesList.innerHTML = 'Subscribe to query..';
    database.heroes
        .find({
            sort: [{ name: 'asc' }]
        }).$
        .subscribe(heroes => {
            console.log('emitted heroes:');
            console.dir(heroes.map(d => d.toJSON(true)));
            let html = '';
            heroes.forEach(hero => {
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
run();
