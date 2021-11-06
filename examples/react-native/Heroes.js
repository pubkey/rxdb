import React, { useEffect, useState } from 'react';
import {
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
import { useRxCollection, useRxData } from 'rxdb-hooks';

const { width, height } = Dimensions.get('window');

const queryConstructor = (collection) => collection.find();

export const Heroes = () => {
    const { result: heroes } = useRxData('heroes', queryConstructor);

    const [name, setName] = useState('');
    const [color, setColor] = useState('steelBlue');
    const heroCollection = useRxCollection('heroes');

    const addHero = async () => {
        console.log('addHero: ' + name);
        const color = getRandomColor();
        console.log('color: ' + color);
        if (heroCollection) {
            await heroCollection.insert({ name, color });
        }
        setName('');
        setColor('');
    };
    const getRandomColor = () => {
        const letters = '0123456789ABCDEF';
        let color = '#';
        while (color.length < 7)
            color += letters[Math.floor(Math.random() * 16)];
        return color;
    };

    return (
        <View style={styles.topContainer}>
            <StatusBar backgroundColor="#55C7F7" barStyle="light-content" />
            <Text style={styles.title}>React native rxdb example</Text>

            <ScrollView style={styles.heroesList}>
                <View style={styles.card}>
                    {name.length > 1 && (
                        <TouchableOpacity onPress={addHero}>
                            <Image
                                style={styles.plusImage}
                                source={require('./src/plusIcon.png')}
                            />
                        </TouchableOpacity>
                    )}
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={(name) => setName(name)}
                        placeholder="Type to add a hero..."
                    />
                </View>
                {heroes.length === 0 && <Text>No heroes to display ...</Text>}
                {heroes.map((hero, index) => (
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
