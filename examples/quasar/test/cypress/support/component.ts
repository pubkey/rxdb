// ***********************************************************
// This example support/component.ts is processed and
// loaded automatically before your component test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'component.supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

import './commands';
import '@cypress/code-coverage/support'; 

// Quasar styles
import 'quasar/src/css/index.sass'; // Or 'quasar/dist/quasar.prod.css' if no CSS preprocessor is installed
// Change this if you have a different entrypoint for the main scss.
import 'src/css/app.scss'; // Or 'src/css/app.css' if no CSS preprocessor is installed

// ICON SETS
// If you use multiple or different icon-sets then the default, be sure to import them here.
import 'quasar/dist/icon-set/material-icons.umd.prod';
import '@quasar/extras/material-icons/material-icons.css';

import { installQuasarPlugin } from '@quasar/quasar-app-extension-testing-e2e-cypress';
import { Dialog } from 'quasar';

// Since Cypress v10 we cannot import `config` directly from VTU as Cypress bundles its own version of it
// See https://github.com/cypress-io/cypress/issues/22611
import { VueTestUtils } from 'cypress/vue';
const { config } = VueTestUtils;

// Example to import i18n from boot and use as plugin
// import { i18n } from 'src/boot/i18n';

// You can modify the global config here for all tests or pass in the configuration per test
// For example use the actual i18n instance or mock it
// config.global.plugins.push(i18n);
config.global.mocks = {
  $t: () => '',
};

// Overwrite the transition and transition-group stubs which are stubbed by test-utils by default.
// We do want transitions to show when doing visual testing :)
config.global.stubs = {};

installQuasarPlugin({ plugins: { Dialog } });
