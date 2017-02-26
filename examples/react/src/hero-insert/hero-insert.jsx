import React, {Component} from 'react';
import * as Database from '../Database';
import './hero-insert.css';

class HeroInsert extends Component {

    constructor(props) {
        super(props);
        this.state = {
            name: '',
            color: ''
        };
        this.subs = [];
        this.addHero = this.addHero.bind(this);
        this.handleNameChange = this.handleNameChange.bind(this);
        this.handleColorChange = this.handleColorChange.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);
    }

    componentDidMount() {}
    componentWillUnmount() {}

    async addHero() {
        const {name, color} = this.state;
        const db = await Database.get();
        db.heroes.insert({name, color});
        this.setState({name: '', color: ''});
    }
    handleNameChange(event) {
        this.setState({name: event.target.value});
    }
    handleColorChange(event) {
        this.setState({color: event.target.value});
    }
    handleKeyPress(event) {
        if (event.key !== 'Enter')
            return;
        this.addHero();
    }
    render() {
        return (
            <div id="insert-box" className="box">
                <h3>Add Hero</h3>
                <input type="text" placeholder="Name" value={this.state.name} onChange={this.handleNameChange} onKeyPress={this.handleKeyPress}/>
                <input type="text" placeholder="Color" value={this.state.color} onChange={this.handleColorChange} onKeyPress={this.handleKeyPress}/>
                <button onClick={this.addHero}>Insert a Hero</button>
            </div>
        );
    }
}

export default HeroInsert;
