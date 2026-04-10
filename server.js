require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { pool, query } = require('./db');
const { createToken, requireAdmin } = require('./auth');

const port = Number(process.env.PORT || 3000);
const adminEmail = process.env.ADMIN_EMAIL || 'admin@essencesam.com';
const frontendOrigin = process.env.FRONTEND_ORIGIN || '*';
const frontendRoot = path.resolve(__dirname, '..');

const defaultProducts = [];

function normalizeProduct(product) {
    return {
        id: String(product.id || '').trim(),
        name: String(product.name || '').trim(),
        category: String(product.category || '').trim(),
        price: Number(product.price || 0),
        description: String(product.description || '').trim(),
        image: String(product.image || '').trim()
    };
}

function mapProduct(row) {
    return {
        id: row.id,
        name: row.name,
        category: row.category,
        price: Number(row.price),
        description: row.description,
        image: row.image,
        is_active: row.is_active
    };
}

function mapOrder(row) {
    return {
        id: Number(row.id),
        sessionId: row.session_id,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        notes: row.notes,
        total: Number(row.total),
        source: row.source,
        status: row.status,
        createdAt: row.created_at,
        items: Array.isArray(row.items) ? row.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice)
        })) : []
    };
}

async function ensureSchema() {
    await query(`
        create table if not exists products (
            id text primary key,
            name text not null,
            category text not null,
            price numeric(10, 2) not null check (price > 0),
            description text not null,
            image text not null,
            is_active boolean not null default true,
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now()
        );
    `);

    await query(`
        create table if not exists customer_favorites (
            session_id text not null,
            product_id text not null references products(id) on delete cascade,
            created_at timestamptz not null default now(),
            primary key (session_id, product_id)
        );
    `);

    await query(`
        create table if not exists customer_cart_items (
            session_id text not null,
            product_id text not null references products(id) on delete cascade,
            quantity integer not null check (quantity > 0),
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now(),
            primary key (session_id, product_id)
        );
    `);

    await query(`
        create table if not exists orders (
            id bigserial primary key,
            session_id text,
            customer_name text,
            customer_phone text,
            notes text,
            total numeric(10, 2) not null default 0,
            source text not null default 'whatsapp',
            status text not null default 'pending',
            created_at timestamptz not null default now()
        );
    `);

    await query(`
        create table if not exists order_items (
            id bigserial primary key,
            order_id bigint not null references orders(id) on delete cascade,
            product_id text references products(id) on delete set null,
            product_name text not null,
            quantity integer not null check (quantity > 0),
            unit_price numeric(10, 2) not null check (unit_price >= 0)
        );
    `);

    await query(`
        create or replace function set_timestamp()
        returns trigger as $$
        begin
            new.updated_at = now();
            return new;
        end;
        $$ language plpgsql;
    `);

    await query('drop trigger if exists products_set_timestamp on products;');
    await query(`
        create trigger products_set_timestamp
        before update on products
        for each row execute function set_timestamp();
    `);

    await query('drop trigger if exists customer_cart_items_set_timestamp on customer_cart_items;');
    await query(`
        create trigger customer_cart_items_set_timestamp
        before update on customer_cart_items
        for each row execute function set_timestamp();
    `);
}

async function seedDefaultProducts() {
    if (!defaultProducts.length) {
        return;
    }

    for (const product of defaultProducts) {
        const normalized = normalizeProduct(product);
        await query(
            `
            insert into products (id, name, category, price, description, image, is_active)
            values ($1, $2, $3, $4, $5, $6, true)
            on conflict (id) do nothing
            `,
            [normalized.id, normalized.name, normalized.category, normalized.price, normalized.description, normalized.image]
        );
    }
}

async function removeLegacyDefaultProducts() {
    await query("delete from products where id like 'default-%'");
}

async function validateAdminPassword(password) {
    const configuredPassword = process.env.ADMIN_PASSWORD || 'essence2026';

    if (configuredPassword.startsWith('$2a$') || configuredPassword.startsWith('$2b$') || configuredPassword.startsWith('$2y$')) {
        return bcrypt.compare(password, configuredPassword);
    }

    return password === configuredPassword;
}

