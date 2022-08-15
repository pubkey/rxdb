// rxdb uses TextEncoder so we need to polyfill it
import 'text-encoding-polyfill';

import { registerRootComponent } from 'expo';
import { App } from './App';

registerRootComponent(App);
