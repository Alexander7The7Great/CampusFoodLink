if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const path = require('path')
const express = require('express')
const app = express()
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
const sqlite3 = require('sqlite3')
const { open } = require('sqlite')
const { getMealPlanBalance } = require('./mealPlanTransactionsModule')
const { getVendors, getVendorsMenu, getVendorByID } = require('./vendorAndMenuModule')
const { createOrder, getActiveOrders } = require('./orderManagementModule')

const initializePassport = require('./passportConfig')

// Open the SQLite database once on startup and share it
async function startServer() {
    const db = await open({
        filename: './database/Dining_Database.db',
        driver: sqlite3.Database
    })

    //have passport access the database
    initializePassport(passport, db)

    app.set('view-engine', 'ejs')
    app.set('views', path.join(__dirname, '../front_end'))
    app.use(express.urlencoded({ extended: false }))
    app.use(flash())
    app.use(session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
    }))
    app.use(passport.initialize())
    app.use(passport.session())
    app.use(methodOverride('_method'))

    app.get('/login', checkNotAuthenticated, (req, res) => {
        res.render('login.ejs')
    })



    //post the information gained in the login page
    app.post('/login', checkNotAuthenticated, (req, res, next) => {
        passport.authenticate('local', (err, user, info) => {
            if (err) return next(err)
            if (!user) {
                req.flash('error', info.message)
                return res.redirect('/login')
            }

            req.logIn(user, (err) => {
                if (err) return next(err)

                // Redirect based on role name set in passport
                switch (user.role_name) {
                    case 'student': return res.redirect('/student/home')
                    case 'vendor': return res.redirect('/vendor/home')
                    case 'admin': return res.redirect('/admin/home')
                    default: return res.redirect('/login')
                }
            })
        })(req, res, next)
    })

    //route for the student users to their home and provides the active orders and menus to choose from
    app.get('/student/home', checkAuthenticated, checkRole('student'), async (req, res) => {
        const balance = await getMealPlanBalance(db, req.user.user_id)
        const vendors = await getVendors(db)
        const activeOrders = await getActiveOrders(db, req.user.user_id)
        res.render('studenthome.ejs', { balance, vendors, activeOrders })

    })



    //route for directing the user to a view of the vendor's menu they want to order from
    app.get('/vendormenu/:vendorId', checkAuthenticated, checkRole('student'), async (req, res) => {
        const venID = req.params.vendorId
        const vendorMenu = await getVendorsMenu(db, venID)
        const balance = await getMealPlanBalance(db, req.user.user_id)
        res.render('vendormenu.ejs', { vendorMenu, balance })
    })

    app.post('/order', checkAuthenticated, checkRole('student'), async (req, res) => {
            const { vendorId, orderTotal, items } = req.body

            //items arrives as a JSON string from the hidden form field;
            //parse it back into an array of {id, amount}
            const parsedItems = JSON.parse(items || '[]')

            if (parsedItems.length === 0) {
                req.flash('error', 'Your cart is empty')
                return res.redirect(`/vendormenu/${vendorId}`)
            }

            await createOrder(
                db,
                req.user.user_id,
                vendorId,
                parseFloat(orderTotal),
                new Date().toISOString(),
                parsedItems
            )

            res.redirect('/student/home')
     
    })





    //route for users that are vendors
    app.get('/vendor/home', checkAuthenticated, checkRole('vendor'), (req, res) => {
        res.render('vendorhome.ejs')
    })



    //route to direct the user to the admin home if they are an authenticated admin user
    app.get('/admin/home', checkAuthenticated, checkRole('admin'), (req, res) => {
        res.render('adminhome.ejs')
    })



    //route for accessing the register page
    app.get('/register', checkNotAuthenticated, (req, res) => {
        res.render('register.ejs')
    })



    //submit the new user account creation
    app.post('/register', checkNotAuthenticated, async (req, res) => {
        try {
            // Check if email is already registered
            const existing = await db.get(
                'SELECT user_id FROM "user" WHERE email = ?',
                [req.body.email]
            )
            if (existing) {
                req.flash('error', 'An account with that email already exists')
                return res.redirect('/register')
            }

            const hashedPassword = await bcrypt.hash(req.body.password, 10)

            //insert registered users into user table with password and as student role as default
            const result = await db.run(
                'INSERT INTO "user" (email, role_id, password_hash) VALUES (?, ?, ?)',
                [req.body.email, 1, hashedPassword]
            )

            //since the register is going to be for students the student profile table needs
            //to be updated with the associated user id and a default empty meal balance
            await db.run(
                'INSERT INTO student_profile (user_id, meal_plan_balance) VALUES (?, ?)',
                [result.lastID, 0.0]
            )

            //send users back to login once they have registered
            res.redirect('/login')
        } catch (e) { //direct the user back to the register page and log errors when they occur
            console.error(e)
            res.redirect('/register')
        }
    })



    //clear the session direct the user back to the login page when they logout
    app.delete('/logout', (req, res, next) => {
        req.logout(function (err) {
            if (err) return next(err)
            res.redirect('/login')
        })
    })



    function checkAuthenticated(req, res, next) {
        if (req.isAuthenticated()) return next()
        res.redirect('/login')
    }



    //
    function checkNotAuthenticated(req, res, next) {
        if (req.isAuthenticated()) return res.redirect()
        next()
    }



    //checks the role of the current user to see if they are in a role that is allowed on the given page
    function checkRole(role) {
        return (req, res, next) => {
            if (req.user && req.user.role_name === role) return next()
            //redirect users to their appropriate home pages, or login if they are not
            switch (req.user?.role_name) {
                case 'student': return res.redirect('/student/home')
                case 'vendor': return res.redirect('/vendor/home')
                case 'admin': return res.redirect('/admin/home')
                default: return res.redirect('/login')
            }
        }
    }

    //
    app.listen(3000)
}

startServer()