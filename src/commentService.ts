// import * as crypto from 'crypto';
// import axios from 'axios';
import { getFileAbsolutePath} from './courseService';
import supabase, { testSupabaseConnection } from './supabaseClient';
import * as fs from 'fs';
import * as util from 'util';
const readFile = util.promisify(fs.readFile);

// export const Server_IP = '10.32.112.180'; //'10.28.60.68';
// export const Port = '3000';
// const API_BASE_URL = `http://${Server_IP}:${Port}`;

export interface Comment {
    id: number;
    file_id: string;
    page_number?: number;
    position?: string;
    type: 'text' | 'highlight' | 'underline';
    content?: string;
    extra?: Record<string, any>; // 比如 { color: '#ff0', rects: [...] }
    author?: string;
    created_at: string;
}
// 建表语句
// CREATE TABLE comments (
//     id SERIAL PRIMARY KEY,
//     file_id TEXT NOT NULL,
//     page_number INTEGER,
//     position TEXT,
//     type TEXT DEFAULT 'text',     -- 评论类型（text/highlight/underline/image）
//     content TEXT,                 -- 可为空，如图片评论时不需要纯文本内容
//     extra JSONB,                  -- 额外信息，如图片地址、颜色、选区坐标等
//     author TEXT,
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// );

export interface RawCommentInput {
    filePath: string;
    page?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
    height?: number;
    width?: number;
    type?: 'text' | 'highlight' | 'underline';
    content?: string;
    extra?: Record<string, any>;
    author?: string;
}

export type CommentData =
  |{
    id: string;
    page: number;
    type: "text";
    content: string;
    position: {
      x: number;
      y: number;
      width?: number;
      height?: number;
    };
    author: string;
    time: string;
  }
  |{
    id: string;
    page: number;
    type: "highlight";
    content: string;
    position: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    author: string;
    time: string;
  }
  |{
    id: string;
    page: number;
    type: "underline";
    content: string;
    position: {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    };
    author: string;
    time: string;
  };

export function parsePosition(posStr: string | null | undefined): { x: number, y: number, width?: number, height?: number } {
    try {
      return posStr ? JSON.parse(posStr) : { x: 0, y: 0 };
    } catch {
      console.warn(`无法解析 position: ${posStr}`);
      return { x: 0, y: 0 };
    }
  }

// function hashFilePath(filePath: string): string {
//     return crypto.createHash('sha256').update(filePath).digest('hex');
// }

export async function hashFileByContent(filePath: string): Promise<string> {
    try {
        const absolutePath = await getFileAbsolutePath(filePath);
		console.log("File's Absolute Path is: "+absolutePath);

        const fileBuffer = await readFile(absolutePath);

        // 计算SHA-256 hash
        // const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        console.log('file content hash, path:', filePath, 'hash:', hashHex);
        return hashHex;
    } catch (err) {
        console.log('hashFileByContent失败:', err)
        console.error('hashFileByContent失败:', err);
        throw err;
    }
}

export async function hashFilePath(path: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(path);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    console.log('file path: '+path+' --> file id: '+hashHex);
    return hashHex;
  }

export async function addComment(data: RawCommentInput): Promise<void> {
    testSupabaseConnection();
    
    console.log("commentService - addComment data:", data); // 添加日志

    const file_id = await hashFileByContent(data.filePath);

    // 构建 position
    let positionObj: any = {};
    const type = data.type || 'text';

    if (type === 'text') {
        if (data.x1 !== undefined && data.y1 !== undefined) {
            positionObj = { x: data.x1, y: data.y1 };
        }
    } else if (type === 'highlight') {
        if (data.x1 !== undefined && data.y1 !== undefined) {
            positionObj = {
                x: data.x1,
                y: data.y1,
                height: data.height ?? 0,
                width: data.width ?? 0
            };
        }
    } else if (type === 'underline') {
        if (
            data.x1 !== undefined && data.y1 !== undefined &&
            data.x2 !== undefined && data.y2 !== undefined
        ) {
            positionObj = {
                x1: data.x1,
                y1: data.y1,
                x2: data.x2,
                y2: data.y2
            };
        }
    }

    // const payload = {
    //     file_id,
    //     page_number: data.page || null,
    //     position: Object.keys(positionObj).length > 0 ? JSON.stringify(positionObj) : null,
    //     type,
    //     content: data.content || null,
    //     extra: data.extra || null,
    //     author: data.author || '匿名'
    // };

    // console.log("commentService - addComment payload:", payload); // 添加日志

    // try {
    //     const response = await axios.post(`${API_BASE_URL}/comments`, payload);
    //     if (response.status !== 200) {
    //         throw new Error(`添加评论失败: ${response.statusText}`);
    //     }
    //     console.log("commentService - addComment response:", response.data); // 添加日志
    // } catch (err) {
    //     console.error('添加评论失败:', err);
    //     throw new Error(`添加评论失败: ${err}`);
    // }

    // 改为 supabase 数据库
    const { error } = await supabase.from('comments').insert({
        file_id,
        page_number: data.page || null,
        position: Object.keys(positionObj).length ? JSON.stringify(positionObj) : null,
        type,
        content: data.content || null,
        extra: data.extra || null,
        author: data.author || '匿名'
    });
    
    if (error) {
        console.error('添加评论失败:', error.message);
        throw new Error(`添加评论失败: ${error.message}`);
    }
    console.log("添加评论成功");
}

