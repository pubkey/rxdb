import React from 'react';
import './App.css';

import HeroList from './hero-list/hero-list';
import HeroInsert from './hero-insert/hero-insert';

const App = () => {
    return (
        <div>
            <h1>RxDB Example - React</h1>
            <HeroList/>
            <HeroInsert/>
        </div>
    );
};

export default App;
