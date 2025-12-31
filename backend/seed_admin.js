import 'dotenv/config';
import store from './store.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

async function seedAdmin() {
  const data = await store.read();
  if (!Array.isArray(data.users)) data.users = [];

  const password = process.env.ADMIN_PASSWORD || 'Admin123!';
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const name = process.env.ADMIN_NAME || 'Administrator';

  // Check if admin user already exists (by email or by isAdmin flag)
  const existingAdminByFlag = data.users.find(u => u.isAdmin);
  const existingAdminByEmail = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

  if (existingAdminByFlag && existingAdminByFlag.email?.toLowerCase() === email.toLowerCase()) {
    console.log('Admin user already exists:', existingAdminByFlag.email || existingAdminByFlag.name);
    // Ensure it has password and is activated
    if (!existingAdminByFlag.passwordHash) {
      const passwordHash = await bcrypt.hash(password, 10);
      existingAdminByFlag.passwordHash = passwordHash;
      existingAdminByFlag.isAdmin = true;
      existingAdminByFlag.emailActivated = true;
      await store.write(data);
      console.log('Updated admin user with password');
    }
    return;
  }

  // If user exists by email but isn't admin, update it
  if (existingAdminByEmail) {
    console.log('Found existing user with admin email, updating to admin...');
    const passwordHash = await bcrypt.hash(password, 10);
    existingAdminByEmail.name = name;
    existingAdminByEmail.passwordHash = passwordHash;
    existingAdminByEmail.isAdmin = true;
    existingAdminByEmail.emailActivated = true;
    existingAdminByEmail.role = 'Admin';
    existingAdminByEmail.active = true;
    existingAdminByEmail.activationToken = null;
    existingAdminByEmail.activationTokenExpiry = null;
    
    // Remove any duplicate admin@example.com users
    data.users = data.users.filter(u => {
      if (u.email?.toLowerCase() === email.toLowerCase() && u.id !== existingAdminByEmail.id) {
        return false; // Remove duplicates
      }
      return true;
    });
    
    await store.write(data);
    console.log('Updated existing user to admin:');
    console.log('  Email:', email);
    console.log('  Password:', password);
    return;
  }

  // Create new admin user
  const passwordHash = await bcrypt.hash(password, 10);
  const id = crypto.randomUUID();

  data.users.push({
    id,
    name,
    email,
    role: 'Admin',
    departmentId: null,
    active: true,
    passwordHash,
    isAdmin: true, // Use boolean true instead of 1
    emailActivated: true, // Admin is auto-activated
    activationToken: null,
    activationTokenExpiry: null,
  });

  await store.write(data);
  console.log('Seeded admin user into PostgreSQL:');
  console.log('  Email:', email);
  console.log('  Password:', password);
}

seedAdmin().catch(err => {
  console.error('Failed to seed admin user:', err);
  process.exit(1);
});

