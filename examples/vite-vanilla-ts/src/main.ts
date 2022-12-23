/* eslint-disable @typescript-eslint/no-non-null-assertion */
import './style.css';
import typescriptLogo from './typescript.svg';
import rxdbLogo from './logo.svg';
import { setupHeroEditor } from './hero-editor';
import { setupHeroList } from './hero-list';

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
      <section>
      <h2>Editor</h2>
      <input id="heroName" placeholder="Hero Name" />
      <input id="heroColor" type="color" ></input>
      <button id="btnSave">Save</button>
      </section>
      <section>
      <h2>List</h2>
      <ul id="heroList"></ul>
      </section>
       
     </div>
     <p class="read-the-docs">
       Click on the Vite, RxDB and TypeScript logos to learn more
     </p>
  
</div>`;

setupHeroEditor({
  heroNameElement: document.querySelector<HTMLInputElement>('#heroName')!,
  heroColorElement: document.querySelector<HTMLInputElement>('#heroColor')!,
  saveElement: document.querySelector<HTMLButtonElement>('#btnSave')! ,
});

await setupHeroList({
  heroListElement: document.querySelector<HTMLUListElement>('#heroList')!
});

