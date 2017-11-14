const RxDB = require('../../');
RxDB.plugin(require('pouchdb-adapter-node-websql'));

const humanSchema = {
    title: 'human schema',
    version: 0,
    description: 'describes a human being',
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            primary: true
        },
        firstName: {
            type: 'string'
        }
    },
    required: ['firstName']
};

const run = async function() {
    const db = await RxDB.create({
        name: './db/foobar',
        password: 'askjldhflaksjhflaksjhf',
        adapter: 'websql'
    });
    console.log('db created');

    const collection = await db.collection({
        name: 'humans',
        schema: humanSchema
    });
    console.log('collection created');

    const doc = await collection.insert({
        passportId: 'foo',
        firstName: 'Piotr'
    });
    console.log('document created');

    await doc.collection.database.destroy();
    console.log('database destroyed');

    process.exit();
};

run();
