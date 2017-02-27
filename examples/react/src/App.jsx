import React, {Component} from 'react';
import './App.css';

import HeroList from './hero-list/hero-list';
import HeroInsert from './hero-insert/hero-insert';

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {};
    }
    componentDidMount() {}
    componentWillUnmount() {}

    render() {
        return (
            <div>
                <h1>RxDB Example - React</h1>
                <HeroList/>
                <HeroInsert/>
            </div>
        );
    }
}

export default App;
