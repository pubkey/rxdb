import knex from 'knex';

export default knex({
  client: 'sqlite3',
  connection: 'rxdb-examples-quasar.sqlite',
  useNullAsDefault: true
})