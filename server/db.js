const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL não configurada.');
}

const pool = new Pool({
    connectionString
});

module.exports = {
    pool,
    query(text, params) {
        return pool.query(text, params);
    }
};
