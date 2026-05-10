const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'parigina.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS menu_categories (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      slug       TEXT NOT NULL UNIQUE,
      sort_order INTEGER DEFAULT 0,
      is_active  INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id   INTEGER NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
      name          TEXT NOT NULL,
      price         REAL NOT NULL,
      description   TEXT,
      photo         TEXT,
      badge_veggie  INTEGER DEFAULT 0,
      badge_piquant INTEGER DEFAULT 0,
      badge_truffe  INTEGER DEFAULT 0,
      is_featured   INTEGER DEFAULT 0,
      is_available  INTEGER DEFAULT 1,
      sort_order    INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS horaires (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      day_of_week  INTEGER NOT NULL UNIQUE,
      day_name_fr  TEXT NOT NULL,
      day_name_en  TEXT NOT NULL,
      day_name_it  TEXT NOT NULL,
      opens        TEXT,
      closes       TEXT,
      is_closed    INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS gallery (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      filename   TEXT NOT NULL,
      caption    TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS testimonials (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      author     TEXT NOT NULL,
      rating     INTEGER DEFAULT 5,
      content    TEXT NOT NULL,
      date_str   TEXT,
      source     TEXT DEFAULT 'Google',
      is_visible INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      email         TEXT,
      created_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id   INTEGER,
      username   TEXT,
      action     TEXT NOT NULL,
      details    TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

initDB();

module.exports = db;
