<script>
  import { onMount } from 'svelte';

  import { db, selectedNote, name, body } from './store';
  let db$;
  let noteList = [];

  onMount(() => {
    const getNoteList = async () => {
      db$ = await db();
      db$.notes
        .find()
        .sort({ updatedAt: 'desc' })
        .$.subscribe((notes) => (noteList = notes));
    };
    getNoteList();
  });

  const handleEditNote = (note) => {
    selectedNote.set(note);
    name.set(note.name);
    body.set(note.body);
  };

  const deleteNote = async (note) => await note.remove();
</script>

<div>
  <h2>NoteList.svelte</h2>
  <ul id="note-list" class="nostyle">
    {#await noteList}
      Loading Notes...
    {:then results}
      {#each results as note}
        <li>
          <span class="elipsis">
            <button on:click={() => handleEditNote(note)} class="nostyle link">{note.name}</button>
            {#if note.body !== ''}<span style="color: #757575">—</span>{/if}
            <span class="mute">
              {note.body ?? ''}
            </span>
          </span>

          <span class="meta">
            {new Date(note.updatedAt).toLocaleDateString('en-US')}
            <button on:click={() => deleteNote(note)} class="btn btn-delete">delete</button>
          </span>
        </li>
      {/each}
    {/await}
  </ul>
</div>

<style>
  h2 {
    margin-top: 0;
  }
  div {
    margin: 20px;
    background-color: #f3ffff;
    border: 1px solid #93f4f7;
    border-radius: 3px;
    box-sizing: border-box;
    padding: 20px;
  }
  .link {
    color: blue;
    cursor: pointer;
    text-decoration: underline;
  }
  .nostyle {
    list-style-type: none;
    margin: 0;
    padding: 0;
    background: transparent;
    border: none;
  }
  .btn {
    background: none;
    border: none;
    font-size: 11px;
  }
  .btn-delete {
    cursor: pointer;
    color: red;
  }
  .mute {
    color: #747474;
  }
</style>
