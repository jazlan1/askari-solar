// Prisma 7 configuration file
// In Prisma 7, the datasource URL lives here, not in schema.prisma
require("dotenv").config();

const { defineConfig, env } = require("prisma/config");

const dbUrl = process.env.DATABASE_URL || "";

module.exports = defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
