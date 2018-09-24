const RxDB = require('rxdb');

const RxDBServerPlugin = require('rxdb/plugins/server');
RxDB.plugin(RxDBServerPlugin);

const PouchdbAdapterMemory = require('pouchdb-adapter-memory');
RxDB.plugin(PouchdbAdapterMemory);


const schema = require('./app/src/schemas/hero.schema.json');


async function run() {
    console.log('run:');
    const db = await RxDB.create({
        name: 'heroes',
        adapter: 'memory',
        queryChangeDetection: false,
        multiInstance: false
    });

    await db.collection({
        name: 'hero',
        schema
    });

    await db.server({
        path: '/db',
        port: 10101,
        cors: true
    });

    db.hero.find().sort('name').$.subscribe(heroDocs => {
        const show = heroDocs.map(d => ({
            name: d.name,
            color: d.color,
            hp: d.hp
        }));
        process.stdout.write("\033c");
        console.table(show);
    });
}

run();
