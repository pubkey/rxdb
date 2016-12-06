import React, { Component } from 'react';
import './App.css';

import * as RxDB from '../../../';
import schema from './Schema'

RxDB.plugin(require('pouchdb-adapter-idb'))
RxDB.plugin(require('pouchdb-replication'))  //enable syncing
RxDB.plugin(require('pouchdb-adapter-http')) //enable syncing over http
const syncURL = 'http://' + window.location.hostname + ':10102/';
console.log('host: ' + syncURL);
// const syncURL = host;

class App extends Component {
  constructor(props){
    super(props)
    this.state = {
      heroes: [],
      name: '',
      color: '',
    }
    this.addHero = this.addHero.bind(this)
    this.handleNameChange = this.handleNameChange.bind(this)
    this.handleColorChange = this.handleColorChange.bind(this)
    this.handleKeyPress = this.handleKeyPress.bind(this)

  }
  componentDidMount(){
    RxDB.create('heroesReactDataBase', 'idb', 'myLongAndStupidPassword', {synced: true}).then((db) => {
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
            if (!heroes) {

                return
            }
            console.log('observable fired');
            console.dir(heroes);
            this.setState({heroes: heroes})
        });
    });
  }
  addHero() {
    const { name, color } = this.state
    this.col.insert({ name, color })
    this.setState({ name: '', color: '' })
  }
  handleNameChange(event){
    this.setState({
      name: event.target.value,
    })
  }
  handleColorChange(event){
    this.setState({
      color: event.target.value,
    })
  }
  handleKeyPress(event){
    if(event.key === 'Enter'){
      this.addHero()
    }
  }
  render() {
    return (
      <div>
        <h1> RxDB Heroes - React</h1>
        <div id="list-box" className="box">
            <h3>Heroes</h3>
            <ul id="heroes-list">
              {
                this.state.heroes.length === 0 &&
                <span>No super hero available ... just the bad guys</span>
              }

              {
                this.state.heroes.map(hero=>{
                  return (
                    <li key={hero.get('name')}>
                      <div className="color-box" style={{background: hero.get('color'), }}></div>
                      <span className="name"> {hero.get('name')} </span>
                    </li>
                  )
                })
              }
            </ul>
        </div>
        <div id="insert-box" className="box">
            <h3>Add Hero</h3>
            <input
              type="text" placeholder="Name" value={this.state.name}
              onChange={this.handleNameChange} onKeyPress={this.handleKeyPress} />
            <input
              type="text" placeholder="Color" value={this.state.color}
              onChange={this.handleColorChange} onKeyPress={this.handleKeyPress} />
            <button onClick={this.addHero}>Insert a Hero</button>
        </div>
      </div>
    );
  }
}

export default App;
