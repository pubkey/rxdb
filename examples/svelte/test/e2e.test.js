import { Selector } from 'testcafe';
import AsyncTestUtil from 'async-test-util';

fixture`Svelte + RxDB Note-taking App Demo`
    .page`http://localhost:5000/`;

test('insert/edit/remove a note', async t => {
    // clear previous notes
    const noteElements = Selector('#note-list li');
    const amount = await noteElements.count;

    for (let i = 0; i < amount; i++) {
        await t.click('.btn-delete');
    }

    // input title
    const noteTitleInput = Selector('input');
    await t
        .expect(noteTitleInput.value).eql('', 'input is empty')
        .typeText(noteTitleInput, 'My Note Title')
        .expect(noteTitleInput.value).contains('My', 'input contains name');

    // input note body
    const noteBodyTextarea = Selector('textarea');
    await t
        .expect(noteBodyTextarea.value).eql('', 'input is empty')
        .typeText(noteBodyTextarea, 'This is the content of the note.')
        .expect(noteBodyTextarea.value).contains('content', 'input contains content');

    // submit
    await t.click('button');
    await AsyncTestUtil.wait(200);

    const noteListElement = Selector('#note-list li');
    await t.expect(noteListElement.textContent).contains('My', 'list-item contains title match');
});
