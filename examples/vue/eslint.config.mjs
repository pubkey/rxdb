import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import vueTsEslintConfig from '@vue/eslint-config-typescript';
import globals from 'globals';

export default [
    {
        name: 'app/files-to-lint',
        files: ['**/*.{ts,mts,tsx,vue}'],
    },

    {
        name: 'app/ignores',
        ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**'],
    },

    js.configs.recommended,
    ...pluginVue.configs['flat/essential'],
    ...vueTsEslintConfig(),

    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            ecmaVersion: 2020,
        },
        rules: {
            'semi': ['error', 'always'],
            'quotes': ['error', 'single', { 'avoidEscape': true }],
            'no-prototype-builtins': 'off',
            'no-useless-escape': 'off',
            'vue/multi-word-component-names': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/no-unused-vars': 'error',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/ban-types': 'off',
            '@typescript-eslint/no-empty-object-type': 'off'
        }
    },
    {
        files: ['test/**/*.js'],
        languageOptions: {
            globals: {
                fixture: 'readonly',
                test: 'readonly'
            }
        }
    },
    {
        files: ['vue.config.js'],
        rules: {
            '@typescript-eslint/no-require-imports': 'off'
        }
    }
];
