import { DataSource } from 'typeorm';
import { join } from 'path';
import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';

config();

async function resetAndSeed(ds: DataSource) {
  const q = ds.createQueryRunner();
  await q.connect();
  try {
    // ── Wipe everything ────────────────────────────────────────────────────
    await q.query(`DROP SCHEMA public CASCADE`);
    await q.query(`CREATE SCHEMA public`);
    await q.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ── Re-run all migrations ──────────────────────────────────────────────
    await ds.runMigrations();

    // ── Seed demo data ─────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash('Password123!', 10);

    await q.query(`
      INSERT INTO users (id,email,password_hash,first_name,last_name,role,phone,is_verified,is_active,birthday) VALUES
                                                                                                                  ('00000000-0000-4000-8000-000000000001','admin@store.com','${passwordHash}','Admin','User','admin','+852 9000 0001',true,true,NULL),
                                                                                                                  ('00000000-0000-4000-8000-000000000002','jane@example.com','${passwordHash}','Jane','Doe','customer','+852 9000 0002',true,true,'1990-04-10'),
                                                                                                                  ('00000000-0000-4000-8000-000000000003','john@example.com','${passwordHash}','John','Smith','customer','+852 9000 0003',true,true,'1985-07-22'),
                                                                                                                  ('00000000-0000-4000-8000-000000000004','mary@example.com','${passwordHash}','Mary','Chan','customer','+852 9000 0004',false,true,'1995-12-01'),
                                                                                                                  ('00000000-0000-4000-8000-000000000005','peter@example.com','${passwordHash}','Peter','Wong','customer','+852 9000 0005',true,true,'1988-03-15')
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO user_addresses (id,user_id,label,street_line1,street_line2,city,state,postal_code,country,phone,is_default) VALUES
                                                                                                                                ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','Home','12 Queen''s Road Central','Flat 5A','Hong Kong','HK Island','000000','HK','+852 9000 0002',true),
                                                                                                                                ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000002','Office','88 Queensway','Floor 20','Hong Kong','Admiralty','000000','HK','+852 9000 0002',false),
                                                                                                                                ('10000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000003','Home','5 Nathan Road',NULL,'Kowloon','Tsim Sha Tsui','000000','HK','+852 9000 0003',true),
                                                                                                                                ('10000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000004','Home','200 Tung Chau Street',NULL,'Hong Kong','Sham Shui Po','000000','HK','+852 9000 0004',true),
                                                                                                                                ('10000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000005','Home','1 Yuen Long Plaza',NULL,'N.T.','Yuen Long','000000','HK','+852 9000 0005',true)
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO categories (id,name,slug,description,parent_id,is_active,sort_order) VALUES
                                                                                         ('20000000-0000-4000-8000-000000000001','Skincare','skincare','Face and body skincare products',NULL,true,1),
                                                                                         ('20000000-0000-4000-8000-000000000002','Makeup','makeup','Cosmetics and colour products',NULL,true,2),
                                                                                         ('20000000-0000-4000-8000-000000000003','Haircare','haircare','Shampoo, conditioner and styling',NULL,true,3),
                                                                                         ('20000000-0000-4000-8000-000000000004','Fragrance','fragrance','Perfumes and body mists',NULL,true,4),
                                                                                         ('20000000-0000-4000-8000-000000000011','Moisturisers','skincare-moisturisers','Daily face moisturisers','20000000-0000-4000-8000-000000000001',true,1),
                                                                                         ('20000000-0000-4000-8000-000000000012','Serums','skincare-serums','Targeted treatment serums','20000000-0000-4000-8000-000000000001',true,2),
                                                                                         ('20000000-0000-4000-8000-000000000013','Cleansers','skincare-cleansers','Face wash and cleansing balms','20000000-0000-4000-8000-000000000001',true,3),
                                                                                         ('20000000-0000-4000-8000-000000000021','Foundation','makeup-foundation','Foundation and base products','20000000-0000-4000-8000-000000000002',true,1),
                                                                                         ('20000000-0000-4000-8000-000000000022','Lip Products','makeup-lip','Lipstick, gloss and liner','20000000-0000-4000-8000-000000000002',true,2)
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO products (id,name,slug,description,short_description,base_price,compare_price,sku,category_id,is_active,is_featured,weight,product_type) VALUES
                                                                                                                                                             ('30000000-0000-4000-8000-000000000001','Hydra Boost Moisturiser','hydra-boost-moisturiser','A lightweight daily moisturiser with hyaluronic acid.','24-hour hydration moisturiser',188.00,228.00,'SKN-MOI-001','20000000-0000-4000-8000-000000000011',true,true,0.150,'simple'),
                                                                                                                                                             ('30000000-0000-4000-8000-000000000002','Vitamin C Brightening Serum','vitamin-c-brightening-serum','15% pure vitamin C serum.','Brightening vitamin C serum',258.00,298.00,'SKN-SER-001','20000000-0000-4000-8000-000000000012',true,true,0.030,'simple'),
                                                                                                                                                             ('30000000-0000-4000-8000-000000000003','Gentle Foam Cleanser','gentle-foam-cleanser','A pH-balanced foam cleanser.','Daily gentle foam cleanser',128.00,NULL,'SKN-CLN-001','20000000-0000-4000-8000-000000000013',true,false,0.180,'simple'),
                                                                                                                                                             ('30000000-0000-4000-8000-000000000004','Satin Glow Foundation','satin-glow-foundation','Buildable medium-to-full coverage foundation.','Buildable coverage foundation',268.00,NULL,'MKP-FND-001','20000000-0000-4000-8000-000000000021',true,true,0.045,'simple'),
                                                                                                                                                             ('30000000-0000-4000-8000-000000000005','Velvet Matte Lipstick','velvet-matte-lipstick','Long-lasting matte lipstick.','Long-lasting matte lipstick',118.00,NULL,'MKP-LIP-001','20000000-0000-4000-8000-000000000022',true,false,0.020,'simple'),
                                                                                                                                                             ('30000000-0000-4000-8000-000000000006','Repair & Shine Shampoo','repair-shine-shampoo','Protein-enriched shampoo.','Repairs and adds shine',148.00,168.00,'HAR-SHP-001','20000000-0000-4000-8000-000000000003',true,false,0.350,'simple'),
                                                                                                                                                             ('30000000-0000-4000-8000-000000000007','Rose & Oud Eau de Parfum','rose-oud-eau-de-parfum','A luxurious oriental fragrance. 50ml.','Rose and oud fragrance 50ml',428.00,NULL,'FRG-EDP-001','20000000-0000-4000-8000-000000000004',true,true,0.200,'simple'),
                                                                                                                                                             ('30000000-0000-4000-8000-000000000008','Skincare Starter Bundle','skincare-starter-bundle','Moisturiser, serum and cleanser bundle.','Moisturiser + Serum + Cleanser',499.00,574.00,'BDL-SKN-001','20000000-0000-4000-8000-000000000001',true,true,0.360,'bundle')
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO product_variants (id,product_id,name,sku,price,compare_price,inventory_quantity,options,is_active) VALUES
                                                                                                                       ('32000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000004','Ivory 10','MKP-FND-001-10',268.00,NULL,50,'{"shade":"Ivory 10","undertone":"cool"}',true),
                                                                                                                       ('32000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000004','Beige 20','MKP-FND-001-20',268.00,NULL,45,'{"shade":"Beige 20","undertone":"neutral"}',true),
                                                                                                                       ('32000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000005','Ruby Red','MKP-LIP-001-RR',118.00,NULL,60,'{"shade":"Ruby Red","finish":"matte"}',true)
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO inventory (id,product_id,variant_id,quantity,reserved_quantity,low_stock_threshold,warehouse_location) VALUES
                                                                                                                           ('33000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',NULL,200,10,20,'A-01-01'),
                                                                                                                           ('33000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002',NULL,150,5,15,'A-01-02'),
                                                                                                                           ('33000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003',NULL,300,8,20,'A-01-03'),
                                                                                                                           ('33000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000004','32000000-0000-4000-8000-000000000001',50,2,10,'B-02-01'),
                                                                                                                           ('33000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000005','32000000-0000-4000-8000-000000000005',60,4,10,'B-03-01'),
                                                                                                                           ('33000000-0000-4000-8000-000000000011','30000000-0000-4000-8000-000000000006',NULL,120,6,15,'C-01-01'),
                                                                                                                           ('33000000-0000-4000-8000-000000000012','30000000-0000-4000-8000-000000000007',NULL,80,3,10,'D-01-01'),
                                                                                                                           ('33000000-0000-4000-8000-000000000013','30000000-0000-4000-8000-000000000008',NULL,50,2,5,'E-01-01')
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO coupons (id,code,type,value,min_order_amount,max_uses,used_count,starts_at,expires_at,is_active) VALUES
                                                                                                                     ('40000000-0000-4000-8000-000000000001','WELCOME10','percentage',10.00,0.00,NULL,0,now(),now()+interval '1 year',true),
                                                                                                                     ('40000000-0000-4000-8000-000000000002','SAVE50','fixed_amount',50.00,300.00,100,12,now(),now()+interval '3 months',true),
                                                                                                                     ('40000000-0000-4000-8000-000000000003','VIP20','percentage',20.00,500.00,50,5,now(),now()+interval '6 months',true),
                                                                                                                     ('40000000-0000-4000-8000-000000000005','EXPIRED10','percentage',10.00,0.00,NULL,3,now()-interval '1 year',now()-interval '1 day',false)
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO carts (id,user_id,coupon_id,coupon_code,discount_amount) VALUES
                                                                             ('50000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002',NULL,NULL,0.00),
                                                                             ('50000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003',NULL,NULL,0.00)
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO cart_items (id,cart_id,product_id,variant_id,quantity,unit_price) VALUES
                                                                                      ('51000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',NULL,2,188.00),
                                                                                      ('51000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002',NULL,1,258.00)
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO orders (id,order_number,user_id,status,payment_status,subtotal,tax_amount,shipping_cost,discount_amount,total,shipping_address_id,coupon_id) VALUES
                                                                                                                                                                 ('60000000-0000-4000-8000-000000000001','ORD-2026040001','00000000-0000-4000-8000-000000000002','delivered','paid',376.00,0.00,28.00,0.00,404.00,'10000000-0000-4000-8000-000000000001',NULL),
                                                                                                                                                                 ('60000000-0000-4000-8000-000000000002','ORD-2026040002','00000000-0000-4000-8000-000000000002','shipped','paid',258.00,0.00,28.00,25.80,260.20,'10000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001'),
                                                                                                                                                                 ('60000000-0000-4000-8000-000000000003','ORD-2026040003','00000000-0000-4000-8000-000000000003','processing','paid',536.00,0.00,28.00,50.00,514.00,'10000000-0000-4000-8000-000000000003','40000000-0000-4000-8000-000000000002')
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO order_items (id,order_id,product_id,variant_id,quantity,unit_price,total_price,product_name,product_snapshot) VALUES
                                                                                                                                  ('61000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',NULL,2,188.00,376.00,'Hydra Boost Moisturiser','{"sku":"SKN-MOI-001"}'),
                                                                                                                                  ('61000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002',NULL,1,258.00,258.00,'Vitamin C Brightening Serum','{"sku":"SKN-SER-001"}'),
                                                                                                                                  ('61000000-0000-4000-8000-000000000003','60000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000004','32000000-0000-4000-8000-000000000002',1,268.00,268.00,'Satin Glow Foundation','{"sku":"MKP-FND-001-20"}')
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO payments (id,order_id,amount,currency,status,provider,transaction_id,payment_method) VALUES
                                                                                                         ('70000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001',404.00,'HKD','succeeded','stripe','ch_test_001','card'),
                                                                                                         ('70000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000002',260.20,'HKD','succeeded','stripe','ch_test_002','card'),
                                                                                                         ('70000000-0000-4000-8000-000000000003','60000000-0000-4000-8000-000000000003',514.00,'HKD','succeeded','stripe','ch_test_003','card')
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO reviews (id,product_id,user_id,rating,title,body,is_verified,is_approved) VALUES
                                                                                              ('80000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002',5,'Best moisturiser!','My skin feels so soft.',true,true),
                                                                                              ('80000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003',4,'Noticeable brightening','Dark spots faded after 3 weeks.',true,true)
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO promotions (id,name,description,type,code,priority,stackable,is_active,starts_at,expires_at) VALUES
                                                                                                                 ('90000000-0000-4000-8000-000000000001','Summer Sale 20%','20% off orders over HK$400','coupon','SUMMER20',10,'none',true,now(),now()+interval '3 months'),
                                                                                                                 ('90000000-0000-4000-8000-000000000002','Free Shipping','Free shipping over $300','automatic',NULL,5,'all',true,now(),NULL)
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO promotion_condition_groups (id,promotion_id,operator,sort_order) VALUES
                                                                                     ('91000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','AND',0),
                                                                                     ('91000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000002','AND',0)
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO promotion_conditions (id,group_id,type,operator,value) VALUES
                                                                           ('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','cart_subtotal','gte','400'),
                                                                           ('92000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000002','cart_subtotal','gte','300')
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO promotion_actions (id,promotion_id,type,value,target,sort_order) VALUES
                                                                                     ('93000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001','percentage_discount',20.00,'order',0),
                                                                                     ('93000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000002','free_shipping',NULL,'shipping',0)
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO user_segments (id,user_id,segment,expires_at) VALUES
        ('95000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','vip',now()+interval '1 year')
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO tier_configs (id,tier_name,display_name,priority,membership_duration_days,upgrade_condition_groups,renewal_condition_groups,auto_downgrade,is_active) VALUES
                                                                                                                                                                          ('a0000000-0000-4000-8000-000000000001','customer','Customer',0,365,'[]','[]',true,true),
                                                                                                                                                                          ('a0000000-0000-4000-8000-000000000002','vip','VIP',10,365,'[]','[]',true,true)
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO user_tier_memberships (id,user_id,tier_name,tier_config_id,started_at,expires_at,upgraded_by) VALUES
                                                                                                                  ('a1000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','vip','a0000000-0000-4000-8000-000000000002',now()-interval '60 days',now()+interval '305 days','system'),
                                                                                                                  ('a1000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003','customer','a0000000-0000-4000-8000-000000000001',now(),now()+interval '365 days','system')
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO user_tier_histories (id,user_id,from_tier,to_tier,reason,changed_by) VALUES
        ('a2000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','customer','vip','upgrade','system')
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO shipping_zones (id,name,description,countries,sort_order,is_active) VALUES
                                                                                        ('c0000000-0000-4000-8000-000000000001','Hong Kong','Mainland HK delivery','["HK"]',0,true),
                                                                                        ('c0000000-0000-4000-8000-000000000002','Asia Pacific','Regional Asia shipping','["SG","MY","TW"]',1,true)
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO shipping_methods (id,zone_id,name,description,estimated_days,is_active,sort_order) VALUES
                                                                                                       ('c1000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','SF Express','SF Express door-to-door','1-2 working days',true,0),
                                                                                                       ('c1000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000001','Standard Post','HK Post standard delivery','3-5 working days',true,1)
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO shipping_rates (id,method_id,condition_type,condition_min,condition_max,rate_type,cost,sort_order) VALUES
                                                                                                                       ('c2000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','order_max',NULL,500.00,'fixed',28.00,0),
                                                                                                                       ('c2000000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000001','order_min',500.00,NULL,'fixed',0.00,1),
                                                                                                                       ('c2000000-0000-4000-8000-000000000003','c1000000-0000-4000-8000-000000000002','always',NULL,NULL,'fixed',15.00,0)
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO birthday_coupon_config (id,is_enabled,days_before,coupon_type,coupon_value,validity_days,min_order_amount,email_subject) VALUES
        ('d0000000-0000-4000-8000-000000000001',true,3,'percentage',15.00,30,0.00,'Happy Birthday! Here is your gift')
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO points_config (id,is_enabled,expiry_days,min_points_to_redeem,max_redemption_percent) VALUES
        ('e0000000-0000-4000-8000-000000000001',true,365,100,30.00)
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO user_points (id,user_id,balance,lifetime_earned,lifetime_redeemed,lifetime_expired) VALUES
                                                                                                        ('e1000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002',664,664,0,0),
                                                                                                        ('e1000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003',514,514,0,0)
        ON CONFLICT DO NOTHING
    `);

    await q.query(`
      INSERT INTO email_smtp_config (id,is_active,host,port,secure,username,password,from_name,from_email) VALUES
        ('f0000000-0000-4000-8000-000000000001',false,'smtp.example.com',587,false,'','','My Store','noreply@example.com')
        ON CONFLICT DO NOTHING
    `);

    console.log('✅ [globalSetup] DB reset + migrated + seeded');
  } finally {
    await q.release();
  }
}

export default async function globalSetup() {
  const ds = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    migrations: [join(__dirname, '../../src/database/migrations/*.{ts,js}')],
    synchronize: false,
    logging: false,
  });
  await ds.initialize();
  await resetAndSeed(ds);
  await ds.destroy();
}
