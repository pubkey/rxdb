# plugins-folder

This folder contains folders with `package.json`-files for each plugin. This allows to import plugins like `import { RxDBEncryptionPlugin } from 'rxdb/plugins/encryption';` while rollup, webpack and node can still cherry-pick between `main`, `jsnext:main` and `module` to determine which files to include.
