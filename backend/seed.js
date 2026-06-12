const Database = require('better-sqlite3');
const db = new Database('sessions.db');

const stmt = db.prepare('INSERT OR IGNORE INTO sessions (id, name, prompt, isActive, replyDelay, msgCount) VALUES (?, ?, ?, ?, ?, ?)');

db.transaction(() => {
  for (let i = 1; i <= 1000; i++) {
    stmt.run(`bot-agent-${i}`, `Agent ${i}`, 'You are a helpful AI assistant.', 1, 0, 0);
  }
})();

console.log('Successfully inserted 1000 sessions.');
