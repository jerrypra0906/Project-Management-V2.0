import 'dotenv/config';
import store from './store.js';

async function migrateUserRoles() {
  try {
    console.log('Starting user role migration...');
    const data = await store.read();
    
    if (!Array.isArray(data.users)) {
      console.log('No users found to migrate');
      return;
    }

    let updatedCount = 0;
    
    for (const user of data.users) {
      let updated = false;
      
      // Update ITPIC to IT
      if (user.role === 'ITPIC') {
        user.role = 'IT';
        updated = true;
        console.log(`Updated user ${user.email}: ITPIC -> IT`);
      }
      
      // Update BusinessOwner to Business User
      if (user.role === 'BusinessOwner') {
        user.role = 'Business User';
        updated = true;
        console.log(`Updated user ${user.email}: BusinessOwner -> Business User`);
      }
      
      if (updated) {
        updatedCount++;
      }
    }
    
    if (updatedCount > 0) {
      await store.write(data);
      console.log(`Migration completed. Updated ${updatedCount} users.`);
    } else {
      console.log('No users needed migration.');
    }
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateUserRoles()
    .then(() => {
      console.log('Migration finished successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

export default migrateUserRoles;

