const userRoutes = require('express').Router();
const db = require("../db");
const { 
    userRegister, 
    userLogin, 
    userAuth, 
    serializeUser, 
    checkRole 
} = require('../utils/Auth');

// Get Routes
userRoutes.get('/memberProfile', userAuth, async (req, res) => {
    try {
        const results = await db.query("SELECT * FROM members WHERE member_id = $1", [serializeUser(req.user.rows[0]).member_id])
        res.status(200).json({
            status: "success",
            results: results.rows.length,
            data: {
                member: results.rows,
            }
        });
    } catch (err) {
        console.log(err)
    }
    /*
    return res.json(serializeUser(req.user.rows[0])); */
});

userRoutes.get('/events', userAuth, checkRole(['superadmin', 'admin', 'user']), async (req, res) => {
    try {
        const results = await db.query("SELECT * FROM events")
        res.status(200).json({
            status: "success",
            results: results.rows.length,
            data: {
                events: results.rows,
            }
        });
    } catch (err) {
        console.log(err)
    }
    // return res.json("Get list of all events");
});

userRoutes.get('/events/:event_id', userAuth, checkRole(['superadmin', 'admin', 'user']), async (req, res) => {
    try {
        const results = await db.query("SELECT * FROM events WHERE event_id = $1", [req.params.event_id])
        res.status(200).json({
            status: "success",
            results: results.rows.length,
            data: {
                event: results.rows,
            }
        });
    } catch (err) {
        console.log(err)
    }
    // return res.json("Get single event details for that event");
});

userRoutes.get('/events/:event_id/transactions', userAuth, checkRole(['superadmin', 'admin', 'user']), async (req, res) => {
    try {
        const results = await db.query("SELECT * FROM transactions WHERE event_id = $1", [req.params.event_id])
        res.status(200).json({
            status: "success",
            results: results.rows.length,
            data: {
                transaction: results.rows,
            }
        });
    } catch (err) {
        console.log(err)
    }
    // return res.json("Get single event transactions for that event");
});

userRoutes.get('/transactionsPerMember', userAuth, checkRole(['superadmin', 'admin', 'user']), async (req, res) => {
    try {
        console.log(serializeUser(req.user.rows[0]).member_id)
        const results = await db.query("SELECT * FROM transactions WHERE member_id = $1", [serializeUser(req.user.rows[0]).member_id])
        res.status(200).json({
            status: "success",
            results: results.rows.length,
            data: {
                transactions: results.rows,
            }
        });
    } catch (err) {
        console.log(err)
    }
    // return res.json("Get all single user transactions");
});

// Post Routes
userRoutes.post('/transactions/new', userAuth, checkRole(['superadmin', 'admin', 'user']), async (req, res) => {
    // Check if active is true on current event
    let active = await verifyActive(req.body.event_name)
    if (!active) {
        return res.status(400).json({
            message: `This event is no longer active.`,
            success: false
        });
    }

    try {
        const results = await db.query("INSERT INTO transactions (transaction_id, event_id, member_id, amount, time_date) VALUES ($1, (SELECT event_id FROM events WHERE event_name=$2), $3, $4, $5) returning *", [req.body.transaction_id, req.body.event_name, serializeUser(req.user.rows[0]).member_id, req.body.amount, req.body.time_date])
        const logging = await db.query("INSERT INTO logs (transaction_id, event_name, username, action) VALUES ($1, $2, (SELECT username FROM members WHERE member_id=$3), $4)", [req.body.transaction_id, req.body.event_name, serializeUser(req.user.rows[0]).member_id, "posted new transaction"])
        res.status(201).json({
            status: "success",
            results: results.rows.length,
            data: {
                new_transaction: results.rows[0]
            }
        })
    } catch (err) {
        console.log(err)
        return res.status(400).json({
            message: `Error recording a new transaction.`,
            success: false
        });
    }
});

// Put Routes
userRoutes.put('/image_url', userAuth, checkRole(['superadmin', 'admin', 'user']), async (req, res) => {
    // console.log(serializeUser(req.user.rows[0]).member_id)
    // console.log(req.body.image_url)
    try {
        const results = await db.query("UPDATE members SET image_url = $1 WHERE member_id = $2 returning *", [req.body.image_url, serializeUser(req.user.rows[0]).member_id])
        res.status(200).json({
            status: "success",
            results: results.rows.length,
            data: {
                image: results.rows,
            }
        });
    } catch (err) {
        console.log(err)
    }
});

userRoutes.put('/transactions/:transaction_id', userAuth, checkRole(['superadmin', 'admin', 'user']), async (req, res) => {
    // Check if active is true on current event
    let active = await verifyActive(req.body.event_name)
    if (!active) {
        return res.status(400).json({
            message: `This event is no longer active.`,
            success: false
        });
    }

    try {
        const results = await db.query("UPDATE transactions SET transaction_id = $1, event_id = (SELECT event_id FROM events WHERE event_name=$2), member_id = $3, amount = $4, time_date = $5 WHERE transaction_id = $6 returning *", [req.body.transaction_id, req.body.event_name, serializeUser(req.user.rows[0]).member_id, req.body.amount, req.body.time_date, req.params.transaction_id])
        const logging = await db.query("INSERT INTO logs (transaction_id, event_name, username, action) VALUES ($1, $2, (SELECT username FROM members WHERE member_id=$3), $4)", [req.body.transaction_id, req.body.event_name, serializeUser(req.user.rows[0]).member_id, "edited this transaction"])
        res.status(200).json({
            status: "success",
            results: results.rows.length,
            data: {
                property: results.rows,
            }
        });
    } catch (err) {
        console.log(err)
    }
    // return res.json("Edit a transaction");
});


const verifyActive = async (event_name) => {
     // Check if event is active in database
     try{
        let result = await db.query("SELECT active FROM events WHERE event_id = (SELECT event_id FROM events WHERE event_name=$1)", [event_name])
        const active = result.rows[0].active;
        return active === true ?  true : false;
    } catch (err) {
        console.log(err);
        // return res.status(400).json({error: err.detail});
    };
};

module.exports = userRoutes;
