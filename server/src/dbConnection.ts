// ----------  MongoDB connection helper  ----------

import { MongoClient, type MongoClientOptions, Db } from "mongodb";
import { CategoryMeta } from "../models/categoryModel";
import { MediaMeta } from "../models/mediaModel";

const isProduction = process.env.NODE_ENV === "production";

// no local mongod in production, so a missing URI should stop us here instead
// of booting fine and then 500ing on every single request.
if (isProduction && !process.env.MONGODB_URI) {
	throw new Error("MONGODB_URI is required in production. Set it to your MongoDB connection string.");
}

const mongoUrl = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/";

const DB_NAME = process.env.MONGODB_DB ?? "good2know";

const clientOptions: MongoClientOptions = {
  maxPoolSize: 20,
  minPoolSize: 0,
  serverSelectionTimeoutMS: 5000,
  waitQueueTimeoutMS: 5000,
  socketTimeoutMS: 60000,
};

const client = new MongoClient(mongoUrl, clientOptions);

client.on("error", (err: Error) => {
  console.info("Connection error at:", new Date().toLocaleDateString());
  console.error("Connection error occurred:", err.message);
});

declare global {
  var __MONGO_EVENTS_ATTACHED__: boolean | undefined;
}

// one of these per pooled connection, way too noisy for a real log
if (!globalThis.__MONGO_EVENTS_ATTACHED__ && !isProduction) {
  globalThis.__MONGO_EVENTS_ATTACHED__ = true;

  // ---- Helpful driver events (valid) ----
  client.on("connectionPoolCreated", (e) => {
    console.info(" connectionPoolCreated:", e?.address ?? "", e.time, e.options);
  });
  client.on("connectionCreated", (e) => {
    console.info(" connectionCreated:", e?.address ?? "");
  });
  client.on("connectionClosed", (e) => {
    console.info(" connectionClosed:", e?.address ?? "", e?.reason ?? "");
  });
  client.on("connectionPoolClosed", (e) => {
    console.info(" connectionPoolClosed:", e?.address ?? "");
  });
}

let connectOnce: Promise<void> | null = null;

export async function initMongo(): Promise<void> {
  if (!connectOnce) {
    connectOnce = client
      .connect()
      .then(async () => {
        console.info(`Connected to MongoDB (database: ${DB_NAME})`);
        // needs a live connection, so it waits for this
        await createArticlesIndexing();
      })
      .catch((err) => {
        connectOnce = null; // allow retry on next call
        throw err;
      });
  }
  return connectOnce;
}

async function shutdown() {
  try {
    if (client) await client.close(); // closes monitoring & pool
    console.info(" MongoDB client closed");
  } catch (e) {
    console.warn("Error closing Mongo client:", (e as Error).message);
  }
}

process.on("SIGINT", async () => {
  await shutdown();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await shutdown();
  process.exit(0);
});

const good2knowDB: Db = client.db(DB_NAME);
export const categoriesDB = good2knowDB.collection<CategoryMeta>("categories");
export const mediaDB = good2knowDB.collection<MediaMeta>("media");

async function createArticlesIndexing() {
  try {
    await categoriesDB.createIndex({ "articles.content": "text" });
  } catch (error) {
    console.error("Failed creating the articles text index:", (error as Error).message);
  }
}
