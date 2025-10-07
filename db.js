// db.js
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', // change if your MySQL user is different
  password: 'Kritz@2204', // put your password if needed
  database: 'roi_simulator'
});

db.connect(err => {
  if (err) {
    console.error('❌ MySQL connection failed:', err);
  } else {
    console.log('✅ Connected to MySQL database');
  }
});

module.exports = db;
