// Sample data for the site's caught-write demo. Values read as samples (example.com, round
// amounts), never as claims about real customers.
export const SEED_SQL = `
CREATE TABLE customers (
  id    integer PRIMARY KEY,
  name  text NOT NULL,
  email text NOT NULL
);

CREATE TABLE orders (
  id          integer PRIMARY KEY,
  customer_id integer NOT NULL REFERENCES customers (id),
  total       numeric(10, 2) NOT NULL,
  status      text NOT NULL
);

INSERT INTO customers (id, name, email) VALUES
  (6, 'Example Bakery', 'orders@bakery.example.com'),
  (7, 'Example Studio', 'billing@studio.example.com'),
  (8, 'Example Garage', 'hello@garage.example.com');

INSERT INTO orders (id, customer_id, total, status) VALUES
  (1040, 6, 120.00, 'paid'),
  (1041, 7, 240.00, 'paid'),
  (1042, 7, 80.00, 'paid'),
  (1043, 7, 310.00, 'paid'),
  (1044, 7, 55.00, 'shipped'),
  (1045, 8, 95.00, 'paid');
`;

/** The write the demo's agent proposes. It touches three of customer 7's orders. */
export const AGENT_WRITE_SQL = `UPDATE orders
SET status = 'refunded'
WHERE customer_id = 7 AND status = 'paid'`;

/** Reads the rows the agent's write targets, with xmin so an approved apply can detect drift. */
export const TARGET_ROWS_SQL = `SELECT o.id, c.email, o.total::text AS total, o.status, o.xmin::text AS xmin
FROM orders o JOIN customers c ON c.id = o.customer_id
WHERE o.customer_id = 7 AND o.status = 'paid'
ORDER BY o.id`;
