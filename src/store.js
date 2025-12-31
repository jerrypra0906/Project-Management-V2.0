import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = process.env.DATA_PATH || path.join(__dirname, '..', 'data.json');

function read() {
  if (!fs.existsSync(dataPath)) return { departments: [], users: [], initiatives: [], changeRequests: [], tags: [], initiativeTags: [], statusHistory: [], milestoneHistory: [] };
  return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
}

function write(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

export default { read, write, dataPath };


