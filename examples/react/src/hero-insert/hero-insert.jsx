import React, { Component, useState } from 'react';
import { useRxCollection } from 'rxdb/plugins/react';


const HeroInsert = () => {
    const collection = useRxCollection('heroes');

    const [ name, setName ] = useState('');
    const [ color, setColor ] = useState('');

    const addHero = async (event) => {
        event.preventDefault();
        if (collection == null) {
            return;
        }

        const addData = {
            name,
            color
        };

        await collection.insert(addData);
        setName('');
        setColor('');
    };

    const handleNameChange = (event) => setName(event.target.value);

    const handleColorChange = (event) => setColor(event.target.value);

    return (
        <div id="insert-box" className="box">
            <h3>Add Hero</h3>
            <form onSubmit={addHero}>
                <input name="name" type="text" placeholder="Name" value={name} onChange={handleNameChange} />
                <input name="color" type="text" placeholder="Color" value={color} onChange={handleColorChange} />
                <button type="submit">Insert a Hero</button>
            </form>
        </div>
    );
};

export default HeroInsert;
