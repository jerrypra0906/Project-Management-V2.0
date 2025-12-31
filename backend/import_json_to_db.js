import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import store from './store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const jsonPath = path.join(__dirname, '..', 'data.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('data.json not found at', jsonPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(jsonPath, 'utf8');
  const parsed = JSON.parse(raw);

  const data = {
    departments: parsed.departments || [],
    users: parsed.users || [],
    initiatives: parsed.initiatives || [],
    changeRequests: parsed.changeRequests || [],
    tags: parsed.tags || [],
    initiativeTags: parsed.initiativeTags || [],
    statusHistory: parsed.statusHistory || [],
    milestoneHistory: parsed.milestoneHistory || [],
    changeHistory: parsed.changeHistory || [],
  };

  await store.write(data);
  console.log('Imported JSON data into PostgreSQL at', store.databaseUrl);
}

run().catch(err => {
  console.error('Failed to import JSON into DB:', err);
  process.exit(1);
});