function createApp() {
    const app = express();

    app.use(cors({ origin: frontendOrigin === '*' ? true : frontendOrigin }));
    app.use(express.json());
    app.use(express.static(frontendRoot));

    app.get('/api/health', async (_request, response) => {
        const result = await query('select now() as now');
        response.json({ ok: true, databaseTime: result.rows[0].now });
    });

    app.post('/api/auth/login', async (request, response) => {
        const email = String(request.body.email || '').trim().toLowerCase();
        const password = String(request.body.password || '');

        if (email !== adminEmail.toLowerCase()) {
            return response.status(401).json({ message: 'E-mail ou senha inválidos.' });
        }

        const validPassword = await validateAdminPassword(password);
        if (!validPassword) {
            return response.status(401).json({ message: 'E-mail ou senha inválidos.' });
        }

        const token = createToken(adminEmail);
        return response.json({ token, admin: { email: adminEmail } });
    });

    app.get('/api/products', async (_request, response) => {
        const result = await query(
            `
            select id, name, category, price, description, image, is_active
            from products
            where is_active = true
            order by created_at desc
            `
        );

        response.json(result.rows.map(mapProduct));
    });

    app.post('/api/products', requireAdmin, async (request, response) => {
        const product = normalizeProduct({ ...request.body, id: request.body.id || `custom-${Date.now()}` });

        if (!product.id || !product.name || !product.category || !product.description || !product.image || product.price <= 0) {
            return response.status(400).json({ message: 'Dados do produto inválidos.' });
        }

        const result = await query(
            `
            insert into products (id, name, category, price, description, image, is_active)
            values ($1, $2, $3, $4, $5, $6, true)
            returning id, name, category, price, description, image, is_active
            `,
            [product.id, product.name, product.category, product.price, product.description, product.image]
        );

        response.status(201).json(mapProduct(result.rows[0]));
    });

    app.put('/api/products/:id', requireAdmin, async (request, response) => {
        const product = normalizeProduct({ ...request.body, id: request.params.id });

        if (!product.name || !product.category || !product.description || !product.image || product.price <= 0) {
            return response.status(400).json({ message: 'Dados do produto inválidos.' });
        }

        const result = await query(
            `
            update products
            set name = $2,
                category = $3,
                price = $4,
                description = $5,
                image = $6,
                is_active = true
            where id = $1
            returning id, name, category, price, description, image, is_active
            `,
            [product.id, product.name, product.category, product.price, product.description, product.image]
        );

        if (!result.rows.length) {
            return response.status(404).json({ message: 'Produto não encontrado.' });
        }

        response.json(mapProduct(result.rows[0]));
    });

    app.delete('/api/products/:id', requireAdmin, async (request, response) => {
        const result = await query('delete from products where id = $1 returning id', [request.params.id]);

        if (!result.rows.length) {
            return response.status(404).json({ message: 'Produto não encontrado.' });
        }

        response.status(204).send();
    });

    app.get('/api/customer/:sessionId/favorites', async (request, response) => {
        const result = await query(
            `
            select product_id
            from customer_favorites
            where session_id = $1
            order by created_at desc
            `,
            [request.params.sessionId]
        );

        response.json(result.rows.map((row) => row.product_id));
    });

    app.put('/api/customer/:sessionId/favorites', async (request, response) => {
        const { sessionId } = request.params;
        const productIds = Array.isArray(request.body.productIds) ? request.body.productIds : [];
        const client = await pool.connect();

        try {
            await client.query('begin');
            await client.query('delete from customer_favorites where session_id = $1', [sessionId]);

            for (const productId of productIds) {
                await client.query(
                    'insert into customer_favorites (session_id, product_id) values ($1, $2) on conflict do nothing',
                    [sessionId, String(productId)]
                );
            }

            await client.query('commit');
            response.json({ ok: true });
        } catch (error) {
            await client.query('rollback');
            throw error;
        } finally {
            client.release();
        }
    });

    app.get('/api/customer/:sessionId/cart', async (request, response) => {
        const result = await query(
            `
            select product_id, quantity
            from customer_cart_items
            where session_id = $1
            order by created_at desc
            `,
            [request.params.sessionId]
        );

        response.json(result.rows.map((row) => ({ productId: row.product_id, quantity: Number(row.quantity) })));
    });

    app.put('/api/customer/:sessionId/cart', async (request, response) => {
        const { sessionId } = request.params;
        const items = Array.isArray(request.body.items) ? request.body.items : [];
        const client = await pool.connect();

        try {
            await client.query('begin');
            await client.query('delete from customer_cart_items where session_id = $1', [sessionId]);

            for (const item of items) {
                const quantity = Number(item.quantity || 0);
                if (quantity <= 0) {
                    continue;
                }

                await client.query(
                    `
                    insert into customer_cart_items (session_id, product_id, quantity)
                    values ($1, $2, $3)
                    `,
                    [sessionId, String(item.productId), quantity]
                );
            }

            await client.query('commit');
            response.json({ ok: true });
        } catch (error) {
            await client.query('rollback');
            throw error;
        } finally {
            client.release();
        }
    });

    app.post('/api/orders', async (request, response) => {
        const items = Array.isArray(request.body.items) ? request.body.items : [];
        const sessionId = String(request.body.sessionId || '').trim() || null;
        const customerName = String(request.body.customerName || '').trim() || null;
        const customerPhone = String(request.body.customerPhone || '').trim() || null;
        const notes = String(request.body.notes || '').trim() || null;

        if (!items.length) {
            return response.status(400).json({ message: 'Pedido sem itens.' });
        }

        const total = items.reduce((sum, item) => sum + (Number(item.unitPrice || 0) * Number(item.quantity || 0)), 0);
        const client = await pool.connect();

        try {
            await client.query('begin');
            const orderResult = await client.query(
                `
                insert into orders (session_id, customer_name, customer_phone, notes, total)
                values ($1, $2, $3, $4, $5)
                returning id, total, status, created_at
                `,
                [sessionId, customerName, customerPhone, notes, total]
            );

            for (const item of items) {
                await client.query(
                    `
                    insert into order_items (order_id, product_id, product_name, quantity, unit_price)
                    values ($1, $2, $3, $4, $5)
                    `,
                    [orderResult.rows[0].id, item.productId || null, String(item.productName || ''), Number(item.quantity || 0), Number(item.unitPrice || 0)]
                );
            }

            await client.query('commit');
            response.status(201).json(orderResult.rows[0]);
        } catch (error) {
            await client.query('rollback');
            throw error;
        } finally {
            client.release();
        }
    });

    app.get('/api/orders', requireAdmin, async (_request, response) => {
        const result = await query(
            `
            select
                orders.id,
                orders.session_id,
                orders.customer_name,
                orders.customer_phone,
                orders.notes,
                orders.total,
                orders.source,
                orders.status,
                orders.created_at,
                coalesce(
                    json_agg(
                        json_build_object(
                            'productId', order_items.product_id,
                            'productName', order_items.product_name,
                            'quantity', order_items.quantity,
                            'unitPrice', order_items.unit_price
                        )
                    ) filter (where order_items.id is not null),
                    '[]'::json
                ) as items
            from orders
            left join order_items on order_items.order_id = orders.id
            group by orders.id
            order by orders.created_at desc
            `
        );

        response.json(result.rows.map(mapOrder));
    });

    app.patch('/api/orders/:id/status', requireAdmin, async (request, response) => {
        const allowedStatuses = ['pending', 'whatsapp-contacted', 'confirmed', 'delivered', 'canceled'];
        const nextStatus = String(request.body.status || '').trim();

        if (!allowedStatuses.includes(nextStatus)) {
            return response.status(400).json({ message: 'Status de pedido inválido.' });
        }

        const result = await query(
            `
            update orders
            set status = $2
            where id = $1
            returning id, status
            `,
            [Number(request.params.id), nextStatus]
        );

        if (!result.rows.length) {
            return response.status(404).json({ message: 'Pedido não encontrado.' });
        }

        response.json({ id: Number(result.rows[0].id), status: result.rows[0].status });
    });

    app.get('/', (_request, response) => {
        response.sendFile(path.join(frontendRoot, 'index.html'));
    });

    app.use((error, _request, response, _next) => {
        console.error(error);
        response.status(500).json({ message: 'Erro interno do servidor.' });
    });

    return app;
}

async function start() {
    await ensureSchema();
    await removeLegacyDefaultProducts();
    await seedDefaultProducts();

    const app = createApp();
    app.listen(port, () => {
        console.log(`Essence Sam API rodando em http://localhost:${port}`);
    });
}

start().catch((error) => {
    console.error('Falha ao iniciar a API:', error);
    process.exit(1);
});
