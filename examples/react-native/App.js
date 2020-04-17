import {
    ScrollView,
    StyleSheet,
    Text,
    View,
    Dimensions,
    StatusBar,
    Image,
    TextInput,
    TouchableOpacity,
} from 'react-native';
import React from 'react';
const { width, height } = Dimensions.get('window');

import { default as randomToken } from 'random-token';
import {
    createRxDatabase,
    addRxPlugin
} from 'rxdb';
import schema from './src/Schema';

addRxPlugin(require('pouchdb-adapter-asyncstorage').default);
addRxPlugin(require('pouchdb-adapter-http'));
const syncURL = 'http://localhost:10102/'; // Replace localhost with a public ip address!
const dbName = 'heroesreactdatabase1';

export default class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            heroes: [],
            name: '',
            color: 'steelblue',
            pouchWorks: null,
            col: null,
        };
        this.addHero = this.addHero.bind(this);
        this.col = null;
        this.subs = [];
    }
    async createDatabase() {
        const db = await createRxDatabase({
            name: dbName,
            adapter: 'asyncstorage',
            password: 'myLongAndStupidPassword',
            multiInstance: false,
        });
        const heroCollection = await db.collection({
            name: 'heroes',
            schema,
        });
        heroCollection.sync({
            remote: syncURL + dbName + '/',
            options: {
                live: true,
                retry: true,
            },
        });
        return db;
    }
    async componentDidMount() {
        this.db = await this.createDatabase();

        const sub = this.db.heroes
            .find()
            .sort({ name: 1 })
            .$.subscribe(heroes => {
                if (!heroes) return;
                console.log('observable fired');
                this.setState({ heroes: heroes });
            });
        this.subs.push(sub);
    }
    componentWillUnmount() {
        this.subs.forEach(sub => sub.unsubscribe());
    }
    async addHero() {
        const name = this.state.name;
        console.log('addHero: ' + name);
        const color = this.getRandomColor();
        console.log('color: ' + color);
        await this.db.heroes.insert({ name, color });
        this.setState({ name: '', color: '' });
    }
    getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        while (color.length < 7)
            color += letters[Math.floor(Math.random() * 16)];
        return color;
    }
    render() {
        return (
            <View style={styles.topContainer}>
                <StatusBar backgroundColor="#55C7F7" barStyle="light-content" />
                <Text style={styles.title}>React native rxdb example</Text>

                <ScrollView style={styles.heroesList}>
                    <View style={styles.card}>
                        {this.state.name.length > 1 && (
                            <TouchableOpacity onPress={this.addHero}>
                                <Image
                                    style={styles.plusImage}
                                    source={require('./src/plusIcon.png')}
                                />
                            </TouchableOpacity>
                        )}
                        <TextInput
                            style={styles.input}
                            value={this.state.name}
                            onChangeText={name => this.setState({ name })}
                        />
                    </View>
                    {this.state.heroes.length === 0 && (
                        <Text>No heroes to display ...</Text>
                    )}
                    {this.state.heroes.map((hero, index) => (
                        <View style={styles.card} key={index}>
                            <View
                                style={[
                                    styles.colorBadge,
                                    {
                                        backgroundColor: hero.get('color'),
                                    },
                                ]}
                            />
                            <Text style={styles.heroName}>
                                {hero.get('name')}
                            </Text>
                        </View>
                    ))}
                </ScrollView>
            </View>
        );
    }
}
const styles = StyleSheet.create({
    topContainer: {
        alignItems: 'center',
        backgroundColor: '#55C7F7',
        flex: 1,
    },
    title: {
        marginTop: 25,
        fontSize: 25,
        color: 'white',
        fontWeight: '500',
    },
    heroesList: {
        marginTop: 30,
        borderRadius: 5,
        flex: 1,
        width: width - 30,
        paddingLeft: 15,
        marginHorizontal: 15,
        backgroundColor: 'white',
    },
    plusImage: {
        width: 30,
        height: 30,
        marginRight: 15,
    },
    input: {
        flex: 1,
        color: '#D2DCE1',
    },
    card: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-start',

        marginLeft: 12,
        paddingVertical: 15,
        borderBottomColor: '#D2DCE1',
        borderBottomWidth: 0.5,
    },
    colorBadge: {
        height: 30,
        width: 30,
        borderRadius: 15,
        marginRight: 15,
    },
    heroName: {
        fontSize: 18,
        fontWeight: '200',
        marginTop: 3,
    },
});
