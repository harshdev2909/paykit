import session from "express-session";
import { RedisStore } from "connect-redis";
import { createClient } from "redis";
import { config } from "../config";

export function createSessionMiddleware() {
  const redisClient = createClient({ url: config.redis.url });
  redisClient.connect().catch((err) => console.error("Redis session store connect error", err));

  const store = new RedisStore({ client: redisClient, prefix: "paykit:sess:" });

  return session({
    store,
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    name: "paykit.sid",
    cookie: {
      secure: config.nodeEnv === "production",
      httpOnly: true,
      maxAge: config.session.cookieMaxAge,
      sameSite: "lax",
    },
  });
}
