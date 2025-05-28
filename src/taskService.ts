// taskService.ts
import * as fs from 'fs';
import * as path from 'path';
import pool from './database';
import * as vscode from 'vscode';
import supabase from './supabaseClient';
// import { getCurrentUserId } from './authService'; // 你需要根据实际项目替换路径
import { pathToFileURL } from 'url';
/**
 * 创建新任务：
 * - 从数据库中加载课程列表，供用户选择所属课程
 * - 根据所选课程加载对应的项目列表（可为空）
 * - 通过用户输入/选择获取任务的标题、详情、截止时间和优先级
 * - 默认将任务负责人设为当前用户（通过 getCurrentUserId 获取）
 * - 将任务信息插入 tasks 表，并返回生成记录的 id
 * - 若选择了项目，则将 task_id 和 proj_id 插入 project_task 表建立关联
*/
export async function createNewTask(data: {
  title: string;
  details?: string;
  due_date: string;
  priority: string;
  status: string; // 新增状态字段
  course_id: number;
  project_id?: number | null; // 可选
  assignee_id?: number; // 可选，默认为 1
}): Promise<{ id: number }> {
  try {
    console.log("TaskService - createNewTask data:", data); // 添加日志
    const { title, details, due_date, priority,status, course_id, project_id = null, assignee_id = 1 } = data;

    // 查询当前 tasks 表的行数
    const countResult = await pool.query('SELECT COUNT(*) AS count FROM tasks');
    const newTaskId = parseInt(countResult.rows[0].count, 10)+1; // 新的 task_id 为行数加 1

    // 插入任务
    const insertTaskSQL = `
      INSERT INTO tasks (id, title, details, course_id, due_date, priority, status, assignee_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
    const taskResult = await pool.query(insertTaskSQL, [
      newTaskId,
      title,
      details,
      course_id,
      new Date(due_date),
      priority,
      status,
      assignee_id,
    ]);
    const taskId = taskResult.rows[0].id;

    // 插入到 project_task 表（若有项目）
    if (project_id !== null) {
      const insertLink = 'INSERT INTO project_task (proj_id, task_id) VALUES ($1, $2)';
      await pool.query(insertLink, [project_id, taskId]);
    }

    vscode.window.showInformationMessage(`成功创建任务 ID: ${taskId}`);
    return { id: taskId };
  } catch (error) {
    vscode.window.showErrorMessage(`创建任务失败：${error}`);
    throw error;
  }
}


/**
 * 查询当前用户的所有任务：
 * - 根据用户 ID 查询其 assignee 的所有任务
 * - 联合查询 courses 表获取课程名称
 * - 联合查询 project_task + projects 表获取项目名称（可为空）
 * - 返回任务基本信息及关联的课程/项目名称
 */
export async function getMyTasks(userId: number): Promise<{ 
  id: number;
  title: string;
  status: string;
  due_date: string;
  priority: string;
  course_id: number;
  course_name: string;
  project_id: number | null; 
  project_name: string | null; 
  details: string;
  feedback: string | null; // 添加 feedback 字段
  }[]> {
  try {
    const queryText = `
      SELECT t.id, t.title, t.status, t.due_date, t.priority, t.details, t.feedback, -- 添加 feedback
             c.id AS course_id, c.name AS course_name, 
             p.id AS project_id, p.name AS project_name
      FROM tasks t
      INNER JOIN courses c ON t.course_id = c.id
      LEFT JOIN project_task pt ON t.id = pt.task_id
      LEFT JOIN projects p ON pt.proj_id = p.id
      WHERE t.assignee_id = $1
    `;
    const result = await pool.query(queryText, [userId]);
    console.log("TaskService - getMyTasks Result:", result.rows); // 添加日志，检查任务数据
    return result.rows;
  } catch (error) {
    throw new Error(`获取用户任务失败：${error}`);
  }
}

/**
 * 查询某个项目下的所有任务：
 * - 根据项目 ID 查询 project_task 表
 * - 联合查询 tasks 表获取任务信息
 * - 联合查询 courses 表获取课程名称
 * - 返回任务基本信息及关联的课程/项目名称
 */
// 查询某个项目下的所有任务：根据项目 ID 查询 project_task 表，联表获取任务、课程和项目名称，返回完整任务信息
export async function getProjectTasks(projectId: number): Promise<{ id: number; title: string; status: string; due_date: string; priority: string; course_id: number; course_name: string; project_id: number; project_name: string; }[]> {
  try {
    const queryText = `SELECT t.id, t.title, t.status, t.due_date, t.priority, c.id AS course_id, c.name AS course_name, p.id AS project_id, p.name AS project_name 
        FROM project_task pt 
        INNER JOIN tasks t ON pt.task_id = t.id 
        INNER JOIN projects p ON pt.proj_id = p.id 
        INNER JOIN courses c ON t.course_id = c.id 
            WHERE pt.proj_id = $1`;
    const result = await pool.query(queryText, [projectId]);
    return result.rows;
  } catch (error) {
    throw new Error(`获取项目任务失败：${error}`);
  }
}

export interface TaskFormData {
  title: string;
  details?: string;
  due_date: string;
  priority: string;
  status: string;
  group_id?: number;
  assignee_id?: number;
}

export async function getGroupTasks(groupId: number): Promise<{
  id: number;
  title: string;
  details: string | null;
  due_date: string;
  status: string;
  priority: string;
  assignee_id: number | null;
  assignee_name: string | null;
}[]> {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        details,
        due_date,
        status,
        priority,
        assignee_id,
        users:assignee_id(name)
      `)
      .eq('group_id', groupId);

    if (error) {
      throw error;
    }

    // Transform the data to include assignee_name
    return data.map(task => ({
      ...task,
      assignee_name: task.users?.[0]?.name || null
    }));
  } catch (error) {
    console.error('Error fetching group tasks:', error);
    throw error;
  }
}

