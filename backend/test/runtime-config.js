async function resolver() {
  const { join } = await import('path');
  const { config } = await import('dotenv');
  config({ path: join(__dirname, '..', '.env') });
  const url = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/ubanex';
  return url;
}

module.exports.databaseUrl = async function databaseUrl() {
  return resolver();
};