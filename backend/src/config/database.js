const mysql = require('mysql2/promise');
module.exports = mysql.createPool({
  host: process.env.MYSQL_HOST || process.env.DB_HOST,
  port: Number(process.env.MYSQL_PORT || process.env.DB_PORT || 3306),
  user: process.env.MYSQL_USER || process.env.DB_USER,
  password: process.env.MYSQL_PASS ?? process.env.DB_PASSWORD ?? '',
  database: process.env.MYSQL_DATABASE || process.env.DB_NAME,
  waitForConnections: true, connectionLimit: 10, queueLimit: 0,
});
