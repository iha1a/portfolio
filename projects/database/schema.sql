-- Glow Studio store database
-- Normalised to 3NF: customers, categories, products, orders, order_items, reviews.
-- Written in portable SQL (runs on SQLite; the same design maps directly to MySQL / PostgreSQL).

PRAGMA foreign_keys = ON;

CREATE TABLE customers (
  customer_id   INTEGER PRIMARY KEY,
  full_name     TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE CHECK (email LIKE '%_@_%._%'),
  city          TEXT    NOT NULL,
  joined_on     DATE    NOT NULL
);

CREATE TABLE categories (
  category_id   INTEGER PRIMARY KEY,
  name          TEXT    NOT NULL UNIQUE
);

CREATE TABLE products (
  product_id    INTEGER PRIMARY KEY,
  category_id   INTEGER NOT NULL REFERENCES categories(category_id),
  name          TEXT    NOT NULL,
  price         REAL    NOT NULL CHECK (price > 0),
  stock         INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0)
);

CREATE TABLE orders (
  order_id      INTEGER PRIMARY KEY,
  customer_id   INTEGER NOT NULL REFERENCES customers(customer_id),
  ordered_on    DATE    NOT NULL,
  status        TEXT    NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','shipped','delivered','cancelled'))
);

CREATE TABLE order_items (
  order_id      INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  product_id    INTEGER NOT NULL REFERENCES products(product_id),
  quantity      INTEGER NOT NULL CHECK (quantity > 0),
  unit_price    REAL    NOT NULL CHECK (unit_price > 0),
  PRIMARY KEY (order_id, product_id)
);

CREATE TABLE reviews (
  review_id     INTEGER PRIMARY KEY,
  product_id    INTEGER NOT NULL REFERENCES products(product_id),
  customer_id   INTEGER NOT NULL REFERENCES customers(customer_id),
  rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body          TEXT,
  UNIQUE (product_id, customer_id)
);

-- Indexes for the most common lookups (orders by customer and by date, items by product).
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_date     ON orders(ordered_on);
CREATE INDEX idx_items_product   ON order_items(product_id);

-- Keep stock correct automatically: selling an item reduces stock, and overselling is rejected.
CREATE TRIGGER trg_item_stock
BEFORE INSERT ON order_items
BEGIN
  SELECT RAISE(ABORT, 'Not enough stock')
  WHERE (SELECT stock FROM products WHERE product_id = NEW.product_id) < NEW.quantity;
  UPDATE products SET stock = stock - NEW.quantity WHERE product_id = NEW.product_id;
END;

-- Reporting view: one row per order with its total.
CREATE VIEW order_totals AS
SELECT o.order_id, o.customer_id, o.ordered_on, o.status,
       ROUND(SUM(i.quantity * i.unit_price), 2) AS total
FROM orders o JOIN order_items i ON i.order_id = o.order_id
GROUP BY o.order_id;

-- ---------- sample data ----------
INSERT INTO categories (category_id, name) VALUES (1,'Face'),(2,'Lips'),(3,'Eyes'),(4,'Tools');

INSERT INTO products VALUES
 (1,1,'Skin Tint Foundation',29,120),(2,1,'Soft Blur Concealer',19,90),(3,1,'Cream Blush Stick',21,60),
 (4,2,'Velvet Matte Lipstick',18,150),(5,2,'Glass Shine Gloss',14,80),(6,3,'Nude Dreams Palette',34,40),
 (7,3,'Lift & Curl Mascara',16,110),(8,4,'Blending Brush Duo',22,12);

INSERT INTO customers VALUES
 (1,'Lina Haddad','lina@example.com','Damascus','2026-01-08'),(2,'Rama Saleh','rama@example.com','Aleppo','2026-01-21'),
 (3,'Noor Kassem','noor@example.com','Hama','2026-02-03'),(4,'Maya Khoury','maya@example.com','Homs','2026-02-17'),
 (5,'Sara Youssef','sara@example.com','Latakia','2026-03-02'),(6,'Dana Ali','dana@example.com','Hama','2026-03-15'),
 (7,'Yara Nasser','yara@example.com','Damascus','2026-04-09'),(8,'Hiba Omar','hiba@example.com','Tartus','2026-05-11');

INSERT INTO orders VALUES
 (1,1,'2026-01-10','delivered'),(2,2,'2026-01-25','delivered'),(3,1,'2026-02-14','delivered'),(4,3,'2026-02-20','delivered'),
 (5,4,'2026-03-05','delivered'),(6,5,'2026-03-18','shipped'),(7,1,'2026-04-02','delivered'),(8,6,'2026-04-22','delivered'),
 (9,3,'2026-05-06','cancelled'),(10,7,'2026-05-19','delivered'),(11,2,'2026-06-01','shipped'),(12,4,'2026-06-12','paid');

INSERT INTO order_items VALUES
 (1,1,1,29),(1,4,2,18),(2,6,1,34),(2,7,1,16),(3,5,2,14),(3,3,1,21),(4,1,1,29),(4,2,1,19),
 (5,4,3,18),(6,8,1,22),(6,6,1,34),(7,1,1,29),(7,7,2,16),(8,3,2,21),(9,5,1,14),(10,6,1,34),
 (10,4,1,18),(10,2,1,19),(11,1,2,29),(12,7,1,16),(12,8,2,22);

INSERT INTO reviews VALUES
 (1,1,1,5,'Perfect match for my skin'),(2,4,1,4,'Lovely colour, a bit drying'),(3,6,2,5,'Best palette I own'),
 (4,1,3,4,'Light and natural'),(5,4,4,5,'Lasts all day'),(6,8,5,3,'Good but sheds a little'),
 (7,7,1,4,'Nice curl'),(8,3,6,5,'Gorgeous flush'),(9,6,7,4,'Great everyday shades');
