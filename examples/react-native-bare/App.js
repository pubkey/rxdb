import React, { useState, useEffect } from 'react';
import type { Node } from 'react';
import {
  SafeAreaView,
  StatusBar,
  useColorScheme,
} from 'react-native';
import Heroes from './Heroes';
import initializeDb from './initializeDb';
import { AppContext } from "./context";

import {
  Colors,
} from 'react-native/Libraries/NewAppScreen';

const App: () => Node = () => {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

    const [db, setDb] = useState(null);

    useEffect(() => {
        const initDB = async () => {
            const _db = await initializeDb();
            setDb(_db);
        };
        initDB().then();
    }, []);

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContext.Provider value={{ db }}>
        <Heroes />
      </AppContext.Provider>
    </SafeAreaView>
  );
};

export default App;
