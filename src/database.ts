/*
 * @Author: hatfail 1833943280@qq.com
 * @Date: 2025-05-29 00:37:27
 * @LastEditors: hatfail 1833943280@qq.com
 * @LastEditTime: 2025-05-29 01:44:33
 * @FilePath: \team-project-25spring-46\src\database.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// database.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgres://test:zhujianuo@localhost:5432/postgres'
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