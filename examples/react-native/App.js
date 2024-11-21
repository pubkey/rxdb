import './shim';
import 'react-native-get-random-values';

import React, {useEffect, useState} from 'react';
import Heroes from './Heroes';
import initializeDb from './initializeDb';
import { AppContext } from "./context";

export const App = () => {
    const [db, setDb] = useState(null);

    useEffect(() => {
        const initDB = async () => {
            const _db = await initializeDb(true);
            setDb(_db);
        };
        initDB().then();
    }, []);

    return (
        <AppContext.Provider value={{ db }}>
            <Heroes />
        </AppContext.Provider>
    );
};

export default App;
