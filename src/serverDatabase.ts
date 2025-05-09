// database.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgres://postgres:Cookiegu12210255@localhost:5432/liveshare_data'
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