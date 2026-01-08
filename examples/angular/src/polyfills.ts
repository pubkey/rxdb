(window as any).global = window;
(window as any).process = {
    env: { DEBUG: undefined },
};

import 'zone.js';  // Included with Angular CLI.
