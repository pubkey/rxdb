import {
    Selector
} from 'testcafe';
import AsyncTestUtil from 'async-test-util';

import {
    GRAPHQL_PORT
} from '../shared';

fixture`Example page`
    .page`http://0.0.0.0:8888/`;


/**
 * wait until everything loaded and first query has run
 */
async function waitUntilPageIsLoaded() {
    await AsyncTestUtil.waitUntil(async () => {
        const heroList = Selector('#heroes-list');
        const content = await heroList.textContent;
        return !content.includes('..'); // dots mean that something is loading
    });
}

async function deleteAll(t) {
    const heroElements = Selector('#heroes-list .hero-item');
    const amount = await heroElements.count;
    for (let i = 0; i < amount; i++) {
        await t.click('.delete-icon');
    }
}

test('insert/remove a hero', async t => {
    await waitUntilPageIsLoaded();
    await deleteAll(t);

    // clear previous heroes

    // input name
    const heroNameInput = Selector('#insert-box input[name=name]');
    await t
        .expect(heroNameInput.value).eql('', 'input is empty')
        .typeText(heroNameInput, 'BobKelso')
        .expect(heroNameInput.value).contains('Kelso', 'input contains name');

    // input color
    const heroColorInput = Selector('#insert-box input[name=color]');
    await t
        .expect(heroColorInput.value).eql('', 'input is empty')
        .typeText(heroColorInput, 'black')
        .expect(heroColorInput.value).contains('black', 'input contains color');

    // submit
    await t.click('#insert-button');
    await AsyncTestUtil.wait(200);

    const heroElements = Selector('#heroes-list .hero-item');
    await t.expect(heroElements.textContent).contains('Kelso', 'list-item contains name');

    // remove again
    await t.click('.delete-icon');
});


test.page(
    'http://0.0.0.0:' + GRAPHQL_PORT + '/static/multitab.html?frames=2'
)(
    'replication: insert/delete hero and check other tab',
    async t => {

        // clear both iframes
        await t.switchToIframe('#frame_0');
        await waitUntilPageIsLoaded();
        await deleteAll(t);
        await t.switchToMainWindow();
        await t.switchToIframe('#frame_1');
        await waitUntilPageIsLoaded();
        await deleteAll(t);

        // insert one hero
        await t.switchToMainWindow();
        await t.switchToIframe('#frame_0');
        await Selector('#insert-box button');
        await t
            .typeText('#insert-box input[name=name]', 'SteveIrwin')
            .typeText('#insert-box input[name=color]', 'red')
            .click('#insert-box button');


        // check if in other iframe
        await t.switchToMainWindow();
        await t.switchToIframe('#frame_1');
        await waitUntilPageIsLoaded();

        // wait until the hero is replicated to the other frame
        await AsyncTestUtil.waitUntil(async () => {
            const heroElements = Selector('#heroes-list .hero-item');
            const amount = await heroElements.count;
            return amount === 1;
        });

        const heroListElement = Selector('#heroes-list .hero-item:last-of-type');
        await t.expect(heroListElement.textContent).contains('Irwin', 'list-item contains name');

        // delete hero
        await deleteAll(t);

        // check if deletion was replicated
        await t.switchToMainWindow();
        await t.switchToIframe('#frame_0');
        // wait until the hero is deleted on the other frame
        await AsyncTestUtil.waitUntil(async () => {
            const heroElements = Selector('#heroes-list .hero-item');
            const amount = await heroElements.count;
            return amount === 0;
        });
    });