import React, { createContext, useEffect, useState } from 'react';
import Heroes from './Heroes';
import initializeDb from './initializeDb';


export const AppContext = createContext();

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
        <AppContext.Provider value={{ db }}>
            <Heroes />
        </AppContext.Provider>
    );
};

export default App;
