// database.ts
import { Pool } from 'pg';

const pool = new Pool({
  user: 'postgres',
  // host: 'jdbc:postgresql://localhost:5432/postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'pc332940',
  port: 5432,
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