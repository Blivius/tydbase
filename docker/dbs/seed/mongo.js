// TydBase dev seed for MongoDB 8. Runs once, on first container start.
db = db.getSiblingDB("tydbase_dev"); // init scripts get `db`; reassign, never redeclare (TDZ)

db.workspaces.insertMany([
  { slug: "northstar-labs", plan: "cloud-pro", region: "us-east-1", tags: ["fintech", "eu"] },
  { slug: "kestrel-pay", plan: "cloud-pro", region: "eu-central-1", tags: ["payments"] },
  { slug: "harbor-ml", plan: "self-hosted", region: "ap-southeast-1", tags: ["ml", "vector"] },
  { slug: "verve-commerce", plan: "cloud-hobby", region: "us-west-2", tags: ["retail"] },
]);

db.carts.insertMany(
  Array.from({ length: 200 }, (_, i) => ({
    cartId: `cart_${String(i + 1).padStart(4, "0")}`,
    workspace: ["northstar-labs", "kestrel-pay", "harbor-ml", "verve-commerce"][i % 4],
    status: ["open", "abandoned", "checked_out"][i % 3],
    customer: { email: `buyer${i + 1}@example.com`, country: ["US", "DE", "SG", "BD"][i % 4] },
    items: [{ sku: `SKU-${(i * 7) % 50}`, qty: 1 + (i % 3), priceCents: 999 + ((i * 131) % 9000) }],
    updatedAt: new Date(Date.UTC(2026, 10, 1) + i * 3600000),
  }))
);
db.carts.createIndex({ workspace: 1, status: 1 });

db.createUser({
  user: "tydbase_app",
  pwd: "tydbase_dev_password",
  roles: [{ role: "readWrite", db: "tydbase_dev" }],
});
