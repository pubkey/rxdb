import { writable } from 'svelte/store';

export const noteList = writable([]);
export const selectedNote = writable({});
export const name = writable('');
export const body = writable('');
