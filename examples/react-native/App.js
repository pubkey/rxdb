import './shim';
import 'react-native-get-random-values';

import React, {useEffect, useState} from 'react';
import { RxDatabaseProvider } from 'rxdb/plugins/react';
import Heroes from './Heroes';
import initializeDb from './initializeDb';

export const App = () => {
    const [db, setDb] = useState(null);

    useEffect(() => {
        const initDB = async () => {
            const _db = await initializeDb(true);
            setDb(_db);
        };
        initDB();
    }, []);

    if (db == null) {
        return null;
    }
    return (
        <RxDatabaseProvider database={ db }>
            <Heroes />
        </RxDatabaseProvider>
    );
};

export default App;
