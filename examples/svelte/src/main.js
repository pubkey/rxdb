import { mount } from 'svelte';
import App from './App.svelte';

/**
 * In Svelte 5 components are no longer classes,
 * they are mounted with the mount() function.
 */
const app = mount(App, { target: document.body });

export default app;
