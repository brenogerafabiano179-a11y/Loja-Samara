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

create table if not exists customer_favorites (
    session_id text not null,
    product_id text not null references products(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (session_id, product_id)
);

create table if not exists customer_cart_items (
    session_id text not null,
    product_id text not null references products(id) on delete cascade,
    quantity integer not null check (quantity > 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (session_id, product_id)
);

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

create table if not exists order_items (
    id bigserial primary key,
    order_id bigint not null references orders(id) on delete cascade,
    product_id text references products(id) on delete set null,
    product_name text not null,
    quantity integer not null check (quantity > 0),
    unit_price numeric(10, 2) not null check (unit_price >= 0)
);

create or replace function set_timestamp()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists products_set_timestamp on products;
create trigger products_set_timestamp
before update on products
for each row execute function set_timestamp();

drop trigger if exists customer_cart_items_set_timestamp on customer_cart_items;
create trigger customer_cart_items_set_timestamp
before update on customer_cart_items
for each row execute function set_timestamp();
