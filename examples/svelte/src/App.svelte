<script>
  import NoteEditor from './NoteEditor.svelte';
  import NoteList from './NoteList.svelte';
</script>

<main>
  <h1>RxDB Svelte Note App Demo</h1>
  <div>
    <NoteList />
    <NoteEditor />
  </div>
</main>

<style>
  main {
    margin: auto;
    max-width: 1080px;
    padding: 10px;
    border-radius: 6px;
    background-color: #fff;
  }
  h1 {
    text-align: center;
  }
  div {
    display: flex;
    flex-direction: column;
  }
</style>
