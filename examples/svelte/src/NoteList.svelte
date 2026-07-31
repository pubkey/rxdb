<script>
  import { db, selectNote } from './store.svelte.js';

  let noteList = $state([]);
  let loaded = $state(false);

  /**
   * The RxDB query is subscribed inside an $effect
   * so that the subscription is cleaned up
   * when the component is destroyed.
   */
  $effect(() => {
    let subscription;
    let destroyed = false;

    db().then((db$) => {
      if (destroyed) {
        return;
      }
      subscription = db$.notes
        .find()
        .sort({ updatedAt: 'desc' })
        .$.subscribe((notes) => {
          noteList = notes;
          loaded = true;
        });
    });

    return () => {
      destroyed = true;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  });

  const deleteNote = async (note) => await note.remove();
</script>

<div>
  <h2>NoteList.svelte</h2>
  <ul id="note-list" class="nostyle">
    {#if !loaded}
      Loading Notes...
    {:else}
      {#each noteList as note (note.name)}
        <li>
          <span class="elipsis">
            <button onclick={() => selectNote(note)} class="nostyle link">{note.name}</button>
            {#if note.body !== ''}<span style="color: #757575">-</span>{/if}
            <span class="mute">
              {note.body ?? ''}
            </span>
          </span>

          <span class="meta">
            {new Date(note.updatedAt).toLocaleDateString('en-US')}
            <button onclick={() => deleteNote(note)} class="btn btn-delete">delete</button>
          </span>
        </li>
      {/each}
    {/if}
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
