// import { Pool } from 'pg';
// // commond line run: npm install --save-dev @types/pg

// export const db = new Pool({
//   user: 'postgres',
//   host: 'localhost',
//   database: 'liveshare_data',
//   password: 'Cookiegu12210255',
//   port: 5432,
// });

const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'liveshare_data',
  password: 'Cookiegu12210255',
  port: 5432,
});
module.exports = pool;