<script>
	import { onMount } from 'svelte';
	import { selectedNote, name, body } from '$lib/stores';
	import { getDb } from '$lib/db';
	const isEmptyObject = (obj) =>
		obj && Object.keys(obj).length === 0 && obj.constructor === Object;
	let db$;
	const resetForm = () => {
		name.set('');
		body.set('');
		selectedNote.set({});
	};
	onMount(async () => {
		db$ = await getDb();
	});

	const saveNote = async () => {
		await db$.notes
			.findOne($name)
			.exec()
			.then(async (note) => {
				if (note) {
					let data = { ...note.toJSON() };
					data.body = $body;
					data.updatedAt = new Date().getTime();
					await note.atomicPatch(data).then(resetForm);
				} else {
					let data = {
						name: $name,
						body: $body,
						createdAt: new Date().getTime(),
						updatedAt: new Date().getTime()
					};
					await db$.notes.insert(data).then(resetForm);
				}
			});
	};
</script>

<div>
	<h2>Note Editor</h2>
	<input bind:value={$name} placeholder="Note Title" />
	<textarea bind:value={$body} placeholder="Note Content..." />
	<button on:click={saveNote}>Save Note</button>
</div>

<style>
	h2 {
		margin-top: 0;
	}
	div {
		/* margin: 10px 20px 20px 20px; */
		padding: 20px;
		box-sizing: border-box;
		background: #fffff3;
		border-radius: 3px;
		border: 1px solid #f7e493;
	}

	input,
	textarea {
		margin: auto;
		display: block;
		width: 100%;
		margin-bottom: 10px;
		padding: 5px;
		resize: vertical;
	}
	textarea {
		padding: 5px;
		min-height: 200px;
	}
</style>
