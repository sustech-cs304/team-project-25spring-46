import * as crypto from 'crypto';
import * as vscode from 'vscode';
import { pathToFileURL } from 'url';
import axios from 'axios';

export const Server_IP = '10.32.112.180';
export const Port = '3000';
const API_BASE_URL = `http://${Server_IP}:${Port}`;

export interface Comment {
    id: number;
    file_id: string;
    page_number?: number;
    position?: string;
    type: 'text' | 'highlight' | 'underline' | 'image';
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

export interface NewComment {
    filePath: string;
    page_number?: number;
    position?: string;
    type?: 'text' | 'highlight' | 'underline' | 'image';
    content?: string;
    extra?: Record<string, any>;
    author?: string;
  }

function generateFileId(filePath: string): string {
    return pathToFileURL(filePath).href;
}

function hashFilePath(filePath: string): string {
    return crypto.createHash('sha256').update(filePath).digest('hex');
}

export async function addComment(comment: NewComment): Promise<void> {
    const file_id = hashFilePath(comment.filePath);
    const payload = {
        file_id,
        page_number: comment.page_number || null,
        position: comment.position || null,
        type: comment.type || 'text',
        content: comment.content || null,
        extra: comment.extra || null,
        author: comment.author || '匿名'
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
    const file_id = hashFilePath(filePath);
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

export async function getAllComments(filePath: string): Promise<Comment[]> {
    const file_id = hashFilePath(filePath);
    try {
        const response = await axios.get(`${API_BASE_URL}/comments`, {
            params: { file_id }
        });
        return response.data.map((row: any) => ({
            ...row,
            extra: row.extra ? JSON.parse(row.extra) : null
        }));
    } catch (err) {
        console.error('获取评论失败:', err);
        throw new Error(`获取评论失败: ${err}`);
    }
}

export async function getPageComments(filePath: string, page_number:number): Promise<Comment[]> {
    const file_id = hashFilePath(filePath);
    try {
        const response = await axios.get(`${API_BASE_URL}/comments`, {
            params: { file_id, page: page_number }
        });
        return response.data.map((row: any) => ({
            ...row,
            extra: row.extra ? JSON.parse(row.extra) : null
        }));
    } catch (err) {
        console.error('获取评论失败:', err);
        throw new Error(`获取评论失败: ${err}`);
    }
}

