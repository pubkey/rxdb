import React, { useEffect, useState } from 'react';
import { RxDatabaseProvider } from 'rxdb/plugins/react';
import './App.css';

import { get as getDatabase } from './Database';
import HeroList from './hero-list/hero-list';
import HeroInsert from './hero-insert/hero-insert';


const App = () => {
    const [database, setDatabase] = useState();

    useEffect(() => {
        const initDb = async () => {
            const db = await getDatabase();
            setDatabase(db);
        };
        initDb();
    }, []);

    if (database == null) {
        return null;
    }
    return (
        <RxDatabaseProvider database={database}>
            <div>
                <h1>RxDB Example - React</h1>
                <HeroList/>
                <HeroInsert/>
            </div>
        </RxDatabaseProvider>
    );
};

export default App;
