import { Kysely } from "kysely";
import { PostgresJSDialect } from "kysely-postgres-js";
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config();

import { syncSchema, type DB } from "./config";

const db = (): Kysely<DB> => {
  if (!process.env.DATABASE_URL) {
    throw new Error("No DATABASE_URL set");
  }

  try {
    const database = new Kysely<DB>({
      dialect: new PostgresJSDialect({
        postgres: postgres(process.env.DATABASE_URL),
      }),
    });

    syncSchema(database);

    return database;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
};

export { db };
