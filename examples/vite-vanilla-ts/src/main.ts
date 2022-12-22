/* eslint-disable @typescript-eslint/no-non-null-assertion */
import './style.css';
import typescriptLogo from './typescript.svg';
import rxdbLogo from './rxdb.svg';
import { setupNoteEditor } from './note-editor';
import { setupNoteList } from './note-list';


document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<div>
  <a href="https://vitejs.dev" target="_blank">
    <img src="/vite.svg" class="logo" alt="Vite logo" />
  </a>
  <a href="https://rxdb.info/" target="_blank">
    <img src="${rxdbLogo}" class="logo rxdb" alt="RxDB logo" />
  </a>
  <a href="https://www.typescriptlang.org/" target="_blank">
    <img src="${typescriptLogo}" class="logo vanilla" alt="Typescript logo" />
  </a>
  <h1>Vite + RxDB + TypeScript</h1>
  <div class="card">
    <h2>NoteEditor Vite</h2>
    <input id="noteName" placeholder="Note Title" />
    <textarea id="noteBody" placeholder="Note Content..."></textarea>
    <button id="noteSave">Save Note</button>
  </div>
  <p class="read-the-docs">
    Click on the Vite, RxDB and TypeScript logos to learn more
  </p>
</div>
`;

setupNoteEditor({
  noteNameElement: document.querySelector<HTMLInputElement>('#noteName')!,
  noteBodyElement: document.querySelector<HTMLInputElement>('#noteBody')!,
  saveElement: document.querySelector<HTMLButtonElement>('#noteSave')! ,
});

await setupNoteList({
  noteListElement: document.querySelector<HTMLUListElement>('#noteList')!
});
