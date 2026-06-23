//import passport for local authentication and session handling
const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')

//establish the passport function to used in the server file
function initialize(passport, db) {

    const authenticateUser = async (email, password, done) => {
        try {
            //request the user information from the database along with the associated role
            const user = await db.get(
                `SELECT u.*, r.role_name
                 FROM "user" u
                 JOIN user_role r ON u.role_id = r.role_id
                 WHERE u.email = ?`,
                [email]
            )

            //catch when there is no matching email and report it back to the user
            if (user == null) {
                return done(null, false, { message: 'No user with that email' })
            }

            //when there is a matching email the password is then checked against the stored password for the user
            if (await bcrypt.compare(password, user.password_hash)) {
                return done(null, user)

            } else { //inform the user that the password they gave was wrong if the email matched
                return done(null, false, { message: 'Password incorrect' })
            }

        } catch (e) {
            return done(e)
        }
    }

    passport.use(
        new LocalStrategy(
            { usernameField: 'email' },
            authenticateUser
        )
    )

    //attach the users id to the session
    passport.serializeUser((user, done) => done(null, user.user_id))

    //allows for the user data such as role to be easily accessed through req
    passport.deserializeUser(async (id, done) => {
        try {
           
            const user = await db.get(
                `SELECT u.*, r.role_name
                 FROM "user" u
                 JOIN user_role r ON u.role_id = r.role_id
                 WHERE u.user_id = ?`,
                [id]
            )
            
            return done(null, user)
        } catch (e) {
            return done(e)
        }
    })
}

//export the initialize function so it can be used in other files, such as the server file
module.exports = initialize