import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const databaseUrl =
  process.env.DATABASE_URL ||
  'postgres://postgres:postgres123@postgres:5432/project_management_v2';

const pool = new Pool({ connectionString: databaseUrl });

async function fixAdmin() {
  const client = await pool.connect();
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.ADMIN_PASSWORD || 'Admin123!';
    
    // Import bcrypt
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash(password, 10);
    
    // Start transaction
    await client.query('BEGIN');
    
    try {
      // Delete any duplicate admin@example.com users first (keep only one)
      const deleteResult = await client.query(
        `DELETE FROM "users" WHERE LOWER("email") = LOWER($1) AND "isAdmin" = false`,
        [email]
      );
      
      // Update existing admin user or check if one exists
      let result = await client.query(
        `UPDATE "users" 
         SET "isAdmin" = true, 
             "passwordHash" = $1, 
             "emailActivated" = true,
             "active" = true,
             "role" = 'Admin'
         WHERE LOWER("email") = LOWER($2)
         RETURNING id, name, email, "isAdmin"`,
        [passwordHash, email]
      );
      
      if (result.rows.length === 0) {
        // User doesn't exist, create it
        const crypto = await import('crypto');
        const id = crypto.randomUUID();
        await client.query(
          `INSERT INTO "users"("id", "name", "email", "role", "departmentId", "active", "passwordHash", "isAdmin", "emailActivated", "activationToken", "activationTokenExpiry")
           VALUES ($1, $2, $3, 'Admin', NULL, true, $4, true, true, NULL, NULL)`,
          [id, process.env.ADMIN_NAME || 'Administrator', email, passwordHash]
        );
        console.log('Created admin user');
      } else {
        console.log('Updated admin user:', result.rows[0]);
      }
      
      // Commit transaction
      await client.query('COMMIT');
      
      // Verify the update
      const verify = await client.query(
        `SELECT id, email, "isAdmin", "passwordHash" IS NOT NULL as has_password FROM "users" WHERE LOWER("email") = LOWER($1)`,
        [email]
      );
      console.log('Verification:', verify.rows[0]);
      
      console.log('\n✅ Admin user fixed!');
      console.log('  Email:', email);
      console.log('  Password:', password);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Error fixing admin:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixAdmin();
