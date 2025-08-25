import {
    Selector,
    ClientFunction
} from 'testcafe';
import AsyncTestUtil from 'async-test-util';

console.log('open page');

fixture`Example page`
    .page`http://localhost:8888/`;


test.page('http://localhost:8888/')('insert/edit/remove a hero', async t => {

    // check if pouchdb server is up
    const res = await fetch('http://localhost:10101/');
    const data = await res.json();
    if (!data.version) {
        throw new Error('pouchdb-server not up ' + JSON.stringify(data));
    }
    console.log('PouchDB server is up with version ' + data.version);


    // clear previous heroes
    const heroElements = Selector('.hero-list-component mat-list-item');
    console.log('Angular first render done');
    const amount = heroElements.count;
    for (let i = 0; i < amount; i++) {
        await t.click('.delete-button');
    }
    console.log('deleted all previous entries');

    // input name
    const heroNameInput = Selector('.hero-insert-component #insert-name');
    await t
        .expect(heroNameInput.value).eql('', 'input is empty')
        .typeText(heroNameInput, 'BobKelso')
        .expect(heroNameInput.value).contains('Kelso', 'input contains name');

    // input color
    const heroColorInput = Selector('.hero-insert-component #insert-color');
    await t
        .expect(heroColorInput.value).eql('', 'input is empty')
        .typeText(heroColorInput, 'black')
        .expect(heroColorInput.value).contains('black', 'input contains color');

    // submit
    await t.click('.hero-insert-component button');
    await AsyncTestUtil.wait(200);

    const heroListElement = Selector('.hero-list-component mat-list-item');
    await t.expect(heroListElement.textContent).contains('Kelso', 'list-item contains name');


    // open edit form
    await t.click('.edit-button');

    // set value
    await t
        .click('hero-edit input[type=number]')
        .pressKey('ctrl+a delete');
    await t.typeText('hero-edit input[type=number]', '11');
    await t.click('hero-edit .submitButton');
    await AsyncTestUtil.wait(100);

    // edit form should be closed
    if (await Selector('.hero-edit-component').exists) {
        throw new Error('edit not closed');
    }

    // remove again
    await t.click('.delete-button');
});


test.page('http://localhost:8888/multitab.html?frames=2')('multitab: insert hero and check other tab', async t => {

    await t.switchToIframe('#frame_0');

    // w8 until loaded
    await Selector('.hero-insert-component button');

    await t
        .typeText('.hero-insert-component #insert-name', 'SteveIrwin')
        .typeText('.hero-insert-component #insert-color', 'red')
        .click('.hero-insert-component button');

    await t.switchToMainWindow();

    // check if in other iframe
    await t.switchToIframe('#frame_1');
    await AsyncTestUtil.wait(100);
    const heroElements = Selector('.hero-list-component mat-list-item');
    await t.expect(heroElements.count).eql(1);

    const heroListElement = Selector('.hero-list-component mat-list-item:last-of-type');
    await t.expect(heroListElement.textContent).contains('Irwin', 'list-item contains name');
});

const tabsAmount = 4;
test.page('http://localhost:8888/multitab.html?frames=' + tabsAmount)('leader-election: Exact one tab should become leader', async t => {

    // wait until last tab loaded
    await t.switchToIframe('#frame_' + (tabsAmount - 1));
    await AsyncTestUtil.wait(1000);
    console.log('insert !!!');
    const heroNameInput = Selector('.hero-insert-component #insert-name');
    await t.typeText(heroNameInput, 'foobar');
    await t.switchToMainWindow();

    // wait until at least one becomes leader
    let currentLeader = null;
    await AsyncTestUtil.waitUntil(async () => {
        console.log('await leader once!');
        let ret = false;
        for (let i = 0; i < tabsAmount; i++) {
            await t.switchToIframe('#frame_' + i);
            const title = await Selector('title').innerText;
            if (title.includes('♛')) {
                currentLeader = i;
                ret = true;
            }
            await t.switchToMainWindow();
        }
        return ret;
    }, 10 * 1000, 100);

    await AsyncTestUtil.wait(200); // w8 a bit
    // ensure still only one is leader
    let leaderAmount = 0;
    for (let i = 0; i < tabsAmount; i++) {
        await t.switchToIframe('#frame_' + i);
        const title = await Selector('title').innerText;
        if (title.includes('♛'))
            leaderAmount++;
        await t.switchToMainWindow();
    }
    if (leaderAmount !== 1)
        throw new Error('more than one tab is leader');



    //    console.log('leaderAmount: ' + leaderAmount);
    //    console.log('currentLeader: ' + currentLeader);

    // kill the leader
    await t
        .typeText('#removeId', currentLeader + '')
        .click('#submit');

    // wait until next one becomes leader
    await AsyncTestUtil.wait(200);
    const leaders = [];
    await AsyncTestUtil.waitUntil(async () => {
        let ret = false;
        for (let i = 0; i < tabsAmount; i++) {
            if (i !== currentLeader) {
                await t.switchToIframe('#frame_' + i);
                const title = await Selector('title').innerText;
                // console.log(title);
                if (title.includes('♛')) {
                    leaders.push(i);
                    ret = true;
                }
                await t.switchToMainWindow();
            }
        }
        return ret;
    });

    //    console.dir(leaders);

});
