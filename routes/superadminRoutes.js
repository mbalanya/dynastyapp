const superadminRoutes = require('express').Router();
const db = require("../db");
const { 
    userRegister, 
    userLogin, 
    userAuth, 
    serializeUser, 
    checkRole 
} = require('../utils/Auth');

// Get Routes
superadminRoutes.get('/logs', userAuth, checkRole(['superadmin']), async (req, res) => {
    try {
        const results = await db.query("SELECT * FROM logs")
        res.status(200).json({
            status: "success",
            results: results.rows.length,
            data: {
                logs: results.rows,
            }
        });
    } catch (err) {
        console.log(err)
    }
    // return res.json("Get list of all logs");
});

// Put Routes
superadminRoutes.put('/members/:member_id/role', userAuth, checkRole(['superadmin']), async (req, res) => {
    try {
        const results = await db.query("UPDATE members SET role = $1 WHERE member_id = $2 returning *", [req.body.role, req.params.member_id])
        const logging = await db.query("INSERT INTO logs (username, action) VALUES ((SELECT username FROM members WHERE member_id=$1), $2)", [serializeUser(req.user.rows[0]).member_id, `changed member_id ${req.params.member_id}'s role to ${req.body.role}`])

        res.status(200).json({
            status: "success",
            results: results.rows.length,
            data: {
                role: results.rows,
            }
        });
    } catch (err) {
        console.log(err)
    }
    // return res.json("Edit role of a single member");
});

// Delete Routes
superadminRoutes.delete('/transactions/:transaction_id', userAuth, checkRole(['superadmin']), async (req, res) => {
    try {
        const results = await db.query("DELETE FROM transactions WHERE transaction_id = $1 returning *", [req.params.transaction_id])
        const logging = await db.query("INSERT INTO logs (username, transaction_id, action) VALUES ((SELECT username FROM members WHERE member_id=$1), $2, $3)", [serializeUser(req.user.rows[0]).member_id, req.params.transaction_id, `deleted this transaction`])
        
        res.status(200).json({
            status: "success",
            results: results.rows.length,
            data: {
                deleted_transaction: results.rows,
            }
        });
    } catch (err) {
        console.log(err)
    }
    // return res.json("Delete a single transaction");
});

superadminRoutes.delete('/members/:member_id', userAuth, checkRole(['superadmin']), async (req, res) => {
    return res.json("Delete a single member");
});

superadminRoutes.delete('/events/:event_id', userAuth, checkRole(['superadmin']), async (req, res) => {
    // Check if active is true on current event
    /* const event_name = await db.query("SELECT event_name FROM events WHERE event_id=$1", [req.params.event_id])
    let active = await verifyActive(event_name.rows[0].event_name)
    if (active) {
        return res.status(400).json({
            message: `You cannot delete an active event.`,
            success: false
        });
    } else {
        try {
            const results = await db.query("DELETE FROM events WHERE event_id = $1 returning *", [req.params.event_id])
            res.status(200).json({
                status: "success",
                results: results.rows.length,
                data: {
                    deleted_transaction: results.rows,
                }
            });
        } catch (err) {
            console.log(err)
        }
    } */
    // return res.json("Delete a single event");
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


module.exports = superadminRoutes;

