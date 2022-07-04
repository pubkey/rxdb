import { Selector } from 'testcafe';
import AsyncTestUtil from 'async-test-util';

fixture`Svelte-kit + RxDB Note-taking App Demo`.page`http://localhost:3000/`;

test('insert/edit/remove a note', async (t) => {
	// clear previous notes
	const noteElements = Selector('#note-list li');
	const amount = await noteElements.count;

	for (let i = 0; i < amount; i++) {
		await t.click('.btn-delete');
	}
	//insert a note
	// input title
	const noteTitleInput = Selector('input');
	await t
		.expect(noteTitleInput.value)
		.eql('', 'input is empty')
		.typeText(noteTitleInput, '1')
		.expect(noteTitleInput.value)
		.contains('1', 'input contains title');

	// input note body
	const noteBodyTextarea = Selector('textarea');
	await t
		.expect(noteBodyTextarea.value)
		.eql('', 'input is empty')
		.typeText(noteBodyTextarea, 'one.')
		.expect(noteBodyTextarea.value)
		.contains('one', 'input contains content');

	// submit
	const editButton = Selector('.btn-edit');
	await t
		//first normal click on it
		.click(editButton)
		//seems there is a bug in testcafe, needed to included doubleclick as well
		// https://github.com/DevExpress/testcafe/issues/4146
		//then perform double click on it
		.doubleClick(editButton);
	await AsyncTestUtil.wait(200);

	const noteListElement = Selector('#note-list li');
	await t.expect(noteListElement.textContent).contains('1', 'list-item contains title match');
});
