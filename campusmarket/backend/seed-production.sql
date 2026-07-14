BEGIN;

UPDATE users SET first_name='Amina', last_name='Nfor', campus_zone='Main Campus',
  bio='Computer science student selling carefully maintained electronics.',
  rating=4.92, sold_items=18, is_verified=true
WHERE email=:'seed_user_1_email';
UPDATE users SET first_name='Joel', last_name='Tamba', campus_zone='North Campus',
  bio='Engineering student and campus cycling enthusiast.',
  rating=4.76, sold_items=11, is_verified=true
WHERE email=:'seed_user_2_email';
UPDATE users SET first_name='Grace', last_name='Mbi', campus_zone='South Campus',
  bio='Creative arts student offering fashion, accessories, and design services.',
  rating=4.88, sold_items=23, is_verified=true
WHERE email=:'seed_user_3_email';
UPDATE users SET first_name='Eric', last_name='Nji', campus_zone='Main Campus',
  bio='Business student looking for practical campus deals.', is_verified=true
WHERE email=:'seed_user_4_email';
UPDATE users SET is_verified=true, campus_zone='Main Campus'
WHERE email IN (:'admin_email', :'demo_email');

INSERT INTO listings
  (id, seller_id, title, description, category, price_fcfa, condition,
   campus_zone, tags, status, views, created_at, updated_at, expires_at)
VALUES
  ('10000000-0000-4000-8000-000000000001', (SELECT id FROM users WHERE email=:'seed_user_1_email'),
   'MacBook Air M2 13-inch', 'Clean 2022 MacBook Air with 8 GB RAM, 256 GB SSD, original charger, and 91% battery health.',
   'Electronics', 525000, 'Like New', 'Main Campus', '["laptop","apple","study"]', 'active', 148, NOW()-INTERVAL '2 days', NOW(), NOW()+INTERVAL '28 days'),
  ('10000000-0000-4000-8000-000000000002', (SELECT id FROM users WHERE email=:'seed_user_1_email'),
   'Casio FX-991ES Plus Calculator', 'Original scientific calculator in excellent working condition with protective cover.',
   'Electronics', 14500, 'Good', 'Main Campus', '["calculator","engineering","exam"]', 'active', 72, NOW()-INTERVAL '1 day', NOW(), NOW()+INTERVAL '29 days'),
  ('10000000-0000-4000-8000-000000000003', (SELECT id FROM users WHERE email=:'seed_user_2_email'),
   'Calculus and Linear Algebra Textbook Set', 'Two clean university textbooks with useful margin notes and no missing pages.',
   'Textbooks', 18000, 'Good', 'North Campus', '["books","mathematics","first-year"]', 'active', 63, NOW()-INTERVAL '4 days', NOW(), NOW()+INTERVAL '26 days'),
  ('10000000-0000-4000-8000-000000000004', (SELECT id FROM users WHERE email=:'seed_user_2_email'),
   'Campus Commuter Bicycle', 'Reliable 7-speed bicycle, recently serviced, with lock, lights, and rear carrier included.',
   'Transport', 95000, 'Good', 'North Campus', '["bicycle","transport","eco"]', 'active', 121, NOW()-INTERVAL '3 days', NOW(), NOW()+INTERVAL '27 days'),
  ('10000000-0000-4000-8000-000000000005', (SELECT id FROM users WHERE email=:'seed_user_2_email'),
   'Compact Hostel Mini Refrigerator', 'Energy-saving 90-litre mini refrigerator, quiet and ideal for a student room.',
   'Housing', 85000, 'Good', 'North Campus', '["hostel","appliance","fridge"]', 'reserved', 94, NOW()-INTERVAL '6 days', NOW(), NOW()+INTERVAL '24 days'),
  ('10000000-0000-4000-8000-000000000006', (SELECT id FROM users WHERE email=:'seed_user_3_email'),
   'Nike Running Shoes Size 42', 'Authentic lightweight trainers worn twice; clean soles and original box available.',
   'Shoes', 32000, 'Like New', 'South Campus', '["shoes","sport","nike"]', 'active', 87, NOW()-INTERVAL '5 hours', NOW(), NOW()+INTERVAL '30 days'),
  ('10000000-0000-4000-8000-000000000007', (SELECT id FROM users WHERE email=:'seed_user_3_email'),
   'Handmade Ankara Bomber Jacket', 'Locally made unisex Ankara jacket with a soft lining and durable metal zip.',
   'Clothing', 27500, 'New', 'South Campus', '["fashion","ankara","handmade"]', 'active', 103, NOW()-INTERVAL '12 hours', NOW(), NOW()+INTERVAL '30 days'),
  ('10000000-0000-4000-8000-000000000008', (SELECT id FROM users WHERE email=:'seed_user_3_email'),
   'Luxury Perfume Discovery Set', 'Five sealed 10 ml fragrances in a gift box; ideal for sampling or gifting.',
   'Perfumes', 22000, 'New', 'South Campus', '["perfume","gift","beauty"]', 'active', 55, NOW()-INTERVAL '1 day', NOW(), NOW()+INTERVAL '29 days'),
  ('10000000-0000-4000-8000-000000000009', (SELECT id FROM users WHERE email=:'seed_user_3_email'),
   'Custom Beaded Bracelet Pair', 'Two adjustable handmade bracelets; colour and name customisation included.',
   'Bracelets', 6500, 'New', 'South Campus', '["bracelet","custom","gift"]', 'active', 44, NOW()-INTERVAL '8 hours', NOW(), NOW()+INTERVAL '30 days'),
  ('10000000-0000-4000-8000-000000000010', (SELECT id FROM users WHERE email=:'seed_user_1_email'),
   'Fresh Tropical Fruit Salad Bowl', 'Chilled single-serving fruit bowl prepared the same day; campus delivery available.',
   'Fruit Salad', 2500, 'New', 'Main Campus', '["food","fresh","delivery"]', 'active', 162, NOW()-INTERVAL '2 hours', NOW(), NOW()+INTERVAL '2 days'),
  ('10000000-0000-4000-8000-000000000011', (SELECT id FROM users WHERE email=:'seed_user_3_email'),
   'Weekend Poster and Logo Design', 'Student-friendly graphic design package with two concepts and two revisions.',
   'Services', 15000, 'New', 'South Campus', '["design","logo","poster"]', 'active', 76, NOW()-INTERVAL '7 days', NOW(), NOW()+INTERVAL '23 days'),
  ('10000000-0000-4000-8000-000000000012', (SELECT id FROM users WHERE email=:'seed_user_1_email'),
   '20000mAh USB-C Power Bank', 'Fast-charging power bank with two USB outputs, USB-C input, cable, and LED display.',
   'Accessories', 19500, 'Like New', 'Main Campus', '["powerbank","phone","charging"]', 'sold', 133, NOW()-INTERVAL '10 days', NOW(), NOW()+INTERVAL '20 days')
