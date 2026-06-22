const Database = require('better-sqlite3');
const db = new Database('sessions.db');

try {
  const schema = db.prepare('SELECT sql FROM sqlite_master WHERE name = ?').get('custom_labels');
  console.log('Schema:', schema);
} catch (e) {
  console.log('Error checking schema:', e.message);
}
