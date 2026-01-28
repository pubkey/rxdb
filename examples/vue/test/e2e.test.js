import {
  Selector
} from 'testcafe';
import AsyncTestUtil from 'async-test-util';

fixture('Example page')
  .page('http://localhost:8888/');


test.page('http://localhost:8888/')('insert/edit/remove a hero', async (t) => {
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
  await t.click('#insert-box button');
  await AsyncTestUtil.wait(300);

  const heroListElement = Selector('#list-box .hero-name');
  await t.expect(heroListElement.textContent).contains('Kelso', 'list-item contains name');

  // remove again
  await t.click('.actions .fa-trash-o');
  await AsyncTestUtil.wait(200);
  await t.expect(Selector('#list-box .hero-name').count).eql(0);
});

test.page('http://localhost:8888/multitab.html?frames=2')('multitab: insert hero and check other tab', async (t) => {

  await t.switchToIframe('#frame_0');

  // w8 until loaded
  await Selector('#insert-box button');
  await AsyncTestUtil.wait(300);

  await t
    .typeText('#insert-box input[name=name]', 'SteveIrwin')
    .typeText('#insert-box input[name=color]', 'red')
    .click('#insert-box button');

  await t.switchToMainWindow();

  // check if in other iframe
  await t.switchToIframe('#frame_1');
  await AsyncTestUtil.wait(300);
  await Selector('#list-box .hero-name');
  const heroListElement = Selector('#list-box .hero-name');
  await t.expect(heroListElement.textContent).contains('Irwin', 'list-item contains name');
});


test.page('http://localhost:8888/multitab.html?frames=6')('leader-election: Exact one tab should become leader', async (t) => {
  // wait until last tab loaded
  await t.switchToIframe('#frame_5');
  const heroNameInput = Selector('#insert-box input[name=name]');
  await t.typeText(heroNameInput, 'foobar');
  await t.switchToMainWindow();

  // wait until at least one becomes leader
  let currentLeader = null;
  await AsyncTestUtil.waitUntil(async () => {
    let ret = false;
    for (let i = 0; i < 6; i++) {
      await t.switchToIframe('#frame_' + i);
      const title = await Selector('title').innerText;
      if (title.includes('♛')) {
        currentLeader = i;
        ret = true;
      }
      await t.switchToMainWindow();
    }
    return ret;
  });

  await AsyncTestUtil.wait(200); // w8 a bit
  // ensure still only one is leader
  let leaderAmount = 0;
  for (let i = 0; i < 6; i++) {
    await t.switchToIframe('#frame_' + i);
    const title = await Selector('title').innerText;
    if (title.includes('♛'))
      leaderAmount++;
    await t.switchToMainWindow();
  }
  if (leaderAmount !== 1)
    throw new Error('more than one tab is leader');


  // kill the leader
  await t
    .typeText('#removeId', currentLeader + '')
    .click('#submit');

  // wait until next one becomes leader
  await AsyncTestUtil.wait(200);
  const leaders = [];
  await AsyncTestUtil.waitUntil(async () => {
    let ret = false;
    for (let i = 0; i < 6; i++) {
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
});
