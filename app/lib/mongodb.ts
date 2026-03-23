import mongoose from "mongoose";

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseConn?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
};

const cached = globalForMongoose.mongooseConn ?? { conn: null, promise: null };

if (!globalForMongoose.mongooseConn) {
  globalForMongoose.mongooseConn = cached;
}

function mongoUriFromPassword(): string {
  const password = process.env.MONGO_PASSWORD?.trim();
  if (!password) {
    throw new Error("Set MONGO_URI or MONGO_PASSWORD");
  }
  const user = process.env.MONGO_USER?.trim() || "mangosteenadmin";
  const host = process.env.MONGO_HOST?.trim() || "mangosteen-mongo";
  const db = process.env.MONGO_DB?.trim() || "mangosteen";
  const port = process.env.MONGO_PORT?.trim() || "27017";
  return `mongodb://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}`;
}

/** Prefer MONGO_URI (e.g. local dev); otherwise build from MONGO_PASSWORD (e.g. K8s Secret). */
export function getMongoUri(): string {
  const uri = process.env.MONGO_URI?.trim();
  if (uri) {
    return uri;
  }
  return mongoUriFromPassword();
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
