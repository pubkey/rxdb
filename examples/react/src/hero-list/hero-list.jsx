import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { useLiveRxQuery } from 'rxdb/plugins/react';

import './hero-list.css';

const query = {
    collection: 'heroes',
    query: {
        selector: {},
        sort: [{ name: 'asc' }],
    }
};

const HeroList = () => {
    const { results, loading } = useLiveRxQuery(query);

    const deleteHero = async (hero) => {
        console.log('delete hero:');
        console.dir(hero);
        await hero.remove();
    };

    const editHero = async (hero) => {
        console.log('edit hero:');
        console.dir(hero);
    };

    return (
        <div id='list-box' className='box'>
            <h3>Heroes</h3>
            {loading && <span>Loading...</span>}
            {!loading && results.length === 0 && <span>No heroes</span>}
            {!loading && (
                <ul id='heroes-list'>
                    {results.map((hero) => {
                        return (
                            <li key={hero.name}>
                                <div
                                    className='color-box'
                                    style={{
                                        background: hero.color,
                                    }}
                                ></div>
                                <span className='name'>{hero.name}</span>
                                <div className='actions'>
                                    {/* <i className='fa fa-pencil-square-o' aria-hidden='true' onClick={() => editHero(hero)}></i> */}
                                    <FontAwesomeIcon
                                        className='delete'
                                        aria-hidden='true'
                                        icon={faTrash}
                                        onClick={() => deleteHero(hero)}
                                    >
                                        DELETE
                                    </FontAwesomeIcon>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default HeroList;
