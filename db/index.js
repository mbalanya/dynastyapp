const { Pool } = require('pg'); //npm install pg

const pool = new Pool();

module.exports = {
    query: (text, params) => pool.query(text, params),
};