ON CONFLICT (id) DO UPDATE SET
  seller_id=EXCLUDED.seller_id, title=EXCLUDED.title, description=EXCLUDED.description,
  category=EXCLUDED.category, price_fcfa=EXCLUDED.price_fcfa, condition=EXCLUDED.condition,
  campus_zone=EXCLUDED.campus_zone, tags=EXCLUDED.tags, status=EXCLUDED.status,
  views=EXCLUDED.views, updated_at=NOW(), expires_at=EXCLUDED.expires_at;

DELETE FROM listing_images WHERE listing_id::text LIKE '10000000-0000-4000-8000-%';
INSERT INTO listing_images (listing_id, image_url, sort_order) VALUES
  ('10000000-0000-4000-8000-000000000001','https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&h=900&fit=crop&q=85',0),
  ('10000000-0000-4000-8000-000000000001','https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1200&h=900&fit=crop&q=85',1),
  ('10000000-0000-4000-8000-000000000002','https://images.unsplash.com/photo-1564473185935-58113cba1e80?w=1200&h=900&fit=crop&q=85',0),
  ('10000000-0000-4000-8000-000000000003','https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=1200&h=900&fit=crop&q=85',0),
  ('10000000-0000-4000-8000-000000000004','https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=1200&h=900&fit=crop&q=85',0),
  ('10000000-0000-4000-8000-000000000005','https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=1200&h=900&fit=crop&q=85',0),
  ('10000000-0000-4000-8000-000000000006','https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&h=900&fit=crop&q=85',0),
  ('10000000-0000-4000-8000-000000000007','https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=1200&h=900&fit=crop&q=85',0),
  ('10000000-0000-4000-8000-000000000008','https://images.unsplash.com/photo-1541643600914-78b084683702?w=1200&h=900&fit=crop&q=85',0),
  ('10000000-0000-4000-8000-000000000009','https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1200&h=900&fit=crop&q=85',0),
  ('10000000-0000-4000-8000-000000000010','https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=1200&h=900&fit=crop&q=85',0),
  ('10000000-0000-4000-8000-000000000011','https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=900&fit=crop&q=85',0),
  ('10000000-0000-4000-8000-000000000012','https://images.unsplash.com/photo-1609592424824-43e0a55eab54?w=1200&h=900&fit=crop&q=85',0);

