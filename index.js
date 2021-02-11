require("dotenv").config();
const cors = require("cors");
const express = require('express');
const bp = require("body-parser");
const { success, error } = require('consola');
const morgan = require('morgan'); //npm install morgan
const db = require("./db");
const passport = require('passport');

// Initialize the application
const app = express();

// Connection to DB

// Middleware
app.use(cors());
app.use(bp.json());
app.use(passport.initialize());

require('./middleware/passport')(passport);

// User router middleware
app.use('/api/v1/users', require('./routes/users'));
app.use('/api/v1/', require('./routes/userRoutes'));
app.use('/api/v1/', require('./routes/adminRoutes'));
app.use('/api/v1/', require('./routes/superadminRoutes'));


const port = process.env.PORT || 3001;
app.listen(port, () => success({
    message: `Server Up and listening on port ${port}!`,
    badge: true
}));