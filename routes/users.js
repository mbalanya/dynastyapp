const router = require('express').Router();
const { 
    userRegister, 
    userLogin, 
    userAuth, 
    serializeUser, 
    checkRole
} = require('../utils/Auth');

// Users Registration Route
router.post('/register-user',userAuth, checkRole(['superadmin', 'admin']), async (req, res) => {
    try {
        await userRegister(req.user, req.body, 'user', res);
    } catch (err) {
        return res.status(400).json({
            message: `Unauthorized access.`,
            success: false
        });
    }
});

// Admin Registration Route
router.post('/register-admin',userAuth, checkRole(['superadmin']), async (req, res) => {
    try{
        await userRegister(req.user, req.body, 'admin', res);
    } catch (err) {
        return res.status(400).json({
            message: `Unauthorized access.`,
            success: false
        });
    }
});

// Super Admin Registration Route
router.post('/register-super-admin',userAuth, checkRole(['superadmin']), async (req, res) => {
    try { 
        await userRegister(req.user, req.body, 'superadmin', res);
    } catch (err) {
        return res.status(400).json({
            message: `Unauthorized access.`,
            success: false
        });
    }
});


// User Login Route
router.post('/login-user', async (req, res) => {
    await userLogin(req.body, 'user', res);
});

// Admin Login Route
router.post('/login-admin', async (req, res) => {
    await userLogin(req.body, 'admin', res);
});

// Super Admin Login Route
router.post('/login-super-admin', async (req, res) => {
    await userLogin(req.body, 'superadmin', res);
});



module.exports = router;