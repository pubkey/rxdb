import React, { Component } from 'react';
import './App.css';

import * as Rxdb from 'rxdb';
import schema from './Schema'
Rxdb.plugin(require('pouchdb-adapter-idb'))
const syncURL = 'http://' + window.location.hostname + ':10102/';
console.log('host: ' + syncURL);
// const syncURL = host;

class App extends Component {
  constructor(props){
    super(props)
    this.state = {
      loading: false,
      heroes: [],
      name: '',
      color: '',
    }
    console.log("Rxdb: ", Rxdb);
    this.addHero = this.addHero.bind(this)
    this.handleNameChange = this.handleNameChange.bind(this)
    this.handleColorChange = this.handleColorChange.bind(this)
    this.handleKeyPress = this.handleKeyPress.bind(this)

  }
  componentDidMount(){
    Rxdb.create('heroesReactDB', 'idb', 'myLongAndStupidPassword', true).then((db) => {
        window.db = db;
        return db.collection('hero', schema);
    }).then((col) => {
        this.col = col;
        return col;
    }).then((col) => {
        console.log('DatabaseService: sync');
        col.sync(syncURL + 'hero/');
        return col;
    }).then((col) => {
        col.query().sort({name: 1}).$.subscribe((heroes) => {
            if (!heroes) {
                this.setState({loading: true})
                return
            }
            console.log('observable fired');
            console.dir(heroes);
            this.setState({heroes: heroes, loading: false})
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
        <h1> RxDB Heroes React</h1>
        <div id="list-box" className="box">
            <h3>Heroes</h3>
            <ul id="heroes-list">
              {
                this.state.loading &&
                <span>Loading ...</span>
              }
              {
                this.state.heroes.map(hero=>{
                  return (
                    <li key={hero.get('name')}>
                      <div className="color-box" style={{background: hero.get('color')}}></div>
                      <div className="name"> {hero.get('name')} </div>
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
            <button onClick={this.addHero}>Insert</button>
        </div>
      </div>
    );
  }
}

export default App;
