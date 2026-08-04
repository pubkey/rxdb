<script>
  import { db, noteForm, resetForm } from './store.svelte.js';

  const saveNote = async () => {
    const db$ = await db();
    if (noteForm.selectedNote) {
      /**
       * incrementalPatch() is used instead of update() because it does not
       * need an extra plugin and it retries on conflicts.
       * The name is the primaryKey of the schema, so it is not patched here.
       */
      await noteForm.selectedNote.incrementalPatch({
        body: noteForm.body,
        updatedAt: new Date().getTime(),
      });
    } else {
      await db$.notes.insert({
        name: noteForm.name,
        body: noteForm.body,
        createdAt: new Date().getTime(),
        updatedAt: new Date().getTime(),
      });
    }
    resetForm();
  };
</script>

<div>
  <h2>NoteEditor.svelte</h2>
  <!-- The title is the primaryKey of a note, it cannot be changed after the insert. -->
  <input
    bind:value={noteForm.name}
    readonly={!!noteForm.selectedNote}
    placeholder="Note Title"
  />
  <textarea bind:value={noteForm.body} placeholder="Note Content..."></textarea>
  <button onclick={saveNote}>Save Note</button>
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
