const { initSchema } = require('../src/db/schema');
const { pool } = require('../src/db');

async function main() {
  await initSchema();
  console.log('PostgreSQL schema initialized.');
}

main()
  .catch((error) => {
    console.error('Failed to initialize schema:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
