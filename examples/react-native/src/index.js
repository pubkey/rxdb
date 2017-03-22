import { Subject } from 'rxjs';

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


import {
    default as randomToken
} from 'random-token';
import 'babel-polyfill';
import * as RxDB from 'rxdb';
import schema from './Schema';

RxDB.plugin(require('pouchdb-adapter-asyncstorage').default);
const syncURL = 'http://localhost:10102/';

const testPouch = async function() {
    const pouch = new RxDB.PouchDB('testpouch', {adapter: 'asyncstorage'});
    const _id=randomToken(6);
    await pouch.put({_id, value: 'val'});
    const doc = pouch.get(_id);
    return doc;
};

const testRxJS = async function(){
  const sub  = new Subject();
};

export default class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            heroes: [],
            name: '',
            color: 'steelblue',
            pouchWorks: null,
            col: null
        };
        this.addHero = this.addHero.bind(this);
        this.col = null;
    }
    componentDidMount() {
        console.log('componentDidMount');

        testPouch().then(ok => {
            this.setState({pouchWorks: JSON.stringify(ok)});
        });

        testRxJS();

        RxDB.create('heroesReactDataBase1', 'asyncstorage', 'myLongAndStupidPassword', true).then((db) => {
            window.db = db;
            return db.collection('heroes', schema);
        }).then(col => {
            console.log('created collection:');
            this.col = col;
            return col;
        }).then(col => {
          col.find().sort({name: 1}).$.subscribe((heroes) => {
            if (!heroes) return;
            console.log('observable fired');
            this.setState({heroes: heroes});
          });
        });
        // TODO fix sync
        /*        .then((col) => {
            console.log('DatabaseService: sync');
            col.sync(syncURL + 'heroes/');
            return col;
        })*/

    }
    addHero() {
        const name = this.state.name;
        console.log('addHero: '+name);
        const color = this.getRandomColor();
        console.log('color: '+color);
        this.col.insert({name, color});
        this.setState({name: '', color: ''});
    }
    getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color ='#';
        while(color.length < 7)
            color += letters[Math.floor(Math.random() * 16)];
        return color;
    }
    render() {
        return (
            <View style={styles.topContainer}>
                <StatusBar backgroundColor="#55C7F7" barStyle="light-content"/>
                <Text style={styles.title}>React native rxdb example</Text>

                <ScrollView style={styles.heroesList}>
                    <View style={styles.card}>
                      { this.state.name.length>1 &&
                        <TouchableOpacity onPress={this.addHero}>
                            <Image style={styles.plusImage} source={require('./plusIcon.png')}/>
                        </TouchableOpacity>
                      }
                        <TextInput style={styles.input}
                          value={this.state.name}
                          onChangeText={(name) => this.setState({name})}
                          />
                    </View>
                    {this.state.heroes.length === 0 && <Text>No heroes to display ...</Text>}
                    {this.state.heroes.map((hero, index) => (
                        <View style={styles.card} key={index}>
                            <View style={[
                                styles.colorBadge, {
                                    backgroundColor: hero.get('color')
                                }
                            ]}/>
                          <Text style={styles.heroName}>{hero.get('name')}</Text>
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
