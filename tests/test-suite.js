import fs from 'fs';
import store from '../backend/store.js';

const BASE_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 10000; // 10 seconds

// Test utilities
let AUTH_TOKEN = null;

async function fetchJSON(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (AUTH_TOKEN && !headers.Authorization) {
    headers.Authorization = `Bearer ${AUTH_TOKEN}`;
  }
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${body || response.statusText}`);
  }
  return response.json();
}

async function fetchText(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (AUTH_TOKEN && !headers.Authorization) {
    headers.Authorization = `Bearer ${AUTH_TOKEN}`;
  }
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status}: ${body || response.statusText}`);
  }
  return response.text();
}

async function loginIfNeeded() {
  if (AUTH_TOKEN) return AUTH_TOKEN;
  const email = process.env.TEST_EMAIL || 'jerry.pratama@energi-up.com';
  const password = process.env.TEST_PASSWORD || 'Password123';
  const res = await fetchJSON(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const token = res?.token || res?.accessToken || null;
  if (!token) {
    throw new Error('Login succeeded but token missing in response');
  }
  AUTH_TOKEN = token;
  return token;
}

// Test cases
const tests = [
  {
    name: 'Server Health Check',
    async run() {
      const response = await fetch(`${BASE_URL}/`);
      if (!response.ok) {
        throw new Error(`Server not responding: ${response.status}`);
      }
      const html = await response.text();
      if (!html.includes('Project & Change Request Management')) {
        throw new Error('Homepage content missing');
      }
      return '✅ Server is running and serving content';
    }
  },
  
  {
    name: 'Auth Login',
    async run() {
      await loginIfNeeded();
      return '✅ Login succeeded and token acquired';
    }
  },

  {
    name: 'API Endpoints Available',
    async run() {
      await loginIfNeeded();
      const endpoints = [
        '/api/initiatives',
        '/api/lookups',
        '/api/dashboard'
      ];
      
      for (const endpoint of endpoints) {
        const response = await fetch(`${BASE_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        });
        if (!response.ok) {
          throw new Error(`Endpoint ${endpoint} failed: ${response.status}`);
        }
      }
      return '✅ All API endpoints are accessible';
    }
  },
  
  {
    name: 'Project Data Loading',
    async run() {
      await loginIfNeeded();
      const data = await fetchJSON(`${BASE_URL}/api/initiatives?type=Project`);
      if (!Array.isArray(data)) {
        throw new Error('Project data is not an array');
      }
      if (data.length === 0) {
        throw new Error('No project data found');
      }
      
      const project = data[0];
      if (!project.name || !project.type) {
        throw new Error('Project data missing required fields');
      }
      if (project.type !== 'Project') {
        throw new Error('Project type mismatch');
      }
      
      return `✅ Found ${data.length} projects`;
    }
  },
  
  {
    name: 'CR Data Loading',
    async run() {
      await loginIfNeeded();
      const data = await fetchJSON(`${BASE_URL}/api/initiatives?type=CR`);
      if (!Array.isArray(data)) {
        throw new Error('CR data is not an array');
      }
      if (data.length === 0) {
        throw new Error('No CR data found');
      }
      
      const cr = data[0];
      if (!cr.name || !cr.type) {
        throw new Error('CR data missing required fields');
      }
      if (cr.type !== 'CR') {
        throw new Error('CR type mismatch');
      }
      
      return `✅ Found ${data.length} change requests`;
    }
  },
  
  {
    name: 'CR Timeline Data',
    async run() {
      await loginIfNeeded();
      const crData = await fetchJSON(`${BASE_URL}/api/initiatives?type=CR`);
      if (crData.length === 0) {
        throw new Error('No CR data to test timeline');
      }
      
      const cr = await fetchJSON(`${BASE_URL}/api/initiatives/${crData[0].id}`);
      if (!cr.cr) {
        throw new Error('CR timeline data not found');
      }
      
      const timelineFields = [
        'crSection1Start', 'crSection1End',
        'crSection2Start', 'crSection2End',
        'crSection3Start', 'crSection3End',
        'developmentStart', 'developmentEnd',
        'sitStart', 'sitEnd',
        'uatStart', 'uatEnd',
        'liveStart', 'liveEnd'
      ];
      
      for (const field of timelineFields) {
        if (!(field in cr.cr)) {
          throw new Error(`CR timeline field ${field} missing`);
        }
      }
      
      return '✅ CR timeline data structure is correct';
    }
  },
  
  {
    name: 'Lookup Data',
    async run() {
      await loginIfNeeded();
      const lookups = await fetchJSON(`${BASE_URL}/api/lookups`);
      if (!lookups.users || !Array.isArray(lookups.users)) {
        throw new Error('Users lookup missing');
      }
      if (!lookups.departments || !Array.isArray(lookups.departments)) {
        throw new Error('Departments lookup missing');
      }
      if (lookups.users.length === 0) {
        throw new Error('No users found');
      }
      if (lookups.departments.length === 0) {
        throw new Error('No departments found');
      }
      
      return `✅ Found ${lookups.users.length} users and ${lookups.departments.length} departments`;
    }
  },
  
  {
    name: 'Dashboard Data',
    async run() {
      await loginIfNeeded();
      const dashboard = await fetchJSON(`${BASE_URL}/api/dashboard`);
      if (typeof dashboard.projects !== 'number') {
        throw new Error('Dashboard missing project count');
      }
      if (!Array.isArray(dashboard.projectAging)) {
        throw new Error('Dashboard missing project aging data');
      }
      if (!Array.isArray(dashboard.milestoneDurations)) {
        throw new Error('Dashboard missing milestone durations');
      }
      
      return `✅ Dashboard shows ${dashboard.projects} projects`;
    }
  },
  
  {
    name: 'Data File Integrity',
    async run() {
      if (!fs.existsSync('./data.json')) {
        throw new Error('data.json file missing');
      }
      
      const data = JSON.parse(fs.readFileSync('./data.json', 'utf8'));
      if (!data.initiatives || !Array.isArray(data.initiatives)) {
        throw new Error('data.json missing initiatives array');
      }
      if (!data.changeRequests || !Array.isArray(data.changeRequests)) {
        throw new Error('data.json missing changeRequests array');
      }
      if (!data.changeHistory || !Array.isArray(data.changeHistory)) {
        throw new Error('data.json missing changeHistory array');
      }
      
      const projects = data.initiatives.filter(i => i.type === 'Project');
      const crs = data.initiatives.filter(i => i.type === 'CR');
      
      return `✅ Data file contains ${projects.length} projects and ${crs.length} CRs`;
    }
  },

  {
    name: 'Meeting Notes Schema Availability',
    async run() {
      const data = await store.read();
      const requiredCollections = [
        'meetingNotes',
        'meetingNoteParticipants',
        'meetingNoteActionItems',
        'meetingNoteEmailLog',
        'meetingNoteHistory',
      ];

      for (const key of requiredCollections) {
        if (!Array.isArray(data[key])) {
          throw new Error(`Missing or invalid collection: ${key}`);
        }
      }

      if (data.meetingNotes.length > 0 && !Object.prototype.hasOwnProperty.call(data.meetingNotes[0], 'deletedAt')) {
        throw new Error('meetingNotes rows should include deletedAt (soft delete support)');
      }

      return `✅ Meeting notes collections ready (${data.meetingNotes.length} notes loaded)`;
    }
  },
  
  {
    name: 'CR List Page Rendering',
    async run() {
      const response = await fetch(`${BASE_URL}/?sort=priority%3Aasc#crlist`);
      if (!response.ok) {
        throw new Error(`CR List page failed: ${response.status}`);
      }
      const html = await response.text();
      if (!html.includes('CR List')) {
        throw new Error('CR List page content missing');
      }
      if (!html.includes('main.js')) {
        throw new Error('JavaScript file not loaded');
      }
      
      return '✅ CR List page renders correctly (timeline column added by JS)';
    }
  },
  
  {
    name: 'Project Dashboard Page Rendering',
    async run() {
      const response = await fetch(`${BASE_URL}/#dashboard`);
      if (!response.ok) {
        throw new Error(`Project Dashboard page failed: ${response.status}`);
      }
      const html = await response.text();
      if (!html.includes('Project Dashboard')) {
        throw new Error('Project Dashboard page content missing');
      }
      
      return '✅ Project Dashboard page renders correctly';
    }
  }
];

// Test runner
async function runTests() {
  console.log('🧪 Starting Automated Test Suite\n');
  console.log('='.repeat(50));
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      console.log(`\n🔍 ${test.name}...`);
      const result = await Promise.race([
        test.run(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Test timeout')), TEST_TIMEOUT)
        )
      ]);
      console.log(result);
      passed++;
    } catch (error) {
      console.log(`❌ ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! System is working correctly.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please check the issues above.');
    process.exit(1);
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('test-suite.js')) {
  console.log('Test suite starting...');
  runTests().catch(error => {
    console.error('Test runner error:', error.message);
    process.exit(1);
  });
}

export { runTests, tests };
