import {
    ScrollView,
    StyleSheet,
    Text,
    View,
    Dimensions,
    StatusBar,
    Image,
    TextInput,
    TouchableOpacity
} from 'react-native';
import React from 'react';
const {width, height} = Dimensions.get('window');

import * as RxDB from 'rxdb';
//import schema from './Schema';

//RxDB.plugin(require('pouchdb-adapter-leveldb'));
//RxDB.plugin(require('pouchdb-adapter-asyncstorage').default);
const syncURL = 'http://localhost:10102/';

export default class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            heroes: [
                {
                    name: 'Abdellah',
                    color: 'papayawhip'
                }
            ],
            name: '',
            color: 'steelblue'
        };
        this.handleNameChange = this.handleNameChange.bind(this);
        this.addHero = this.addHero.bind(this);
    }
    componentDidMount() {
        console.log('componentDidMount');

  //      RxDB.create('heroesReactDataBase', 'asyncstorage', 'myLongAndStupidPassword', {synced: true});
        /*        RxDB.create('heroesReactDataBase', 'asyncstorage', 'myLongAndStupidPassword', {synced: true}).then((db) => {
            window.db = db;
            return db.collection('heroes', schema);
        }).then((col) => {
            this.col = col;
            return col;
        }).then((col) => {
            console.log('DatabaseService: sync');
            col.sync(syncURL + 'heroes/');
            return col;
        }).then((col) => {
            col.query().sort({name: 1}).$.subscribe((heroes) => {
                if (!heroes)
                    return;

                console.log('observable fired');
                console.dir(heroes);
                this.setState({heroes: heroes});
            });
        });*/
    }
    addHero() {
        const {name} = this.state;
        const color = this.getRandomColor();

        this.col.insert({name, color});
        this.setState({name: '', color: ''});
    }
    getRandomColor() {
        const letters = '0123456789ABCDEF';
        for (let i = 0, color = '#'; i < 6; i++)
            color += letters[Math.floor(Math.random() * 16)];

        return color;
    }
    handleNameChange(event) {
        this.setState({name: event.target.value});
    }
    render() {
        return (
            <View style={styles.topContainer}>
                <StatusBar backgroundColor="#55C7F7" barStyle="light-content"/>
                <Text style={styles.title}>React native rxdb example</Text>

                <ScrollView style={styles.heroesList}>

                    <View style={styles.card}>
                        <TouchableOpacity onPress={this.addHero}>
                            <Image style={styles.plusImage} source={require('./plusIcon.png')}/>
                        </TouchableOpacity>
                        <TextInput style={styles.input} value={this.state.name} onChange={this.handleNameChange}/>
                    </View>
                    {this.state.heroes.length === 0 && <Text>No heroes to display ...</Text>
}
                    {this.state.heroes.map((hero, index) => (
                        <View style={styles.card} key={index}>
                            <View style={[
                                styles.colorBadge, {
                                    backgroundColor: hero.color
                                }
                            ]}/>
                            <Text style={styles.heroName}>{hero.name}</Text>
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
        flex: 1
    },
    title: {
        marginTop: 25,
        fontSize: 25,
        color: 'white',
        fontWeight: '500'
    },
    heroesList: {
        marginTop: 30,
        borderRadius: 5,
        flex: 1,
        width: width - 30,
        paddingLeft: 15,
        marginHorizontal: 15,
        backgroundColor: 'white'
    },
    plusImage: {
        width: 30,
        height: 30,
        marginRight: 15
    },
    input: {
        flex: 1,
        color: '#D2DCE1'
    },
    card: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-start',

        marginLeft: 12,
        paddingVertical: 15,
        borderBottomColor: '#D2DCE1',
        borderBottomWidth: .5
    },
    colorBadge: {
        height: 30,
        width: 30,
        borderRadius: 15,
        marginRight: 15
    },
    heroName: {
        fontSize: 18,
        fontWeight: '200',
        marginTop: 3
    }
});
