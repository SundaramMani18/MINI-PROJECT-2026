require("dotenv").config({ path: "../.env" });
const { Client } = require("pg");
console.log("Password type:", typeof process.env.DB_PASSWORD);
console.log("Password exists:", Boolean(process.env.DB_PASSWORD));

const client = new Client({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function testConnection() {
  try {
    await client.connect();
    const result = await client.query("SELECT current_database()");
    console.log("PostgreSQL connected successfully!");
    console.log("Database:", result.rows[0].current_database);
  } catch (error) {
    console.error("Connection failed:", error.message);
  } finally {
    await client.end().catch(() => {});
  }
}

testConnection();