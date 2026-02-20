import {
    Selector
} from 'testcafe';
import AsyncTestUtil from 'async-test-util';
import GraphQLClient from 'graphql-client';
import {
    GRAPHQL_PORT
} from '../shared.js';

const storage = process.env.STORAGE;
if (!storage) {
    throw new Error('no storage set');
}

fixture`Example page`
    .page`http://localhost:8888/?storage=${storage}`;


/**
 * wait until everything loaded and first query has run
 */
async function waitUntilPageIsLoaded(t) {
    console.log('waitUntilPageIsLoaded()');
    await AsyncTestUtil.waitUntil(async () => {
        await assertNoErrors(t);
        const heroList = Selector('#heroes-list');
        const content = await heroList.textContent;
        const ret = !content.includes('..'); // dots mean that something is loading
        if (!ret) console.log(content);
        return ret;
    }, 0, 500);
    console.log('waitUntilPageIsLoaded(): done');
}

/**
 * Checks if there where errors on the browser console.
 * If yes, this will kill the process
 */
async function assertNoErrors(t) {
    const logs = await t.getBrowserConsoleMessages();
    console.log('logs:');
    console.dir(logs);
    if (logs.error.length > 0) {
        console.log('assertNoErrors got ' + logs.error.length + ' errors:');
        console.dir(logs.error);
        process.kill(process.pid);
    }
}

async function deleteAll(t) {
    console.log('deleteAll()');
    const heroElements = Selector('#heroes-list .hero-item');
    const amount = await heroElements.count;
    for (let i = 0; i < amount; i++) {
        await t.click('.delete-icon');
    }
    await assertNoErrors(t);

    // ensure that all are deleted
    await AsyncTestUtil.wait(100);
    const heroElementsAfter = Selector('#heroes-list .hero-item');
    const amountAfter = await heroElementsAfter.count;
    if (amountAfter > 0) {
        throw new Error('too many heroes after deleteAll() ' + amountAfter);
    }
}

async function waitUntilServerIsOnline() {
    console.log('waitUntilServerIsOnline()');
    const client = GraphQLClient({
        url: 'http://localhost:' + GRAPHQL_PORT + '/graphql'
    });
    const query = `{
        feedForRxDBReplication(lastId: "", minUpdatedAt: 0 limit: 1) {
            id
            name
            color
            updatedAt
            deleted
        }
    }`;
    await AsyncTestUtil.waitUntil(async () => {
        try {
            await client.query(query);
            return true;
        } catch {
            return false;
        }
    });
    console.log('waitUntilServerIsOnline(): done');
}

test('insert/remove a hero', async t => {
    console.log('start test insert/remove a hero');
    await waitUntilServerIsOnline();
    await waitUntilPageIsLoaded(t);
    await assertNoErrors(t);
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

    await AsyncTestUtil.waitUntil(async () => {
        console.log('wait until the hero is emitted in the query');
        const heroElements = Selector('#heroes-list .hero-item');
        const amount = await heroElements.count;
        return amount === 1;
    }, 0, 500);

    const heroElements = Selector('#heroes-list .hero-item');
    await t.expect(heroElements.textContent).contains('Kelso', 'list-item contains name');

    // remove again
    await t.click('.delete-icon');

    await assertNoErrors(t);
});


test.page(
    'http://localhost:' + GRAPHQL_PORT + '/static/multitab.html?frames=2&storage=' + storage
)(
    'replication: insert/delete hero and check other tab',
    async t => {
        console.log('replication: insert/delete hero and check other tab');

        // clear both iframes
        console.log('clear both iframes');
        await t.switchToIframe('#frame_0');
        await waitUntilPageIsLoaded(t);
        await deleteAll(t);


        await AsyncTestUtil.wait(10000);

        await t.switchToMainWindow();
        await t.switchToIframe('#frame_1');
        await waitUntilPageIsLoaded(t);
        await deleteAll(t);

        // insert one hero
        console.log('insert one hero');
        await t.switchToMainWindow();
        await t.switchToIframe('#frame_0');
        await Selector('#insert-box button');
        await t
            .typeText('#insert-box input[name=name]', 'SteveIrwin')
            .typeText('#insert-box input[name=color]', 'red')
            .click('#insert-box button');


        // check if in other iframe
        console.log('check if in other iframe');
        await t.switchToMainWindow();
        await t.switchToIframe('#frame_1');
        await waitUntilPageIsLoaded(t);

        await AsyncTestUtil.waitUntil(async () => {
            console.log('wait until the hero is replicated to the other frame');
            await assertNoErrors(t);
            const heroElements = Selector('#heroes-list .hero-item');
            const amount = await heroElements.count;
            if (amount > 1) {
                throw new Error('too many heroes ' + amount);
            }
            return amount === 1;
        }, 0, 500);

        const heroListElement = Selector('#heroes-list .hero-item:last-of-type');
        await t.expect(heroListElement.textContent).contains('Irwin', 'list-item contains name');

        // delete hero
        console.log('delete hero');
        await deleteAll(t);

        // check if deletion was replicated
        await t.switchToMainWindow();
        await t.switchToIframe('#frame_0');
        await AsyncTestUtil.waitUntil(async () => {
            console.log('wait until the hero is deleted on the other frame');
            await assertNoErrors(t);
            const heroElements = Selector('#heroes-list .hero-item');
            const amount = await heroElements.count;
            return amount === 0;
        }, 1000 * 60, 500);
        console.log('wait until the hero is deleted on the other frame: done');

        await assertNoErrors(t);
    });
