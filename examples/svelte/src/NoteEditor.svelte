<script>
  import { db, selectedNote, name, body } from './store';

  const isEmptyObject = (obj) => obj && Object.keys(obj).length === 0 && obj.constructor === Object;

  const resetForm = () => {
    name.set('');
    body.set('');
    selectedNote.set({});
  };

  const saveNote = async () => {
    const db$ = await db();
    if (isEmptyObject($selectedNote)) {
      await db$.notes
        .insert({
          name: $name,
          body: $body,
          createdAt: new Date().getTime(),
          updatedAt: new Date().getTime(),
        })
        .then(resetForm);
    } else {
      await $selectedNote
        .update({
          $set: {
            name: $name,
            body: $body,
            updatedAt: new Date().getTime(),
          },
        })
        .then(resetForm);
    }
  };
</script>

<div>
  <h2>NoteEditor.svelte</h2>
  <input bind:value={$name} placeholder="Note Title" />
  <textarea bind:value={$body} placeholder="Note Content..." />
  <button on:click={saveNote}>Save Note</button>
</div>

<style>
  h2 {
    margin-top: 0;
  }
  div {
    margin: 10px 20px 20px 20px;
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
    resize: vertical;
  }
  textarea {
    min-height: 200px;
  }
</style>
