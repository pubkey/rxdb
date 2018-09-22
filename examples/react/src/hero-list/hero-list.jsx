import React, {Component} from 'react';
import * as Database from '../Database';
import './hero-list.css';

class HeroList extends Component {
    state = {
        heroes: [],
        loading: true
    };
    subs = [];

    async componentDidMount() {
        const db = await Database.get();

        const sub = db.heroes.find().sort({name: 1}).$.subscribe(heroes => {
            if (!heroes) {
                return;
            }
            console.log('reload heroes-list ');
            console.dir(heroes);
            this.setState({heroes, loading: false});
        });
        this.subs.push(sub);
    }

    componentWillUnmount() {
        this.subs.forEach(sub => sub.unsubscribe());
    }

    deleteHero = async (hero) => {
        console.log('delete hero:');
        console.dir(hero);
    }

    editHero = async (hero) => {
        console.log('edit hero:');
        console.dir(hero);
    }

    renderActions = () => {
        // TODO
        // return (
        //     <div className="actions">
        //         <i className="fa fa-pencil-square-o" aria-hidden="true" onClick={() => this.editHero(hero)}></i>
        //         <i className="fa fa-trash-o" aria-hidden="true" onClick={() => this.deleteHero(hero)}></i>
        //     </div>
        // )
        return null
    }

    render() {
        const { heroes, loading } = this.state
        return (
            <div id="list-box" className="box">
                <h3>Heroes</h3>
                <ul id="heroes-list">
                    {loading && <span>Loading...</span>}
                    {!loading && heroes.length === 0 && <span>No heroes</span>}
                    {heroes.map(hero => {
                        return (
                            <li key={hero.name}>
                                <div className="color-box" style={{
                                    background: hero.color
                                }}></div>
                                <span className="name">
                                    {hero.name}
                                </span>
                                {this.renderActions()}
                            </li>
                        );
                    })}
                </ul>
            </div>
        );
    }
}

export default HeroList;
