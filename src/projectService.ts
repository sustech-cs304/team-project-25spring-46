import pool from './database';

/**
 * 获取所有项目列表
 * - 查询数据库中的 projects 表，返回项目的 id 和 name
 */
export async function getProjects(): Promise<{ id: number; name: string }[]> {
  try {
    const queryText = 'SELECT * FROM projects';
    const result = await pool.query(queryText);
    return result.rows;
  } catch (error) {
    throw new Error(`获取项目列表失败：${error}`);
  }
}