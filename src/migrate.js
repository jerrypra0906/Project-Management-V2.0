import store from './store.js';
import crypto from 'crypto';

const data = store.read();
if (!Array.isArray(data.departments)) data.departments = [];
if (!Array.isArray(data.users)) data.users = [];
if (!Array.isArray(data.initiatives)) data.initiatives = [];
if (!Array.isArray(data.changeRequests)) data.changeRequests = [];
if (!Array.isArray(data.tags)) data.tags = [];
if (!Array.isArray(data.initiativeTags)) data.initiativeTags = [];
if (!Array.isArray(data.statusHistory)) data.statusHistory = [];
if (!Array.isArray(data.milestoneHistory)) data.milestoneHistory = [];
if (!Array.isArray(data.changeHistory)) data.changeHistory = [];

// Seed minimal reference data if empty
if (data.departments.length === 0) {
  data.departments.push({ id: crypto.randomUUID(), name: 'IT' });
}
if (data.users.length === 0) {
  const depId = data.departments[0].id;
  data.users.push(
    { id: crypto.randomUUID(), name: 'PMO', email: 'pmo@example.com', role: 'PMO', departmentId: depId, active: true },
    { id: crypto.randomUUID(), name: 'IT PIC', email: 'itpic@example.com', role: 'ITPIC', departmentId: depId, active: true },
    { id: crypto.randomUUID(), name: 'Business Owner', email: 'bo@example.com', role: 'BusinessOwner', departmentId: depId, active: true }
  );
}

store.write(data);
console.log('Initialized JSON datastore at', store.dataPath);


