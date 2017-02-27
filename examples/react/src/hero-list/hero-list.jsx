import React, {Component} from 'react';
import * as Database from '../Database';
import './hero-list.css';

class HeroList extends Component {
    constructor(props) {
        super(props);
        this.state = {
            heroes: []
        };
        this.subs = [];
        this.editHero = this.editHero.bind(this);
        this.deleteHero = this.deleteHero.bind(this);
    }
    async componentDidMount() {
        const db = await Database.get();

        const sub = db.heroes.query().sort({name: 1}).$.subscribe(heroes => {
            if (!heroes)
                return;
            console.log('reload heroes-list ');
            console.dir(heroes);
            this.setState({heroes: heroes});
        });
        this.subs.push(sub);
    }
    componentWillUnmount() {
        this.subs.forEach(sub => sub.unsubscribe());
    }

    async deleteHero(hero) {
        console.log('delete hero:');
        console.dir(hero);
    }
    async editHero(hero) {}

    render() {
        return (
            <div id="list-box" className="box">
                <h3>Heroes</h3>
                <ul id="heroes-list">
                    {this.state.heroes.length === 0 && <span>Loading..</span>}
                    {this.state.heroes.map(hero => {
                        return (
                            <li key={hero.name}>
                                <div className="color-box" style={{
                                    background: hero.color
                                }}></div>
                                <span className="name">
                                    {hero.name}
                                </span>
{/* TODO                               <div className="actions">
                                    <i className="fa fa-pencil-square-o" aria-hidden="true" onClick="editHero(hero)"></i>
                                    <i className="fa fa-trash-o" aria-hidden="true" onClick={hero.remove}></i>
                                </div>
*/}                            </li>
                        );
                    })}
                </ul>
            </div>
        );
    }
}

export default HeroList;