INSERT INTO search_index (listing_id, search_vector, updated_at)
SELECT id, to_tsvector('english', concat_ws(' ', title, description, category, campus_zone, tags::text)), NOW()
FROM listings WHERE id::text LIKE '10000000-0000-4000-8000-%'
ON CONFLICT (listing_id) DO UPDATE SET search_vector=EXCLUDED.search_vector, updated_at=NOW();

INSERT INTO wishlist (user_id, listing_id)
SELECT (SELECT id FROM users WHERE email=:'demo_email'), id
FROM listings WHERE id IN ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000006','10000000-0000-4000-8000-000000000009')
ON CONFLICT DO NOTHING;

INSERT INTO offers (id, listing_id, buyer_id, amount, note, status, counter_amount, created_at) VALUES
  ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',(SELECT id FROM users WHERE email=:'seed_user_4_email'),490000,'Can meet at the library this afternoon.','countered',510000,NOW()-INTERVAL '6 hours'),
  ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000006',(SELECT id FROM users WHERE email=:'demo_email'),30000,'I can collect from South Campus.','pending',NULL,NOW()-INTERVAL '2 hours')
ON CONFLICT (id) DO UPDATE SET amount=EXCLUDED.amount, note=EXCLUDED.note, status=EXCLUDED.status, counter_amount=EXCLUDED.counter_amount;

INSERT INTO conversations (id, buyer_id, seller_id, listing_id, unread_count, created_at) VALUES
  ('30000000-0000-4000-8000-000000000001',(SELECT id FROM users WHERE email=:'seed_user_4_email'),(SELECT id FROM users WHERE email=:'seed_user_1_email'),'10000000-0000-4000-8000-000000000001',1,NOW()-INTERVAL '7 hours')
ON CONFLICT (id) DO UPDATE SET unread_count=EXCLUDED.unread_count;
INSERT INTO messages (id, conversation_id, sender_id, text, type, is_read, created_at) VALUES
  ('31000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001',(SELECT id FROM users WHERE email=:'seed_user_4_email'),'Hello, is the MacBook still available?','text',true,NOW()-INTERVAL '7 hours'),
  ('31000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001',(SELECT id FROM users WHERE email=:'seed_user_1_email'),'Yes, it is. You can inspect it at the main library.','text',false,NOW()-INTERVAL '6 hours 45 minutes')
ON CONFLICT (id) DO UPDATE SET text=EXCLUDED.text, is_read=EXCLUDED.is_read;

INSERT INTO transactions (id, listing_id, buyer_id, seller_id, final_price, completed_at) VALUES
  ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000012',(SELECT id FROM users WHERE email=:'seed_user_4_email'),(SELECT id FROM users WHERE email=:'seed_user_1_email'),18000,NOW()-INTERVAL '4 days')
ON CONFLICT (id) DO UPDATE SET final_price=EXCLUDED.final_price;
INSERT INTO reviews (id, reviewer_id, seller_id, rating, comment, created_at) VALUES
  ('41000000-0000-4000-8000-000000000001',(SELECT id FROM users WHERE email=:'seed_user_4_email'),(SELECT id FROM users WHERE email=:'seed_user_1_email'),5,'Item matched the description and pickup was easy.',NOW()-INTERVAL '3 days')
ON CONFLICT (id) DO UPDATE SET rating=EXCLUDED.rating, comment=EXCLUDED.comment;

INSERT INTO notifications (id, user_id, type, title, description, link, is_read, created_at) VALUES
  ('50000000-0000-4000-8000-000000000001',(SELECT id FROM users WHERE email=:'seed_user_1_email'),'offer','New offer on your MacBook','Eric offered 490,000 FCFA.','/offers',false,NOW()-INTERVAL '6 hours'),
  ('50000000-0000-4000-8000-000000000002',(SELECT id FROM users WHERE email=:'demo_email'),'wishlist','Price-friendly campus picks','New items match your saved categories.','/wishlist',false,NOW()-INTERVAL '1 hour')
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description, is_read=EXCLUDED.is_read;

INSERT INTO reports (id, listing_id, reason, description, severity, status, reporter_id, created_at) VALUES
  ('60000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000008','Incorrect category','Demonstration moderation report for administrator review.','low','pending',(SELECT id FROM users WHERE email=:'demo_email'),NOW()-INTERVAL '30 minutes')
ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, description=EXCLUDED.description;
INSERT INTO fraud_flags (id, listing_id, seller_id, type, rule, resolved, created_at) VALUES
  ('61000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',(SELECT id FROM users WHERE email=:'seed_user_1_email'),'DEMO_REVIEW','Demonstration flag used to exercise the moderation workflow.',false,NOW()-INTERVAL '20 minutes')
ON CONFLICT (id) DO UPDATE SET rule=EXCLUDED.rule, resolved=EXCLUDED.resolved;

COMMIT;
