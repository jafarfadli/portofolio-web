import { dbFile, migrateDb, openDb } from "./client";

migrateDb(openDb(dbFile()));
console.log(`Migrated ${dbFile()}`);
