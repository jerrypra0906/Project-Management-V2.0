import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const databaseUrl =
  process.env.DATABASE_URL ||
  'postgres://postgres:postgres123@postgres:5432/project_management_v2';

const pool = new Pool({ connectionString: databaseUrl });

async function testQuery() {
  const client = await pool.connect();
  try {
    // Use the same query as store.read()
    const res = await client.query('SELECT * FROM "users"');
    const adminRow = res.rows.find(r => r.email?.toLowerCase() === 'admin@example.com');
    
    if (adminRow) {
      console.log('Admin row from SELECT *:');
      console.log('Keys:', Object.keys(adminRow));
      console.log('isAdmin:', adminRow.isAdmin, typeof adminRow.isAdmin);
      console.log('isadmin:', adminRow.isadmin, typeof adminRow.isadmin);
      console.log('passwordHash exists:', !!adminRow.passwordHash);
      console.log('Full row:', JSON.stringify(adminRow, null, 2));
    }
  } finally {
    client.release();
    await pool.end();
  }
}

testQuery();

