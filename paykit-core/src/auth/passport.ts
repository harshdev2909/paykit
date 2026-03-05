import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../database/models";
import { config } from "../config";

export interface SessionUser {
  id: string;
  email?: string;
  name?: string;
  provider?: string;
  plan: string;
}

passport.serializeUser((user: Express.User, done) => {
  done(null, (user as SessionUser).id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id).lean().exec();
    if (user) {
      done(null, {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        provider: user.provider,
        plan: user.plan ?? "free",
      } as SessionUser);
    } else {
      done(null, null);
    }
  } catch (err) {
    done(err, null);
  }
});

if (config.oauth.google.clientId && config.oauth.google.clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.oauth.google.clientId,
        clientSecret: config.oauth.google.clientSecret,
        callbackURL: `${config.oauth.callbackBaseUrl.replace(/\/$/, "")}/auth/callback/google`,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const name = profile.displayName ?? email;
          const user = await User.findOne({ provider: "google", providerId: profile.id }).lean().exec();
          let u: { _id: { toString(): string }; email?: string; name?: string; provider?: string; plan?: string } | null = user;
          if (u) {
            await User.updateOne(
              { _id: u._id },
              { $set: { email, name, updatedAt: new Date() } }
            ).exec();
          } else {
            const created = await User.create({
              email,
              name,
              provider: "google",
              providerId: profile.id,
              plan: "free",
            });
            u = created.toObject() as { _id: { toString(): string }; email?: string; name?: string; provider?: string; plan?: string };
          }
          return done(null, { id: u!._id.toString(), email: u!.email, name: u!.name, provider: u!.provider, plan: u!.plan ?? "free" } as SessionUser);
        } catch (err) {
          return done(err as Error, undefined);
        }
      }
    )
  );
}

export default passport;
