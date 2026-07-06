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
const { getMealPlanBalance, addMealBalance } = require('./mealPlanTransactionsModule')
const { getVendors, getVendorsMenu, getVendorID, getVendorByID, getMenuForVendor,
    updateAvailability, deleteMenuItem } = require('./vendorAndMenuModule')
const { createOrder, getActiveOrders, getIncomingOrders,
    getOrderQueue, updateOrderStatus, rejectOrder } = require('./orderManagementModule')
const { getAllStudents } = require('./accountManagement')
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

    //route for the student users to their home and provides the active orders and menus to choose from
    app.get('/student/home', checkAuthenticated, checkRole('student'), async (req, res) => {
        const balance = await getMealPlanBalance(db, req.user.user_id)
        const vendors = await getVendors(db)
        const activeOrders = await getActiveOrders(db, req.user.user_id)
        res.render('studenthome.ejs', { balance, vendors, activeOrders })

    })



    //route for directing the user to a view of the vendor's menu they want to order from
    app.get('/vendormenu/:vendorId', checkAuthenticated, checkRole('student'), async (req, res) => {
        //take route based on the vendors id attached to the button
        const venID = req.params.vendorId
        const vendorMenu = await getVendorsMenu(db, venID)
        const balance = await getMealPlanBalance(db, req.user.user_id)
        res.render('vendormenu.ejs', { vendorMenu, balance })
    })

    //take the post from the menu and run the order creation function
    app.post('/order', checkAuthenticated, checkRole('student'), async (req, res) => {
        const { vendorId, orderTotal, items } = req.body

        //items come back as json from the form in the page
        const parsFood = JSON.parse(items)

        //have the create order function used for interacting with the database and taking all the gather data 
        //to create an order filling all of the tables 
        await createOrder(
            db,
            req.user.user_id,
            vendorId,
            parseFloat(orderTotal),
            new Date().toISOString(),
            parsFood
        )

        //send the user back to home when they submit the order
        res.redirect('/student/home')

    })



    //-------------------VENDOR____ROUTES---------------------

    //route for users that are vendors
    app.get('/vendor/home', checkAuthenticated, checkRole('vendor'), async (req, res) => {
        const venID = await getVendorID(db, req.user.user_id)
        const vendorMenu = await getMenuForVendor(db, venID.vendor_id)
        const newOrders = await getIncomingOrders(db, venID.vendor_id)
        const orderQueue = await getOrderQueue(db, venID.vendor_id)
        res.render('vendorhome.ejs', { vendorMenu, newOrders, orderQueue })
    })



    //post for acceptings orders and setting their status as preparing
    app.post('/vendor/order/accept', checkAuthenticated, checkRole('vendor'), async (req, res) => {
        const { orderId } = req.body;
        const time = new Date().toISOString();
        await updateOrderStatus(db, orderId, 'Preparing', time);

        res.redirect('/vendor/home');
    })
    //post to add funds back to the student, set the order status to rejected
    app.post('/vendor/order/reject', checkAuthenticated, checkRole('vendor'), async (req, res) => {
        const { orderId, studentId, orderTotal } = req.body;
        const time = new Date().toISOString();
        await rejectOrder(db, orderId, studentId, parseFloat(orderTotal), time);

        res.redirect('/vendor/home');
    })

    app.post('/vendor/order/ready', checkAuthenticated, checkRole('vendor'), async (req, res) => {
        const { orderId } = req.body;
        const time = new Date().toISOString();
        await updateOrderStatus(db, orderId, 'Ready', time);

        res.redirect('/vendor/home');
    })

    app.post('/vendor/order/complete', checkAuthenticated, checkRole('vendor'), async (req, res) => {
        const { orderId } = req.body;
        const time = new Date().toISOString();
        await updateOrderStatus(db, orderId, 'Complete', time);

        res.redirect('/vendor/home');
    })

    app.post('/vendor/menu/availability', checkAuthenticated, checkRole('vendor'), async (req, res) => {
        const { itemId, available } = req.body;
        await updateAvailability(db, itemId, available);

        res.redirect('/vendor/home');
    })

    app.get('/menumanagement', checkAuthenticated, checkRole('vendor'), async (req, res) => {
        const venID = await getVendorID(db, req.user.user_id)
        const vendorMenu = await getMenuForVendor(db, venID.vendor_id)
        res.render('menumanagement.ejs', { vendorMenu })
    })

    app.post('/menumngt/availability', checkAuthenticated, checkRole('vendor'), async (req, res) => {
        const { itemId, available } = req.body;
        await updateAvailability(db, itemId, available);

        res.redirect('/menumanagement');
    })

    app.post('/menumngt/delete', checkAuthenticated, checkRole('vendor'), async (req, res) => {
        const { itemId, venID } = req.body;
        await deleteMenuItem(db, itemId, venID);

        res.redirect('/menumanagement')
    })
    //--------------------VENDOR____ROUTES-----------------------





    //--------------------ADMIN____ROUTES-------------------------

    //route to direct the user to the admin home if they are an authenticated admin user
    app.get('/admin/home', checkAuthenticated, checkRole('admin'), async (req, res) => {

        const students = await getAllStudents(db);
        res.render('adminhome.ejs', { students })
    })

    app.post('/admin/addbal', checkAuthenticated, checkRole('admin'), async (req, res) => {
        console.log(req.body);
        const { studentId, amount } = req.body;

        const time = new Date().toISOString();
        await addMealBalance(db, studentId, parseFloat(amount), time)

        res.redirect('/admin/home')
    })

    //--------------------ADMIN____ROUTES-------------------------------------




    //--------------------LOGIN/REGISTER____ROUTES-------------------------


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

                    //send users to the login page if they are not matched with any of the roles
                    default: return res.redirect('/login')
                }
            })
        })(req, res, next)
    })



    //route for accessing the register page
    app.get('/register', checkNotAuthenticated, (req, res) => {
        res.render('register.ejs')
    })



    //submit the new user account creation
    app.post('/register', checkNotAuthenticated, async (req, res) => {
        try {
            // Check if email is already registered
            const existsAlready = await db.get(
                'SELECT user_id FROM "user" WHERE email = ?',
                [req.body.email]
            )
            if (existsAlready) {
                req.flash('error', 'Email already used for an account')
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

    //--------------------LOGIN/REGISTER____ROUTES---------------------------------------

    //routes users back to login when they are not logged in
    function checkAuthenticated(req, res, next) {
        if (req.isAuthenticated()) return next()
        res.redirect('/login')
    }



    //routes the users away from login and register screen when they are already logged in
    function checkNotAuthenticated(req, res, next) {
        if (req.isAuthenticated()) return res.redirect('/')
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
    app.listen(3000, '0.0.0.0');
}

startServer()