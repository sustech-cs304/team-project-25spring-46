// import * as crypto from 'crypto';
import * as vscode from 'vscode';
import axios from 'axios';
// import { CommentData } from '../vite_test/src/types/annotations';

export const Server_IP = '10.32.112.180';
export const Port = '3000';
const API_BASE_URL = `http://${Server_IP}:${Port}`;

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

export interface CommentData {
    id: string;
    page: number;
    type: "text" | "highlight" | "underline";
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
    const file_id = await hashFilePath(data.filePath);

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

    const payload = {
        file_id,
        page_number: data.page || null,
        position: Object.keys(positionObj).length > 0 ? JSON.stringify(positionObj) : null,
        type,
        content: data.content || null,
        extra: data.extra || null,
        author: data.author || '匿名'
    };

    try {
        const response = await axios.post(`${API_BASE_URL}/comments`, payload);
        if (response.status !== 200) {
            throw new Error(`添加评论失败: ${response.statusText}`);
        }
    } catch (err) {
        console.error('添加评论失败:', err);
        throw new Error(`添加评论失败: ${err}`);
    }
}

export async function deleteCommentById(commentId: number): Promise<void> {
    try {
        const response = await axios.delete(`${API_BASE_URL}/comments/${commentId}`);
        if (response.status !== 200) {
            throw new Error(`删除评论失败: ${response.statusText}`);
        }
    } catch (err) {
        console.error('删除评论失败:', err);
        throw new Error(`删除评论失败: ${err}`);
    }
}

export async function deleteCommentByFile(filePath: string): Promise<void> {
    const file_id = await hashFilePath(filePath);
    try {
        const response = await axios.delete(`${API_BASE_URL}/comments/by-file/${file_id}`);
        if (response.status !== 200) {
            throw new Error(`删除评论失败: ${response.statusText}`);
        }
    } catch (err) {
        console.error('删除评论失败:', err);
        throw new Error(`删除评论失败: ${err}`);
    }
}

export async function getAllComments(filePath: string): Promise<CommentData[]> {
    const file_id = await hashFilePath(filePath);
    try {
        const response = await axios.get(`${API_BASE_URL}/comments`, {
            params: { file_id }
        });
        console.log('getAllComments: 获取了 ', response.data.length ,' 条评论');
        return response.data.map((row: any): CommentData => ({
            id: row.id.toString(),
            page: row.page_number || 1,
            type: row.type,
            content: row.content || '',
            author: row.author || '匿名',
            time: row.created_at,
            position: parsePosition(row.position)
        }));
    } catch (err) {
        console.error('获取评论失败:', err);
        throw new Error(`获取评论失败: ${err}`);
    }
}

export async function getPageComments(filePath: string, page_number:number): Promise<CommentData[]> {
    const file_id = await hashFilePath(filePath);
    try {
        const response = await axios.get(`${API_BASE_URL}/comments`, {
            params: { file_id, page: page_number }
        });
        return response.data.map((row: any): CommentData => ({
            id: row.id.toString(),
            page: row.page_number || 1,
            type: row.type,
            content: row.content || '',
            author: row.author || '匿名',
            time: row.created_at,
            position: parsePosition(row.position)
        }));
    } catch (err) {
        console.error('获取评论失败:', err);
        throw new Error(`获取评论失败: ${err}`);
    }
}

