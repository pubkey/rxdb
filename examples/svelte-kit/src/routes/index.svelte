<script>
	import NoteEditor from '../components/NoteEditor.svelte';
	import NoteList from '../components/NoteList.svelte';
</script>

<header class="header">
	<h1 class="logo">Notes</h1>
</header>

<section class="notesapp">
	<NoteList />
	<NoteEditor />
</section>
