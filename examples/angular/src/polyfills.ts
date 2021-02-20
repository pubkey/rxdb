(window as any).global = window;
(window as any).process = {
    env: { DEBUG: undefined },
};

/*
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js/dist/zone';  // Included with Angular CLI.
/**
 * IMPORTANT: RxDB creates rxjs observables outside of angulars zone
 * So you have to import the rxjs patch to ensure changedetection works correctly.
 */
import 'zone.js/dist/zone-patch-rxjs';
