// Only required for Sveltekit
// import { sveltekit } from '@sveltejs/kit/vite';

import type { UserConfig } from 'vite';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';

const config: UserConfig = {
	resolve: {
		alias: {
			events: 'rollup-plugin-node-polyfills/polyfills/events'
		}
	},
	// Only required for Sveltekit
	// plugins: [sveltekit()],
	optimizeDeps: {
		esbuildOptions: {
			plugins: [NodeModulesPolyfillPlugin()]
		}
	}
};

export default config;