/**
 * - 根据传入的 taskId 更新任务信息：
 * - 用户选择要更新的任务（输入 taskId）
 * - 通过输入框/选择框修改任务的标题、详情、课程、项目、截止时间、状态、优先级、负责人等
 * - create_at 保持不变，自动更新 updated_at 为当前时间
*/
export async function updateTask(data: {
  id: number; // task_id，不可修改
  title?: string;
  details?: string;
  due_date?: string;
  status?: string;
  priority?: string;
  course_id?: number;
  project_id?: number | null;
  feedback?: string;
}): Promise<void> {
  try {
    console.log("TaskService - updateTask data:", data); // 添加日志

    const { id, title, details, due_date, status, priority, course_id, project_id,feedback } = data;

    // 构建动态更新字段
    const updates = [];
    const values: any[] = [];
    let idx = 1;

    if (title !== undefined) { updates.push(`title = $${idx++}`); values.push(title); }
    if (details !== undefined) { updates.push(`details = $${idx++}`); values.push(details); }
    if (due_date !== undefined) { updates.push(`due_date = $${idx++}`); values.push(new Date(due_date)); }
    if (status !== undefined) { updates.push(`status = $${idx++}`); values.push(status); }
    if (priority !== undefined) { updates.push(`priority = $${idx++}`); values.push(priority); }
    if (course_id !== undefined) { updates.push(`course_id = $${idx++}`); values.push(course_id); }
    if (feedback !== undefined) { updates.push(`feedback = $${idx++}`); values.push(feedback); } // 添加 feedback
    // 更新 updated_at 字段
    updates.push(`updated_at = $${idx++}`);
    values.push(new Date());

    // 添加 WHERE 条件
    values.push(id);

    // 如果没有任何字段需要更新，直接返回
    if (updates.length === 1) { // 只有 `updated_at` 被添加
      vscode.window.showWarningMessage("没有提供任何需要更新的字段！");
      return;
    }

    // 构建 SQL 语句
    const updateSQL = `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${idx}`;
    console.log("TaskService - updateTask SQL:", updateSQL); // 添加日志
    console.log("TaskService - updateTask values:", values); // 添加日志

    // 执行更新任务的 SQL
    const result = await pool.query(updateSQL, values);
    if (result.rowCount === 0) {
      vscode.window.showWarningMessage(`未找到任务 ID: ${id}，更新失败`);
      return;
    }

    // 更新 project_task 表（如果 project_id 被提供）
    if (project_id !== undefined) {
      // 删除旧的 project_task 映射
      await pool.query('DELETE FROM project_task WHERE task_id = $1', [id]);

      // 如果 project_id 不为 null，则插入新的映射
      if (project_id !== null) {
        await pool.query('INSERT INTO project_task (proj_id, task_id) VALUES ($1, $2)', [project_id, id]);
      }
    }

    vscode.window.showInformationMessage(`成功更新任务 ID: ${id}`);
  } catch (error) {
    console.error("TaskService - updateTask error:", error); // 添加日志
    vscode.window.showErrorMessage(`更新任务失败：${error}`);
    throw error;
  }
}

/** 
 * 删除指定任务：
 * - 根据传入的 taskId，先删除 project_task 中的映射记录（如果存在）
 * - 然后删除 tasks 表中的该任务记录
 * - 删除操作为彻底删除（不可恢复）
 */
export async function deleteTask(taskId: number): Promise<void> {
  try {
    // 删除 project_task 中的映射记录
    await pool.query('DELETE FROM project_task WHERE task_id = $1', [taskId]);

    // 删除 tasks 表中的任务记录
    const result = await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
    if (result.rowCount === 0) {
      vscode.window.showWarningMessage(`没有找到任务 ID: ${taskId}，删除失败`);
    } else {
      vscode.window.showInformationMessage(`已成功删除任务 ID: ${taskId}`);
    }
  } catch (error) {
    vscode.window.showErrorMessage(`删除任务失败：${error}`);
    throw error;
  }
}
