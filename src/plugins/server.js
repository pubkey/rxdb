import express from 'express';
import ExpressPouchDB from 'express-pouchdb';

// import FullPouch from 'pouchdb';
import PouchDB from '../pouch-db';
import RxError from '../rx-error';

export async function spawnServer({
    path = '/db',
    port = 3000
}) {
    const db = this;
    const pseudo = PouchDB.defaults({
        adapter: db.adapter
    });

    const app = express();

    // tunnel requests so collection-names can be used as paths
    // TODO do this for all collections that exist or come
    app.use(path + '/human', function(req, res, next) {
        console.log('#### one req:');
        console.dir(req.baseUrl);
        if (req.baseUrl === '/db/human') {
            console.log('# tunnel:');
            const to = db.name + '-rxdb-0-human';
            const toFull = req.originalUrl.replace('/db/human', '/db/' + to);
            req.originalUrl = toFull;
            console.dir(toFull);
        }
        next();
    });


    app.use('*', function(req, res, next) {
        console.log('#### log:');
        console.dir(req.baseUrl);
        next();
    });


    app.use(path, ExpressPouchDB(pseudo));
    app.listen(port);
}


export const rxdb = true;
export const prototypes = {
    RxDatabase: (proto) => {
        proto.server = spawnServer;
    }
};

export const overwritable = {};

export default {
    rxdb,
    prototypes,
    overwritable,
    spawnServer
};
