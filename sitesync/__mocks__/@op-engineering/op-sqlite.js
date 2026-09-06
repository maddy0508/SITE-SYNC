const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const testDbDir = path.join(__dirname, '../../.test-db');

if (!fs.existsSync(testDbDir)) {
  fs.mkdirSync(testDbDir, { recursive: true });
}

const openedDatabases = new Map();
let dbCounter = 0;

class MockDB {
  constructor(name) {
    this.name = name;
    const dbPath = path.join(testDbDir, `${name}.sqlite`);

    this.db = new DatabaseSync(dbPath);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.isOpen = true;
  }

  async execute(sql, params = []) {
    if (!this.isOpen) {
      throw new Error('The database connection is not open');
    }

    try {
      const stmt = this.db.prepare(sql);

      if (stmt.columns().length > 0) {
        return {
          rows: stmt.all(...params),
          rowsAffected: 0,
        };
      }

      const info = stmt.run(...params);

      return {
        rows: [],
        rowsAffected: Number(info.changes),
        insertId: Number(info.lastInsertRowid),
      };
    } catch (error) {
      throw new Error(`SQL Error: ${error.message}\nSQL: ${sql}`);
    }
  }

  async transaction(callback) {
    if (!this.isOpen) {
      throw new Error('The database connection is not open');
    }

    this.db.exec('BEGIN');

    const tx = {
      execute: (sql, params = []) => this.execute(sql, params),
    };

    try {
      const result = await callback(tx);
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      try {
        this.db.exec('ROLLBACK');
      } catch (_) {
        // Preserve the original transaction error.
      }
      throw error;
    }
  }

  async closeAsync() {
    if (this.isOpen) {
      this.db.close();
      this.isOpen = false;
    }

    return true;
  }
}

const open = jest.fn().mockImplementation(({ name }) => {
  const key = name || `test-db-${dbCounter++}`;
  const existing = openedDatabases.get(key);

  if (existing && existing.isOpen) {
    return existing;
  }

  const db = new MockDB(key);
  openedDatabases.set(key, db);

  return db;
});

const close = jest.fn().mockImplementation(async (db) => {
  if (db && typeof db.closeAsync === 'function') {
    return db.closeAsync();
  }

  return true;
});

module.exports = {
  open,
  close,
  default: {
    open,
    close,
  },
};
