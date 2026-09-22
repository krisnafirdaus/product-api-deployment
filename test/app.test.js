import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { createApp } from "../src/app.js";

const fakeProducts = [
  { id: 1, name: "Product Demo A", price: "125000.00" },
];

const pool = {
  async query(sql) {
    assert.match(sql, /SELECT id, name, price, created_at FROM products/);
    return [fakeProducts];
  },
};

test("GET /health returns a liveness response", async () => {
  const response = await request(createApp({ pool })).get("/health");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: "ok" });
});

test("GET /api/products returns products from the database", async () => {
  const response = await request(createApp({ pool })).get("/api/products");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, fakeProducts);
});

test("unknown routes return JSON 404", async () => {
  const response = await request(createApp({ pool })).get("/missing");

  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { error: "Not found" });
});
