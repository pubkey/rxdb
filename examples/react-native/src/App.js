import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { Heroes } from './components';
import { AppContext } from './AppContext';
import { initializeDb } from './rxdb';

void SplashScreen.preventAutoHideAsync();

export const App = () => {
    const [appIsReady, setAppIsReady] = useState(false);
    const db = useRef(null);

    useEffect(() => {
        async function prepare() {
            try {
              db.current = await initializeDb()
            } catch (e) {
                console.warn(e);
            } finally {
                setAppIsReady(true);
            }
        }

        void prepare();
    }, []);

    const onLayoutRootView = useCallback(async () => {
        if (appIsReady) {
            console.log('Hiding splashscreen');
            await SplashScreen.hideAsync();
        }
    }, [appIsReady]);

    if (!appIsReady) {
        return null;
    }

    return (
        <View
            style={styles.container}
            onLayout={onLayoutRootView}>
            <AppContext.Provider value={{ db: db.current }}>
                <Heroes/>
            </AppContext.Provider>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    }
});

export default App;
