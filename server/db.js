const dns = require('dns');
const { Pool } = require('pg');

dns.setDefaultResultOrder('ipv4first');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL não configurada.');
}

const shouldUseSsl = process.env.PGSSLMODE === 'require'
    || /supabase\.co/i.test(connectionString)
    || /sslmode=require/i.test(connectionString);

const pool = new Pool({
    connectionString,
    ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined
});

module.exports = {
    pool,
    query(text, params) {
        return pool.query(text, params);
    }
};
