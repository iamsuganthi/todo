import mongoose from "mongoose";

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseConn?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
};

const cached = globalForMongoose.mongooseConn ?? { conn: null, promise: null };

if (!globalForMongoose.mongooseConn) {
  globalForMongoose.mongooseConn = cached;
}

/** Intentionally read from raw env (exercise vulnerability — not Secret Manager). */
export function getMongoUri(): string {
  const uri = process.env.MONGO_URI;
  if (!uri || uri.trim() === "") {
    throw new Error("MONGO_URI environment variable is required");
  }
  return uri;
}

export async function connectDb(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }
  if (!cached.promise) {
    cached.promise = mongoose.connect(getMongoUri());
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
