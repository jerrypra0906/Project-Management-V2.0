import 'dotenv/config';
import store from './store.js';

async function debugUsers() {
  try {
    const data = await store.read();
    console.log('=== All Users Debug ===');
    console.log(`Total users: ${data.users.length}\n`);
    
    data.users.forEach((user, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  isAdmin: ${user.isAdmin} (type: ${typeof user.isAdmin})`);
      console.log(`  isAdmin value: ${JSON.stringify(user.isAdmin)}`);
      console.log(`  !!isAdmin: ${!!user.isAdmin}`);
      console.log(`  Has passwordHash: ${!!user.passwordHash}`);
      console.log(`  Email Activated: ${user.emailActivated}`);
      console.log('');
    });
    
    // Check for admin@example.com specifically
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminUser = data.users.find(u => u.email?.toLowerCase() === adminEmail.toLowerCase());
    
    if (adminUser) {
      console.log(`\n✅ Found user with email ${adminEmail}:`);
      console.log(`  isAdmin: ${adminUser.isAdmin} (${typeof adminUser.isAdmin})`);
      console.log(`  !!isAdmin: ${!!adminUser.isAdmin}`);
    } else {
      console.log(`\n❌ No user found with email ${adminEmail}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugUsers();

