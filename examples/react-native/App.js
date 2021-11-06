import React, { useEffect, useState } from 'react';
import { addPouchPlugin } from 'rxdb';
import { Provider } from 'rxdb-hooks';
import Heroes from './Heroes';
import initializeDb from './initializeDb';

addPouchPlugin(require('pouchdb-adapter-asyncstorage').default);
addPouchPlugin(require('pouchdb-adapter-http'));

export const App = () => {
    const [db, setDb] = useState(null);

    useEffect(() => {
        const initDB = async () => {
            const _db = await initializeDb();
            setDb(_db);
        };
        initDB();
    }, []);

    return (
        <Provider db={db}>
            <Heroes />
        </Provider>
    );
};

export default App;
