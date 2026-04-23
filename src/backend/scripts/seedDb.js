const { initSchema } = require('../src/db/schema');
const { seedDatabase } = require('../src/db/seed');
const { pool } = require('../src/db');

async function main() {
  await initSchema();
  await seedDatabase();
  console.log('PostgreSQL seed data loaded.');
}

main()
  .catch((error) => {
    console.error('Failed to seed database:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
