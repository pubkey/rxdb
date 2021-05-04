const {
    createRxDatabase,
    addRxPlugin
} = require('rxdb');
addRxPlugin(require('pouchdb-adapter-http'));

const heroSchema = {
    title: 'hero schema',
    description: 'describes a simple hero',
    version: 0,
    type: 'object',
    properties: {
        id: {
            type: 'string',
        },
        name: {
            type: 'string',
            primary: true
        },
        color: {
            type: 'string'
        },
    },
    required: ['id', 'color'],
    attachments: {
        encrypted: true
    }
};

let _getDatabase; // cached
function getDatabase(name, adapter) {
    if (!_getDatabase) _getDatabase = createDatabase(name, adapter);
    return _getDatabase;
}

async function createDatabase(name, adapter) {
    const db = await createRxDatabase({
        name,
        adapter,
        multiInstance: true,
        password: 'myLongAndStupidPassword'
    });

    console.log('creating hero-collection..');

    await db.collection({
        name: 'heroes',
        schema: heroSchema
    });

    db.addBlobAttachment = async function ({
        doc,
        str = 'beshbarmak',
        type = 'text/plain',
        id = `blob-${(new Date()).toString()}`
    }) {
        const buffer = Buffer.from(str);
        const attachment = await doc.putAttachment({
            id,
            type,
            data: new Blob([buffer], { type }),
        });
        return attachment;
    };

    db.addHero = async function () {
        const name = document.querySelector('input[name="name"]').value;
        const color = document.querySelector('input[name="color"]').value;
        const obj = {
            id: `${name}-${color}`,
            name: name,
            color: color
        };
        console.log('inserting hero:');
        console.dir(obj);
        const doc = await db.heroes.insert(obj);
        return doc
    };

    db.addHeroWithAttachments = async function () {
        const doc = await db.addHero();
        console.log('attaching blob');
        await db.addBlobAttachment({
            doc,
            str: 'foobar2'
        });
        console.log('attaching string');
        await doc.putAttachment({
            id: 'cat.jpg',
            type: 'text/plain',
            data: 'secretpussy'
        });
    };

    return db;
}
module.exports = {
    heroSchema,
    getDatabase
};
