import React, { useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useRxCollection, useRxQuery } from 'rxdb/plugins/react';
import { HeroesCollectionName } from "./initializeDb";

const { width } = Dimensions.get('window');

const query = {
    collection: HeroesCollectionName,
    query: {
        selector: {},
        sort: [{ name: 'asc' }],
    },
    live: true,
};

const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    while (color.length < 7) color += letters[Math.floor(Math.random() * 16)];
    return color;
};

export const Heroes = () => {
    const [ name, setName ] = useState('');
    const { results } = useRxQuery(query);
    const collection = useRxCollection(HeroesCollectionName);

    const addHero = async () => {
        console.log('addHero: ' + name);
        const color = getRandomColor();
        console.log('color: ' + color);
        await collection.insert({ name, color });
        setName('');
    };

    const removeHero = async (hero) => {
        Alert.alert(
            'Delete hero?',
            `Are you sure you want to delete ${hero.get('name')}`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'OK',
                    onPress: async () => {
                        const doc = db[HeroesCollectionName].findOne({
                            selector: {
                                name: hero.get('name'),
                            },
                        });
                        await doc.remove();
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.topContainer}>
            <StatusBar backgroundColor="#55C7F7" barStyle="light-content" />
            <Text style={styles.title}>React native rxdb example</Text>

            <ScrollView style={styles.heroesList}>
                <View style={styles.card}>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={(name) => setName(name)}
                        placeholder="Type to add a hero..."
                        onSubmitEditing={addHero}
                    />
                    {name.length > 1 && (
                        <TouchableOpacity onPress={addHero}>
                            <Image
                                style={styles.plusImage}
                                source={require('./src/plusIcon.png')}
                            />
                        </TouchableOpacity>
                    )}
                </View>
                {results.length === 0 && <Text>No heroes to display ...</Text>}
                {results.map((hero, index) => (
                    <View style={styles.card} key={index}>
                        <View
                            style={[
                                styles.colorBadge,
                                {
                                    backgroundColor: hero.get('color'),
                                },
                            ]}
                        />
                        <Text style={styles.heroName}>{hero.get('name')}</Text>
                        <TouchableOpacity
                            onPress={() => removeHero(hero)}
                            style={styles.alignRight}
                        >
                            <Image
                                style={styles.deleteImage}
                                source={require('./assets/deleteIcon.png')}
                            />
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};
const styles = StyleSheet.create({
    topContainer: {
        alignItems: 'center',
        backgroundColor: '#55C7F7',
        flex: 1,
    },
    title: {
        marginTop: 55,
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
        marginLeft: 'auto',
    },
    deleteImage: {
        width: 30,
        height: 30,
        marginRight: 15,
    },
    alignRight: {
        marginLeft: 'auto',
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

export default Heroes;
