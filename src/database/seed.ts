import { AppDataSource } from './data-source';
import * as bcrypt from 'bcrypt';

async function seed() {
  await AppDataSource.initialize();
  const q = AppDataSource.createQueryRunner();
  await q.connect();

  console.log('🌱 Starting seed...\n');

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // USERS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('👤 Seeding users...');
    const passwordHash = await bcrypt.hash('Password123!', 10);

    await q.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role, phone, is_verified, is_active, birthday)
      VALUES
        ('00000000-0000-4000-8000-000000000001', 'admin@store.com',   '${passwordHash}', 'Admin',  'User',   'admin',       '+852 9000 0001', true,  true, NULL),
        ('00000000-0000-4000-8000-000000000002', 'jane@example.com',  '${passwordHash}', 'Jane',   'Doe',    'customer',    '+852 9000 0002', true,  true, '1990-04-10'),
        ('00000000-0000-4000-8000-000000000003', 'john@example.com',  '${passwordHash}', 'John',   'Smith',  'customer',    '+852 9000 0003', true,  true, '1985-07-22'),
        ('00000000-0000-4000-8000-000000000004', 'mary@example.com',  '${passwordHash}', 'Mary',   'Chan',   'customer',    '+852 9000 0004', false, true, '1995-12-01'),
        ('00000000-0000-4000-8000-000000000005', 'peter@example.com', '${passwordHash}', 'Peter',  'Wong',   'customer',    '+852 9000 0005', true,  true, '1988-03-15')
        ON CONFLICT DO NOTHING
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // USER ADDRESSES
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📍 Seeding user_addresses...');
    await q.query(`
      INSERT INTO user_addresses (id, user_id, label, street_line1, street_line2, city, state, postal_code, country, phone, is_default)
      VALUES
        ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'Home',   '12 Queen''s Road Central', 'Flat 5A',  'Hong Kong', 'HK Island',     '000000', 'HK', '+852 9000 0002', true),
        ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'Office', '88 Queensway',             'Floor 20', 'Hong Kong', 'Admiralty',     '000000', 'HK', '+852 9000 0002', false),
        ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003', 'Home',   '5 Nathan Road',            NULL,       'Kowloon',   'Tsim Sha Tsui', '000000', 'HK', '+852 9000 0003', true),
        ('10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000004', 'Home',   '200 Tung Chau Street',     NULL,       'Hong Kong', 'Sham Shui Po',  '000000', 'HK', '+852 9000 0004', true),
        ('10000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000005', 'Home',   '1 Yuen Long Plaza',        NULL,       'N.T.',      'Yuen Long',     '000000', 'HK', '+852 9000 0005', true)
        ON CONFLICT DO NOTHING
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // CATEGORIES
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📂 Seeding categories...');
    await q.query(`
      INSERT INTO categories (id, name, slug, description, parent_id, is_active, sort_order)
      VALUES
        ('20000000-0000-4000-8000-000000000001', 'Skincare',        'skincare',              'Face and body skincare products',  NULL,                                   true, 1),
        ('20000000-0000-4000-8000-000000000002', 'Makeup',          'makeup',                'Cosmetics and colour products',    NULL,                                   true, 2),
        ('20000000-0000-4000-8000-000000000003', 'Haircare',        'haircare',              'Shampoo, conditioner and styling',  NULL,                                   true, 3),
        ('20000000-0000-4000-8000-000000000004', 'Fragrance',       'fragrance',             'Perfumes and body mists',          NULL,                                   true, 4),
        ('20000000-0000-4000-8000-000000000011', 'Moisturisers',    'skincare-moisturisers', 'Daily face moisturisers',          '20000000-0000-4000-8000-000000000001', true, 1),
        ('20000000-0000-4000-8000-000000000012', 'Serums',          'skincare-serums',       'Targeted treatment serums',        '20000000-0000-4000-8000-000000000001', true, 2),
        ('20000000-0000-4000-8000-000000000013', 'Cleansers',       'skincare-cleansers',    'Face wash and cleansing balms',    '20000000-0000-4000-8000-000000000001', true, 3),
        ('20000000-0000-4000-8000-000000000021', 'Foundation',      'makeup-foundation',     'Foundation and base products',     '20000000-0000-4000-8000-000000000002', true, 1),
        ('20000000-0000-4000-8000-000000000022', 'Lip Products',    'makeup-lip',            'Lipstick, gloss and liner',        '20000000-0000-4000-8000-000000000002', true, 2)
        ON CONFLICT DO NOTHING
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // PRODUCTS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('🛍️  Seeding products...');
    await q.query(`
      INSERT INTO products (id, name, slug, description, short_description, base_price, compare_price, sku, category_id, is_active, is_featured, weight, product_type)
      VALUES
        ('30000000-0000-4000-8000-000000000001', 'Hydra Boost Moisturiser',      'hydra-boost-moisturiser',      'A lightweight daily moisturiser with hyaluronic acid and ceramides that locks in moisture for 24 hours.', '24-hour hydration moisturiser',        188.00, 228.00, 'SKN-MOI-001', '20000000-0000-4000-8000-000000000011', true,  true,  0.150, 'simple'),
        ('30000000-0000-4000-8000-000000000002', 'Vitamin C Brightening Serum',  'vitamin-c-brightening-serum',  '15% pure vitamin C serum that visibly reduces dark spots and brightens skin tone in 4 weeks.',             'Brightening vitamin C serum',          258.00, 298.00, 'SKN-SER-001', '20000000-0000-4000-8000-000000000012', true,  true,  0.030, 'simple'),
        ('30000000-0000-4000-8000-000000000003', 'Gentle Foam Cleanser',         'gentle-foam-cleanser',         'A pH-balanced foam cleanser that removes impurities without stripping natural oils.',                    'Daily gentle foam cleanser',           128.00, NULL,   'SKN-CLN-001', '20000000-0000-4000-8000-000000000013', true,  false, 0.180, 'simple'),
        ('30000000-0000-4000-8000-000000000004', 'Satin Glow Foundation',        'satin-glow-foundation',        'Buildable medium-to-full coverage foundation with a natural satin finish. SPF 20.',                      'Buildable coverage, natural finish',   268.00, NULL,   'MKP-FND-001', '20000000-0000-4000-8000-000000000021', true,  true,  0.045, 'simple'),
        ('30000000-0000-4000-8000-000000000005', 'Velvet Matte Lipstick',        'velvet-matte-lipstick',        'Long-lasting matte lipstick enriched with vitamin E for comfortable all-day wear.',                      'Long-lasting matte finish lipstick',   118.00, NULL,   'MKP-LIP-001', '20000000-0000-4000-8000-000000000022', true,  false, 0.020, 'simple'),
        ('30000000-0000-4000-8000-000000000006', 'Repair & Shine Shampoo',       'repair-shine-shampoo',         'Protein-enriched shampoo that repairs damaged hair and boosts shine from root to tip.',                  'Repairs and adds shine to hair',       148.00, 168.00, 'HAR-SHP-001', '20000000-0000-4000-8000-000000000003', true,  false, 0.350, 'simple'),
        ('30000000-0000-4000-8000-000000000007', 'Rose & Oud Eau de Parfum',     'rose-oud-eau-de-parfum',       'A luxurious oriental fragrance blending Bulgarian rose, oud wood and warm amber. 50ml.',                 'Rose and oud oriental fragrance 50ml', 428.00, NULL,   'FRG-EDP-001', '20000000-0000-4000-8000-000000000004', true,  true,  0.200, 'simple'),
        ('30000000-0000-4000-8000-000000000008', 'Skincare Starter Bundle',      'skincare-starter-bundle',      'The perfect introduction to our skincare line. Includes moisturiser, serum and cleanser.',               'Moisturiser + Serum + Cleanser bundle',499.00, 574.00, 'BDL-SKN-001', '20000000-0000-4000-8000-000000000001', true,  true,  0.360, 'bundle')
        ON CONFLICT DO NOTHING
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // PRODUCT IMAGES
    // ─────────────────────────────────────────────────────────────────────────
    console.log('🖼️  Seeding product_images...');
    await q.query(`
      INSERT INTO product_images (id, product_id, url, alt_text, position, is_primary)
      VALUES
        ('31000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'https://placehold.co/800x800/e8f4f8/333?text=Moisturiser', 'Hydra Boost Moisturiser', 0, true),
        ('31000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'https://placehold.co/800x800/d0eaf5/333?text=Moisturiser+2', 'Hydra Boost Moisturiser texture', 1, false),
        ('31000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', 'https://placehold.co/800x800/fff3e0/333?text=Vitamin+C+Serum', 'Vitamin C Brightening Serum', 0, true),
        ('31000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000003', 'https://placehold.co/800x800/e8f5e9/333?text=Cleanser', 'Gentle Foam Cleanser', 0, true),
        ('31000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000004', 'https://placehold.co/800x800/fce4ec/333?text=Foundation', 'Satin Glow Foundation', 0, true),
        ('31000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000005', 'https://placehold.co/800x800/f8bbd0/333?text=Lipstick', 'Velvet Matte Lipstick', 0, true),
        ('31000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000006', 'https://placehold.co/800x800/e8eaf6/333?text=Shampoo', 'Repair & Shine Shampoo', 0, true),
        ('31000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000007', 'https://placehold.co/800x800/fdf3e3/333?text=Perfume', 'Rose & Oud Eau de Parfum', 0, true),
        ('31000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000008', 'https://placehold.co/800x800/e3f2fd/333?text=Bundle', 'Skincare Starter Bundle', 0, true)
        ON CONFLICT DO NOTHING
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // PRODUCT VARIANTS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('🎨 Seeding product_variants...');
    await q.query(`
      INSERT INTO product_variants (id, product_id, name, sku, price, compare_price, inventory_quantity, options, is_active)
      VALUES
        -- Foundation shades
        ('32000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', 'Ivory 10',   'MKP-FND-001-10', 268.00, NULL, 50, '{"shade":"Ivory 10",  "undertone":"cool"}',   true),
        ('32000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000004', 'Beige 20',   'MKP-FND-001-20', 268.00, NULL, 45, '{"shade":"Beige 20",  "undertone":"neutral"}', true),
        ('32000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000004', 'Sand 30',    'MKP-FND-001-30', 268.00, NULL, 30, '{"shade":"Sand 30",   "undertone":"warm"}',    true),
        ('32000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', 'Caramel 40', 'MKP-FND-001-40', 268.00, NULL, 20, '{"shade":"Caramel 40","undertone":"warm"}',    true),
        -- Lipstick shades
        ('32000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000005', 'Ruby Red',    'MKP-LIP-001-RR', 118.00, NULL, 60, '{"shade":"Ruby Red",    "finish":"matte"}', true),
        ('32000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000005', 'Rose Nude',   'MKP-LIP-001-RN', 118.00, NULL, 55, '{"shade":"Rose Nude",   "finish":"matte"}', true),
        ('32000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000005', 'Berry Crush', 'MKP-LIP-001-BC', 118.00, NULL, 40, '{"shade":"Berry Crush", "finish":"matte"}', true)
        ON CONFLICT DO NOTHING
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // INVENTORY
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📦 Seeding inventory...');
    await q.query(`
      INSERT INTO inventory (id, product_id, variant_id, quantity, reserved_quantity, low_stock_threshold, warehouse_location)
      VALUES
        ('33000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', NULL,                                   200, 10, 20, 'A-01-01'),
        ('33000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', NULL,                                   150, 5,  15, 'A-01-02'),
        ('33000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', NULL,                                   300, 8,  20, 'A-01-03'),
        ('33000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', '32000000-0000-4000-8000-000000000001', 50,  2,  10, 'B-02-01'),
        ('33000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000004', '32000000-0000-4000-8000-000000000002', 45,  3,  10, 'B-02-02'),
        ('33000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000004', '32000000-0000-4000-8000-000000000003', 30,  1,  10, 'B-02-03'),
        ('33000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000004', '32000000-0000-4000-8000-000000000004', 20,  0,  5,  'B-02-04'),
        ('33000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000005', '32000000-0000-4000-8000-000000000005', 60,  4,  10, 'B-03-01'),
        ('33000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000005', '32000000-0000-4000-8000-000000000006', 55,  2,  10, 'B-03-02'),
        ('33000000-0000-4000-8000-000000000010', '30000000-0000-4000-8000-000000000005', '32000000-0000-4000-8000-000000000007', 40,  1,  10, 'B-03-03'),
        ('33000000-0000-4000-8000-000000000011', '30000000-0000-4000-8000-000000000006', NULL,                                   120, 6,  15, 'C-01-01'),
        ('33000000-0000-4000-8000-000000000012', '30000000-0000-4000-8000-000000000007', NULL,                                   80,  3,  10, 'D-01-01'),
        ('33000000-0000-4000-8000-000000000013', '30000000-0000-4000-8000-000000000008', NULL,                                   50,  2,  5,  'E-01-01')
        ON CONFLICT DO NOTHING
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // COUPONS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('🎟️  Seeding coupons...');
    await q.query(`
      INSERT INTO coupons (id, code, type, value, min_order_amount, max_uses, used_count, starts_at, expires_at, is_active)
      VALUES
        ('40000000-0000-4000-8000-000000000001', 'WELCOME10',  'percentage',   10.00, 0.00,   NULL, 0,  now(),                    now() + interval '1 year', true),
        ('40000000-0000-4000-8000-000000000002', 'SAVE50',     'fixed_amount', 50.00, 300.00, 100,  12, now(),                    now() + interval '3 months', true),
        ('40000000-0000-4000-8000-000000000003', 'VIP20',      'percentage',   20.00, 500.00, 50,   5,  now(),                    now() + interval '6 months', true),
        ('40000000-0000-4000-8000-000000000004', 'NEWUSER15',  'percentage',   15.00, 0.00,   200,  0,  now(),                    now() + interval '1 year', true),
        ('40000000-0000-4000-8000-000000000005', 'EXPIRED10',  'percentage',   10.00, 0.00,   NULL, 3,  now() - interval '1 year',now() - interval '1 day', false)
        ON CONFLICT DO NOTHING
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // CARTS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('🛒 Seeding carts...');
    await q.query(`
      INSERT INTO carts (id, user_id, session_id, expires_at, coupon_id, coupon_code, discount_amount)
      VALUES
        ('50000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', NULL,          NULL,                       NULL,                                   NULL,        0.00),
        ('50000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', NULL,          NULL,                       '40000000-0000-4000-8000-000000000001', 'WELCOME10', 37.60),
        ('50000000-0000-4000-8000-000000000003', NULL,                                   'guest-sess-1', now() + interval '7 days', NULL,                                   NULL,        0.00)
        ON CONFLICT DO NOTHING
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // CART ITEMS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('🛒 Seeding cart_items...');
    await q.query(`
      INSERT INTO cart_items (id, cart_id, product_id, variant_id, quantity, unit_price)
      VALUES
        ('51000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', NULL,                                   2, 188.00),
        ('51000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', NULL,                                   1, 258.00),
        ('51000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000004', '32000000-0000-4000-8000-000000000001', 1, 268.00),
        ('51000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000005', '32000000-0000-4000-8000-000000000005', 2, 118.00),
        ('51000000-0000-4000-8000-000000000005', '50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000007', NULL,                                   1, 428.00)
        ON CONFLICT DO NOTHING
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // ORDERS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📋 Seeding orders...');
    await q.query(`
      INSERT INTO orders (id, order_number, user_id, status, payment_status, subtotal, tax_amount, shipping_cost, discount_amount, total, shipping_address_id, coupon_id, payment_intent_id, notes)
      VALUES
        ('60000000-0000-4000-8000-000000000001', 'ORD-2026040001', '00000000-0000-4000-8000-000000000002', 'delivered',  'paid',    376.00, 0.00, 28.00, 0.00,  404.00, '10000000-0000-4000-8000-000000000001', NULL,                                   'pi_test_001', NULL),
        ('60000000-0000-4000-8000-000000000002', 'ORD-2026040002', '00000000-0000-4000-8000-000000000002', 'shipped',    'paid',    258.00, 0.00, 28.00, 25.80, 260.20, '10000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'pi_test_002', NULL),
        ('60000000-0000-4000-8000-000000000003', 'ORD-2026040003', '00000000-0000-4000-8000-000000000003', 'processing', 'paid',    536.00, 0.00, 28.00, 50.00, 514.00, '10000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000002', 'pi_test_003', 'Please gift wrap'),
        ('60000000-0000-4000-8000-000000000004', 'ORD-2026040004', '00000000-0000-4000-8000-000000000004', 'pending',    'pending', 428.00, 0.00, 28.00, 0.00,  456.00, '10000000-0000-4000-8000-000000000004', NULL,                                   NULL,          NULL),
        ('60000000-0000-4000-8000-000000000005', 'ORD-2026040005', '00000000-0000-4000-8000-000000000005', 'cancelled',  'refunded',188.00, 0.00, 28.00, 0.00,  216.00, '10000000-0000-4000-8000-000000000005', NULL,                                   'pi_test_005', 'Customer requested cancellation')
        ON CONFLICT DO NOTHING
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // ORDER ITEMS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📋 Seeding order_items...');
    await q.query(`
      INSERT INTO order_items (id, order_id, product_id, variant_id, quantity, unit_price, total_price, product_name, product_snapshot)
      VALUES
        ('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', NULL,                                   2, 188.00, 376.00, 'Hydra Boost Moisturiser',     '{"sku":"SKN-MOI-001","base_price":188}'),
        ('61000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', NULL,                                   1, 258.00, 258.00, 'Vitamin C Brightening Serum', '{"sku":"SKN-SER-001","base_price":258}'),
        ('61000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000004', '32000000-0000-4000-8000-000000000002', 1, 268.00, 268.00, 'Satin Glow Foundation',       '{"sku":"MKP-FND-001-20","shade":"Beige 20"}'),
        ('61000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000005', '32000000-0000-4000-8000-000000000005', 2, 118.00, 236.00, 'Velvet Matte Lipstick',       '{"sku":"MKP-LIP-001-RR","shade":"Ruby Red"}'),
        ('61000000-0000-4000-8000-000000000005', '60000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000006', NULL,                                   1, 148.00, 148.00, 'Repair & Shine Shampoo',      '{"sku":"HAR-SHP-001","base_price":148}'),
        ('61000000-0000-4000-8000-000000000006', '60000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000007', NULL,                                   1, 428.00, 428.00, 'Rose & Oud Eau de Parfum',    '{"sku":"FRG-EDP-001","base_price":428}'),
        ('61000000-0000-4000-8000-000000000007', '60000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000001', NULL,                                   1, 188.00, 188.00, 'Hydra Boost Moisturiser',     '{"sku":"SKN-MOI-001","base_price":188}')
        ON CONFLICT DO NOTHING
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // PAYMENTS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('💳 Seeding payments...');
    await q.query(`
      INSERT INTO payments (id, order_id, amount, currency, status, provider, transaction_id, payment_method)
      VALUES
        ('70000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', 404.00, 'HKD', 'succeeded', 'stripe', 'ch_test_001', 'card'),
        ('70000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', 260.20, 'HKD', 'succeeded', 'stripe', 'ch_test_002', 'card'),
        ('70000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000003', 514.00, 'HKD', 'succeeded', 'stripe', 'ch_test_003', 'card'),
        ('70000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000004', 456.00, 'HKD', 'pending',   'stripe', NULL,          NULL),
        ('70000000-0000-4000-8000-000000000005', '60000000-0000-4000-8000-000000000005', 216.00, 'HKD', 'refunded',  'stripe', 'ch_test_005', 'card')
        ON CONFLICT DO NOTHING
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // REVIEWS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('⭐ Seeding reviews...');
    await q.query(`
      INSERT INTO reviews (id, product_id, user_id, rating, title, body, is_verified, is_approved)
      VALUES
        ('80000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 5, 'Best moisturiser I have used!',      'My skin feels so soft and hydrated after just one week. Will definitely repurchase.', true,  true),
        ('80000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', 4, 'Noticeable brightening effect',       'My dark spots have faded after 3 weeks. Packaging could be better but the serum works.', true, true),
        ('80000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000003', 5, 'Perfect shade range',                 'Found my exact shade in Beige 20. Great coverage and lasts all day.', true,  true),
        ('80000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000004', 4, 'Long lasting lipstick',               'Ruby Red is a gorgeous colour. Stays on for hours without drying my lips.',  false, true),
        ('80000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000005', 5, 'Stunning fragrance',                  'The rose and oud combination is divine. Lasts on skin for over 8 hours.', true,  true)
        ON CONFLICT DO NOTHING
    `);

    // Update product average ratings
    await q.query(`
      UPDATE products p SET
                          average_rating = sub.avg_rating,
                          review_count   = sub.cnt
        FROM (
        SELECT product_id, ROUND(AVG(rating)::numeric, 2) as avg_rating, COUNT(*) as cnt
        FROM reviews WHERE is_approved = true GROUP BY product_id
      ) sub
      WHERE p.id = sub.product_id
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // PROMOTIONS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('🎉 Seeding promotions...');
    await q.query(`
      INSERT INTO promotions (id, name, description, type, code, priority, stackable, is_active, starts_at, expires_at, max_uses, used_count, max_uses_per_customer)
      VALUES
        ('90000000-0000-4000-8000-000000000001', 'Summer Sale 20%',        '20% off all orders over HK$400',   'coupon',    'SUMMER20',  10, 'none', true,  now(), now() + interval '3 months', 500, 23, 1),
        ('90000000-0000-4000-8000-000000000002', 'Free Shipping Promo',    'Free shipping on orders over $300', 'automatic', NULL,         5, 'all',  true,  now(), NULL,                         NULL, 0,  NULL),
        ('90000000-0000-4000-8000-000000000003', 'Buy 2 Get 10% Off',      '10% off when you buy 2+ items',    'automatic', NULL,         8, 'none', true,  now(), NULL,                         NULL, 0,  NULL),
        ('90000000-0000-4000-8000-000000000004', 'VIP Exclusive 25% Off',  '25% off for VIP members only',     'coupon',    'VIPONLY25', 20, 'none', true,  now(), now() + interval '6 months', 200, 5,  1)
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO promotion_condition_groups (id, promotion_id, operator, sort_order)
      VALUES
        ('91000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001', 'AND', 0),
        ('91000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-000000000002', 'AND', 0),
        ('91000000-0000-4000-8000-000000000003', '90000000-0000-4000-8000-000000000003', 'AND', 0),
        ('91000000-0000-4000-8000-000000000004', '90000000-0000-4000-8000-000000000004', 'AND', 0)
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO promotion_conditions (id, group_id, type, operator, value)
      VALUES
        ('92000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', 'cart_subtotal',    'gte', '400'),
        ('92000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000002', 'cart_subtotal',    'gte', '300'),
        ('92000000-0000-4000-8000-000000000003', '91000000-0000-4000-8000-000000000003', 'cart_item_count',  'gte', '{"count": 2}'),
        ('92000000-0000-4000-8000-000000000004', '91000000-0000-4000-8000-000000000004', 'customer_segment', 'in',  '{"segments": ["vip"]}')
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO promotion_actions (id, promotion_id, type, value, target, sort_order)
      VALUES
        ('93000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001', 'percentage_discount', 20.00, 'order',    0),
        ('93000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-000000000002', 'free_shipping',       NULL,  'shipping', 0),
        ('93000000-0000-4000-8000-000000000003', '90000000-0000-4000-8000-000000000003', 'percentage_discount', 10.00, 'order',    0),
        ('93000000-0000-4000-8000-000000000004', '90000000-0000-4000-8000-000000000004', 'percentage_discount', 25.00, 'order',    0)
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO promotion_usage_logs (id, promotion_id, user_id, order_id, discount_amount)
      VALUES
        ('94000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000002', 25.80),
        ('94000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000003', 50.00)
        ON CONFLICT DO NOTHING
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // USER SEGMENTS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('🏷️  Seeding user_segments...');
    await q.query(`
      INSERT INTO user_segments (id, user_id, segment, expires_at)
      VALUES
        ('95000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'vip',        now() + interval '1 year'),
        ('95000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', 'vip',        now() + interval '1 year'),
        ('95000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000004', 'new_user',   NULL),
        ('95000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000005', 'loyal',      NULL)
        ON CONFLICT DO NOTHING
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // TIER CONFIGS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('🥇 Seeding tier_configs...');
    await q.query(`
      INSERT INTO tier_configs (id, tier_name, display_name, priority, membership_duration_days, upgrade_condition_groups, renewal_condition_groups, auto_downgrade, is_active)
      VALUES
        ('a0000000-0000-4000-8000-000000000001', 'customer',    'Customer',    0,  365, '[]', '[]', true, true),
        ('a0000000-0000-4000-8000-000000000002', 'vip',         'VIP',         10, 365, '[{"conditions":[{"type":"cart_subtotal","operator":"gte","value":{"amount":3000}}]}]', '[]', true, true),
        ('a0000000-0000-4000-8000-000000000003', 'special_vip', 'Special VIP', 20, 365, '[{"conditions":[{"type":"cart_subtotal","operator":"gte","value":{"amount":8000}}]}]', '[]', true, true)
        ON CONFLICT DO NOTHING
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // USER TIER MEMBERSHIPS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('🥇 Seeding user_tier_memberships...');
    await q.query(`
      INSERT INTO user_tier_memberships (id, user_id, tier_name, tier_config_id, started_at, expires_at, upgraded_by)
      VALUES
        ('a1000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'vip',      'a0000000-0000-4000-8000-000000000002', now() - interval '60 days', now() + interval '305 days', 'system'),
        ('a1000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', 'vip',      'a0000000-0000-4000-8000-000000000002', now() - interval '30 days', now() + interval '335 days', 'system'),
        ('a1000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000004', 'customer', 'a0000000-0000-4000-8000-000000000001', now(),                      now() + interval '365 days', 'system'),
        ('a1000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000005', 'customer', 'a0000000-0000-4000-8000-000000000001', now(),                      now() + interval '365 days', 'system')
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO user_tier_histories (id, user_id, from_tier, to_tier, reason, changed_by)
      VALUES
        ('a2000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 'customer', 'vip', 'upgrade',   'system'),
        ('a2000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', 'customer', 'vip', 'upgrade',   'system')
        ON CONFLICT DO NOTHING
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // BUNDLE CONFIGS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📦 Seeding bundle_configs...');
    await q.query(`
      INSERT INTO bundle_configs (id, product_id, bundle_type, pricing_type, discount_percent, min_total_selections, max_total_selections)
      VALUES
        ('b0000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000008', 'fixed', 'fixed', 13.00, 3, 3)
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO bundle_groups (id, bundle_config_id, name, description, min_selections, max_selections, is_required, sort_order)
      VALUES
        ('b1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Moisturiser', 'Choose your moisturiser', 1, 1, true, 0),
        ('b1000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'Serum',       'Choose your serum',       1, 1, true, 1),
        ('b1000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', 'Cleanser',    'Choose your cleanser',    1, 1, true, 2)
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO bundle_group_items (id, group_id, product_id, variant_id, quantity, is_default, is_optional, price_modifier, sort_order)
      VALUES
        ('b2000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', NULL, 1, true,  false, 0, 0),
        ('b2000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', NULL, 1, true,  false, 0, 0),
        ('b2000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', NULL, 1, true,  false, 0, 0)
        ON CONFLICT DO NOTHING
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // SHIPPING
    // ─────────────────────────────────────────────────────────────────────────
    console.log('🚚 Seeding shipping...');
    await q.query(`
      INSERT INTO shipping_zones (id, name, description, countries, sort_order, is_active)
      VALUES
        ('c0000000-0000-4000-8000-000000000001', 'Hong Kong',           'Mainland HK delivery',         '["HK"]',         0, true),
        ('c0000000-0000-4000-8000-000000000002', 'Macau',               'Macau delivery',                '["MO"]',         1, true),
        ('c0000000-0000-4000-8000-000000000003', 'Asia Pacific',        'Regional Asia shipping',        '["SG","MY","TW","KR","JP"]', 2, true),
        ('c0000000-0000-4000-8000-000000000004', 'International',       'Worldwide shipping',            '["US","GB","AU","CA"]', 3, true)
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO shipping_methods (id, zone_id, name, description, estimated_days, is_active, sort_order)
      VALUES
        ('c1000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'SF Express',         'SF Express door-to-door',    '1-2 working days',  true, 0),
        ('c1000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'Standard Post',      'HK Post standard delivery',  '3-5 working days',  true, 1),
        ('c1000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'Self Pickup',        'Collect from our store',      'Same day',          true, 2),
        ('c1000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002', 'Macau Express',      'Macau express delivery',      '2-3 working days',  true, 0),
        ('c1000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000003', 'Asia Air Freight',   'Regional air freight',        '4-7 working days',  true, 0),
        ('c1000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000004', 'DHL Express',        'DHL international express',   '5-10 working days', true, 0)
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO shipping_rates (id, method_id, condition_type, condition_min, condition_max, rate_type, cost, sort_order)
      VALUES
        -- SF Express: free over 500, flat 28 under 500
        ('c2000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'order_max', NULL,   500.00, 'fixed', 28.00, 0),
        ('c2000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001', 'order_min', 500.00, NULL,   'fixed',  0.00, 1),
        -- Standard Post: flat 15
        ('c2000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000002', 'always',      NULL,   NULL,   'fixed', 15.00, 0),
        -- Self Pickup: free
        ('c2000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000003', 'always',      NULL,   NULL,   'fixed',  0.00, 0),
        -- Macau Express: flat 45
        ('c2000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000004', 'always',      NULL,   NULL,   'fixed', 45.00, 0),
        -- Asia Air: flat 80
        ('c2000000-0000-4000-8000-000000000006', 'c1000000-0000-4000-8000-000000000005', 'always',      NULL,   NULL,   'fixed', 80.00, 0),
        -- DHL: flat 150
        ('c2000000-0000-4000-8000-000000000007', 'c1000000-0000-4000-8000-000000000006', 'always',      NULL,   NULL,   'fixed',150.00, 0)
        ON CONFLICT DO NOTHING
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // BIRTHDAY COUPON CONFIG
    // ─────────────────────────────────────────────────────────────────────────
    console.log('🎂 Seeding birthday_coupon_config...');
    await q.query(`
      INSERT INTO birthday_coupon_config (id, is_enabled, days_before, coupon_type, coupon_value, validity_days, min_order_amount, email_subject, email_message)
      VALUES
        ('d0000000-0000-4000-8000-000000000001', true, 3, 'percentage', 15.00, 30, 0.00,
         'Happy Birthday! Here is your special gift 🎂',
         'Wishing you a wonderful birthday! Enjoy 15% off your next order as our gift to you.')
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO birthday_coupon_logs (id, user_id, year, coupon_code, promotion_id, expires_at, sent_at)
      VALUES
        ('d1000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 2026, 'BDAY-JANE-2026', NULL, now() + interval '30 days', now())
        ON CONFLICT DO NOTHING
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // POINTS CONFIG  (singleton)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('💎 Seeding points_config...');
    await q.query(`
      INSERT INTO points_config (id, is_enabled, expiry_days, min_points_to_redeem, max_redemption_percent)
      VALUES
        ('e0000000-0000-4000-8000-000000000001', true, 365, 100, 30.00)
        ON CONFLICT DO NOTHING
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // USER POINTS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('💎 Seeding user_points...');
    await q.query(`
      INSERT INTO user_points (id, user_id, balance, lifetime_earned, lifetime_redeemed, lifetime_expired)
      VALUES
        ('e1000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 664,  664,  0, 0),
        ('e1000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', 514,  514,  0, 0),
        ('e1000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000004', 0,    0,    0, 0),
        ('e1000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000005', 0,    216,  216, 0)
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO points_transactions (id, user_id, points, balance_after, type, reference_type, reference_id, description, expires_at)
      VALUES
        ('e2000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', 404,  404,  'earn',   'order', '60000000-0000-4000-8000-000000000001', 'Points earned from order ORD-2026040001', now() + interval '365 days'),
        ('e2000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 260,  664,  'earn',   'order', '60000000-0000-4000-8000-000000000002', 'Points earned from order ORD-2026040002', now() + interval '365 days'),
        ('e2000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003', 514,  514,  'earn',   'order', '60000000-0000-4000-8000-000000000003', 'Points earned from order ORD-2026040003', now() + interval '365 days'),
        ('e2000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000005', 216,  216,  'earn',   'order', '60000000-0000-4000-8000-000000000005', 'Points earned from order ORD-2026040005', now() + interval '365 days'),
        ('e2000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000005', -216, 0,    'expire', NULL,    NULL,                                   'Points expired - order refunded',         NULL)
        ON CONFLICT DO NOTHING
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // EMAIL SMTP CONFIG  (leave credentials blank — admin fills via UI)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📧 Seeding email_smtp_config...');
    await q.query(`
      INSERT INTO email_smtp_config (id, is_active, host, port, secure, username, password, from_name, from_email)
      VALUES
        ('f0000000-0000-4000-8000-000000000001', false, 'smtp.example.com', 587, false, '', '', 'My Store', 'noreply@example.com')
        ON CONFLICT DO NOTHING
    `);

    console.log('\n✅ Seed completed successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 Login credentials (all users):');
    console.log('   Admin  → admin@store.com  / Password123!');
    console.log('   Jane   → jane@example.com / Password123!');
    console.log('   John   → john@example.com / Password123!');
    console.log('   Mary   → mary@example.com / Password123!');
    console.log('   Peter  → peter@example.com / Password123!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (err) {
    console.error('❌ Seed failed:', err);
    throw err;
  } finally {
    await q.release();
    await AppDataSource.destroy();
  }
}

seed();
