import 'dotenv/config';
import store from './store.js';

async function checkAdmin() {
  try {
    const data = await store.read();
    const adminUsers = data.users.filter(u => u.isAdmin);
    
    console.log('=== Admin User Check ===');
    console.log(`Total users: ${data.users.length}`);
    console.log(`Admin users found: ${adminUsers.length}`);
    
    if (adminUsers.length === 0) {
      console.log('\n❌ No admin user found!');
      console.log('Please run: npm run db:seed-admin');
      return;
    }
    
    adminUsers.forEach(admin => {
      console.log('\n✅ Admin user found:');
      console.log(`  ID: ${admin.id}`);
      console.log(`  Name: ${admin.name}`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  Is Admin: ${admin.isAdmin}`);
      console.log(`  Email Activated: ${admin.emailActivated}`);
      console.log(`  Has Password: ${admin.passwordHash ? 'Yes' : 'No'}`);
      console.log(`  Active: ${admin.active}`);
    });
    
    // Check if admin email from .env exists
    const envEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const envAdmin = data.users.find(u => u.email?.toLowerCase() === envEmail.toLowerCase());
    
    if (envAdmin) {
      console.log(`\n✅ Admin user with email from .env (${envEmail}) exists`);
    } else {
      console.log(`\n⚠️  Admin user with email from .env (${envEmail}) NOT found`);
      console.log('   The admin user might have a different email address');
    }
    
  } catch (error) {
    console.error('Error checking admin:', error);
  }
}

checkAdmin();

