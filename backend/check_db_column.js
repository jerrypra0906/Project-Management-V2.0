import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const databaseUrl =
  process.env.DATABASE_URL ||
  'postgres://postgres:postgres123@postgres:5432/project_management_v2';

const pool = new Pool({ connectionString: databaseUrl });

async function checkColumn() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT * FROM "users" WHERE email = $1', ['admin@example.com']);
    if (res.rows.length > 0) {
      const row = res.rows[0];
      console.log('Row keys:', Object.keys(row));
      console.log('isAdmin (quoted):', row.isAdmin);
      console.log('isadmin (lowercase):', row.isadmin);
      console.log('Full row:', JSON.stringify(row, null, 2));
    }
  } finally {
    client.release();
    await pool.end();
  }
}

checkColumn();

