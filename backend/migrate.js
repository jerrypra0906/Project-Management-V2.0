import 'dotenv/config';
import dbStore from './store.js';

/**
 * Migration script to initialize database schema
 * The schema is automatically initialized on first connection,
 * but this script ensures it's set up explicitly.
 */
async function migrate() {
  try {
    console.log('Initializing database schema...');
    // Trigger schema initialization by calling read()
    // This will automatically call initializeSchema() if not already initialized
    await dbStore.read();
    console.log('Database schema initialized successfully!');
    console.log('Database URL:', dbStore.databaseUrl);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    console.error('Make sure PostgreSQL is running and accessible at:', dbStore.databaseUrl);
    process.exit(1);
  }
}

migrate();
