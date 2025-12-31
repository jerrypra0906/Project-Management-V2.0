import 'dotenv/config';
import store from './store.js';

async function testRead() {
  const data = await store.read();
  const adminUser = data.users.find(u => u.email?.toLowerCase() === 'admin@example.com');
  
  if (adminUser) {
    console.log('Admin user from store.read():');
    console.log(JSON.stringify(adminUser, null, 2));
  } else {
    console.log('Admin user not found in store.read()');
  }
}

testRead();

