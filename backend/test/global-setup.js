module.exports = async function globalSetup() {
  const { Client } = await import('pg');
  const { databaseUrl } = await import('./runtime-config.js');
  const devUrl = new URL(await databaseUrl());

  const dbName = 'ubanex_test';
  if (devUrl.pathname.slice(1) === dbName) {
    console.log(`[test] la base ya es ${dbName}; no se recrea.`);
    return;
  }

  const adminUrl = new URL(devUrl.toString());
  adminUrl.pathname = '/postgres';

  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (rowCount === 0) {
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`[test] base ${dbName} creada.`);
    } else {
      console.log(`[test] base ${dbName} ya existía.`);
    }
  } finally {
    await client.end();
  }
};