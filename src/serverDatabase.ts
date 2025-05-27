// database.ts
import { Pool } from 'pg';

const pool = new Pool({
  user: 'postgres',
  password: '000000',
  host: 'localhost',
  port: 5432,
  database: 'software_engineering'
});

pool
  .query('SELECT NOW()')
  .then(result => {
    console.log('数据库连接成功，当前时间为：', result.rows[0]);
  })
  .catch(err => {
    console.error('数据库连接失败：', err);
  });

export default pool;