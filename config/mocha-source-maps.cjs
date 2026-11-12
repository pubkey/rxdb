/**
 * Makes Node.js use the source maps of the transpiled files,
 * so that stack traces point to the original typescript files.
 * This is done at runtime instead of with the --enable-source-maps flag,
 * because mocha spawns a new process for Node.js flags
 * which drops the loader of scripts that run mocha via tsx.
 */
process.setSourceMapsEnabled(true);
