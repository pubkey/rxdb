import { RxDatabase } from 'rxdb';
import { RxHeroesCollections } from './types';


export function addClickHandlers(database: RxDatabase<RxHeroesCollections>) {
    const insertButton = document.querySelector('#insert-button');

    // set up click handlers
    (window as any).deleteHero = async (name: string) => {
        console.log('delete doc ' + name);
        const doc = await database.heroes.findOne(name).exec();
        if (doc) {
            console.log('got doc, remove it');
            try {
                await doc.remove();
            } catch (err) {
                console.error('could not remove doc');
                console.dir(err);
            }
        }
    };
    (insertButton as any).onclick = async function () {
        const name = (document.querySelector('input[name="name"]') as any).value;
        const color = (document.querySelector('input[name="color"]') as any).value;
        const obj = {
            name: name,
            color: color,
            updatedAt: new Date().getTime(),
            replicationRevision: '1'
        };
        await database.heroes.insert(obj);
        (document.querySelector('input[name="name"]') as any).value = '';
        (document.querySelector('input[name="color"]') as any).value = '';
    };
}
