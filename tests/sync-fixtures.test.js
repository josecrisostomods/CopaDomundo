import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/sync-fixtures.js";

test("rota retorna 104 jogos locais quando provedores nao estao configurados", async () => {
  const previousApiFootballKey = process.env.API_FOOTBALL_KEY;
  const previousFootballDataToken = process.env.FOOTBALL_DATA_TOKEN;
  delete process.env.API_FOOTBALL_KEY;
  delete process.env.FOOTBALL_DATA_TOKEN;

  let statusCode = null;
  let responseBody = null;
  const response = {
    setHeader() {},
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };

  try {
    await handler({ method: "GET", query: {} }, response);
  } finally {
    if (previousApiFootballKey === undefined) delete process.env.API_FOOTBALL_KEY;
    else process.env.API_FOOTBALL_KEY = previousApiFootballKey;
    if (previousFootballDataToken === undefined) delete process.env.FOOTBALL_DATA_TOKEN;
    else process.env.FOOTBALL_DATA_TOKEN = previousFootballDataToken;
  }

  assert.equal(statusCode, 200);
  assert.equal(responseBody.provider, "calendario-local");
  assert.equal(responseBody.fallback, true);
  assert.equal(responseBody.fixtures.length, 104);
});
