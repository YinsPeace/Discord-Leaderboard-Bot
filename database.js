const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS token_scores (
        user_id BIGINT PRIMARY KEY,
        score INTEGER DEFAULT 0
      );
    `);
    console.log('token_scores Table created or verified successfully');

    await pool.query(`
    CREATE TABLE IF NOT EXISTS point_scores (
      user_id BIGINT PRIMARY KEY,
      score INTEGER DEFAULT 0,
      seasons_played INTEGER DEFAULT 0,
      top_30_finishes INTEGER DEFAULT 0
    );
    `);
    console.log('point_scores Table created or verified successfully');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_wallets (
        user_id BIGINT PRIMARY KEY,
        wallet_address TEXT NOT NULL
      );
    `);
    console.log('user_wallets Table created or verified successfully');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bot_settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT
      );
    `);
    console.log('bot_settings Table created or verified successfully');

    const productionRunSetting = await pool.query(`
      INSERT INTO bot_settings (setting_key, setting_value)
      VALUES ('production_run', '1')
      ON CONFLICT (setting_key) DO NOTHING;
    `);
    if (productionRunSetting.rowCount > 0) {
      console.log('Production run setting initialized.');
    } else {
      console.log('Production run setting already exists.');
    }
  } catch (err) {
    console.error('Error initializing the database:', err);
  }
}

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Successfully connected to the database');
    client.release();
  } catch (err) {
    console.error('Error connecting to the database', err);
  }
}

module.exports = { 
  db: pool, 
  initDb,
  testConnection
};
