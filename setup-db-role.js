const { Client } = require('pg');

async function run() {
    const client = new Client({
        connectionString: 'postgresql://postgres@localhost:5432/postgres'
    });

    await client.connect();

    await client.query(`
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'essence_app') THEN
                CREATE ROLE essence_app WITH LOGIN PASSWORD 'EssenceSamDb2026' SUPERUSER;
            ELSE
                ALTER ROLE essence_app WITH LOGIN PASSWORD 'EssenceSamDb2026' SUPERUSER;
            END IF;
        END
        $$;
    `);

    await client.query(`ALTER DATABASE essence_sam OWNER TO essence_app;`);
    await client.end();
    console.log('ESSENCE_APP_ROLE_READY');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
