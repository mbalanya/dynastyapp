const db = require("../db");
const { Strategy, ExtractJwt } = require("passport-jwt");
const passport = require("passport");
const SECRET = process.env.TOKEN_SECRET;

const options = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: SECRET
  };

module.exports = (passport) => {
    passport.use(
        new Strategy(options, async (payload, done) => {
            await db.query("SELECT * FROM members WHERE member_id = $1", [payload.member_id])
                .then(user => {
                    if (user) {
                        return done(null, user);
                    }
                    return done(null, false);
                })
                .catch(err => {
                    return done(null, false);
                });
        })
    );
};