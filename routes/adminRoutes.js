const adminRoutes = require('express').Router();
const db = require("../db");
const { 
    userRegister, 
    userLogin, 
    userAuth, 
    serializeUser, 
    checkRole 
} = require('../utils/Auth');

// Get Routes
adminRoutes.get('/members', userAuth, checkRole(['superadmin', 'admin']), async (req, res) => {
    try {
        const results = await db.query("SELECT * FROM members")
        res.status(200).json({
            status: "success",
            results: results.rows.length,
            data: {
                members: results.rows,
            }
        });
    } catch (err) {
        console.log(err)
    }
    // return res.json("Get list of all members");
});

adminRoutes.get('/transactions', userAuth, checkRole(['superadmin', 'admin']), async (req, res) => {
    try {
        const results = await db.query("SELECT * FROM transactions")
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
    // return res.json("Get list of all transactions");
});

// Post Routes
adminRoutes.post('/events/new', userAuth, checkRole(['superadmin', 'admin']), async (req, res) => {
    try {
        const results = await db.query("INSERT INTO events (event_name, contribution_reason, member_id, active) VALUES ($1, $2, $3, $4) returning *", [req.body.event_name, req.body.contribution_reason, serializeUser(req.user.rows[0]).member_id, req.body.active])
        const logging = await db.query("INSERT INTO logs (event_name, contribution_reason, username, action) VALUES ($1, $2, (SELECT username FROM members WHERE member_id=$3), $4)", [req.body.event_name, req.body.contribution_reason, serializeUser(req.user.rows[0]).member_id, "posted new event"])
        res.status(201).json({
            status: "success",
            results: results.rows.length,
            data: {
                new_event: results.rows[0]
            }
        })
    } catch (err) {
        console.log(err)
    }
    // return res.json("Create a new event");
});

// Put Routes
adminRoutes.put('/members/:member_id', userAuth, checkRole(['superadmin', 'admin']), async (req, res) => {
    try {
        const results = await db.query("UPDATE members SET username = $1, phone_number = $2, image_url = $3 WHERE member_id = $4 returning *", [req.body.username, req.body.phone_number, req.body.image_url, req.params.member_id])
        const logging = await db.query("INSERT INTO logs (phone_number, username, action) VALUES ($1, (SELECT username FROM members WHERE member_id=$2), $3)", [req.body.phone_number, serializeUser(req.user.rows[0]).member_id, `edited ${req.body.username}'s profile`])

        res.status(200).json({
            status: "success",
            results: results.rows.length,
            data: {
                member_update: results.rows,
            }
        });
    } catch (err) {
        console.log(err)
    }
    // return res.json("Edit a single member");
});

adminRoutes.put('/events/:event_id', userAuth, checkRole(['superadmin', 'admin']), async (req, res) => {
    // Check if active is true on current event
    const event_name = await db.query("SELECT event_name FROM events WHERE event_id=$1", [req.params.event_id])
    let active = await verifyActive(event_name.rows[0].event_name)
    if (!active) {
        return res.status(400).json({
            message: `This event is no longer active.`,
            success: false
        });
    }

    try {
        const results = await db.query("UPDATE events SET event_name = $1, contribution_reason = $2, member_id = $3 WHERE event_id = $4 returning *", [req.body.event_name, req.body.contribution_reason, serializeUser(req.user.rows[0]).member_id, req.params.event_id])
        const logging = await db.query("INSERT INTO logs (event_name, contribution_reason, username, action) VALUES ($1, $2, (SELECT username FROM members WHERE member_id=$3), $4)", [req.body.event_name, req.body.contribution_reason, serializeUser(req.user.rows[0]).member_id, "edited this event"])
        res.status(200).json({
            status: "success",
            results: results.rows.length,
            data: {
                member_update: results.rows,
            }
        });
    } catch (err) {
        console.log(err)
    }
    // return res.json("Edit a single event");
});

adminRoutes.put('/active/:event_id', userAuth, checkRole(['superadmin', 'admin']), async (req, res) => {
    // Check if active is true on current event
    const event_name = await db.query("SELECT event_name FROM events WHERE event_id=$1", [req.params.event_id])
    let active = await verifyActive(event_name.rows[0].event_name)
    if (!active) {
        try {
            const results = await db.query("UPDATE events SET active = true WHERE event_id = $1 returning active", [req.params.event_id])
            res.status(200).json({
                status: "success",
                results: results.rows.length,
                data: {
                    active: results.rows,
                }
            });
        } catch (err) {
            console.log(err)
        }
    } else {
        try {
            const results = await db.query("UPDATE events SET active = false WHERE event_id = $1 returning active", [req.params.event_id])
            res.status(200).json({
                status: "success",
                results: results.rows.length,
                data: {
                    active: results.rows,
                }
            });
        } catch (err) {
            console.log(err)
        }
    }
    // return res.json("Activate/Deactivate an event");
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

module.exports = adminRoutes;

