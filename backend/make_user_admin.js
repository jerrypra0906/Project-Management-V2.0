import 'dotenv/config';
import store from './store.js';

async function makeUserAdmin(email) {
  try {
    const data = await store.read();
    
    // Find user by email (case-insensitive)
    const user = data.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      console.log('\nAvailable users:');
      data.users.forEach(u => {
        console.log(`  - ${u.email} (${u.name}) - Admin: ${!!u.isAdmin}`);
      });
      process.exit(1);
    }
    
    console.log(`\n📋 Current user info:`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Is Admin: ${!!user.isAdmin}`);
    console.log(`  Email Activated: ${user.emailActivated}`);
    console.log(`  Active: ${user.active}`);
    
    // Update user to admin
    user.isAdmin = true;
    user.role = 'Admin'; // Set role to Admin
    user.emailActivated = true;
    user.active = true;
    
    console.log(`\n🔄 Updating user to admin...`);
    await store.write(data);
    
    // Verify the update
    const verifyData = await store.read();
    const updatedUser = verifyData.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());
    
    console.log(`\n✅ User updated successfully!`);
    console.log(`  Email: ${updatedUser.email}`);
    console.log(`  Name: ${updatedUser.name}`);
    console.log(`  Is Admin: ${!!updatedUser.isAdmin}`);
    console.log(`  Role: ${updatedUser.role}`);
    console.log(`  Email Activated: ${updatedUser.emailActivated}`);
    console.log(`  Active: ${updatedUser.active}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error making user admin:', error);
    process.exit(1);
  }
}

// Get email from command line argument or use default
const email = process.argv[2] || 'stevanus.kurniawan@energi-up.com';
makeUserAdmin(email);