export async function deleteCommentById(commentId: number): Promise<void> {
    testSupabaseConnection();
    
    // try {
    //     const response = await axios.delete(`${API_BASE_URL}/comments/${commentId}`);
    //     if (response.status !== 200) {
    //         throw new Error(`删除评论失败: ${response.statusText}`);
    //     }
    // } catch (err) {
    //     console.error('删除评论失败:', err);
    //     throw new Error(`删除评论失败: ${err}`);
    // }

    // 改为 supabase 数据库
    const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

    if (error) {
        console.error('删除评论失败:', error.message);
        throw new Error(`删除评论失败: ${error.message}`);
    }
    console.log("添加评论成功");
}

export async function deleteCommentByFile(filePath: string): Promise<void> {
    testSupabaseConnection();
    
    const file_id = await hashFileByContent(filePath);
    // try {
    //     const response = await axios.delete(`${API_BASE_URL}/comments/by-file/${file_id}`);
    //     if (response.status !== 200) {
    //         throw new Error(`删除评论失败: ${response.statusText}`);
    //     }
    // } catch (err) {
    //     console.error('删除评论失败:', err);
    //     throw new Error(`删除评论失败: ${err}`);
    // }

    // 改为 supabase 数据库
    const { error } = await supabase
        .from('comments')
        .delete()
        .eq('file_id', file_id);

    if (error) {
        console.error('删除评论失败:', error.message);
        throw new Error(`删除评论失败: ${error.message}`);
    }
    console.log("删除评论成功");
}

export async function getAllComments(filePath: string): Promise<CommentData[]> {
    testSupabaseConnection();
    
    console.log('getAllComments: 开始获取评论, filePath =', filePath);
    const file_id = await hashFileByContent(filePath);
    // try {
    //     const response = await axios.get(`${API_BASE_URL}/comments`, {
    //         params: { file_id }
    //     });
    //     console.log('getAllComments: 获取了 ', response.data.length ,' 条评论');
    //     return response.data.map((row: any): CommentData => ({
    //         id: row.id.toString(),
    //         page: row.page_number || 1,
    //         type: row.type,
    //         content: row.content || '',
    //         author: row.author || '匿名',
    //         time: row.created_at,
    //         position: parsePosition(row.position)
    //     }));
    // } catch (err) {
    //     console.error('获取评论失败:', err);
    //     throw new Error(`获取评论失败: ${err}`);
    // }

    // 改为 supabase 数据库
    const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('file_id', file_id);

    if (error) {
        console.error('获取评论失败:', error.message);
        throw new Error(`获取评论失败: ${error.message}`);
    }
    console.log("获取评论成功");

    return (data || []).map((row: any): CommentData => ({
        id: row.id.toString(),
        page: row.page_number || 1,
        type: row.type,
        content: row.content || '',
        author: row.author || '匿名',
        time: row.created_at,
        position: parsePosition(row.position)
    }));
}

export async function getPageComments(filePath: string, page_number:number): Promise<CommentData[]> {
    testSupabaseConnection();
    
    const file_id = await hashFileByContent(filePath);
    // try {
    //     const response = await axios.get(`${API_BASE_URL}/comments`, {
    //         params: { file_id, page: page_number }
    //     });
    //     return response.data.map((row: any): CommentData => ({
    //         id: row.id.toString(),
    //         page: row.page_number || 1,
    //         type: row.type,
    //         content: row.content || '',
    //         author: row.author || '匿名',
    //         time: row.created_at,
    //         position: parsePosition(row.position)
    //     }));
    // } catch (err) {
    //     console.error('获取评论失败:', err);
    //     throw new Error(`获取评论失败: ${err}`);
    // }

    // 改为 supabase 数据库
    const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('file_id', file_id)
        .eq('page_number', page_number);

    if (error) {
        console.error('获取页面评论失败:', error.message);
        throw new Error(`获取页面评论失败: ${error.message}`);
    }
    console.log("获取页面评论成功");

    return (data || []).map((row: any): CommentData => ({
        id: row.id.toString(),
        page: row.page_number || 1,
        type: row.type,
        content: row.content || '',
        author: row.author || '匿名',
        time: row.created_at,
        position: parsePosition(row.position)
    }));
}

