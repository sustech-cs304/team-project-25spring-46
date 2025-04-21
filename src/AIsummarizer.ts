// AIsummarizer.ts
import * as fs from 'fs';
import pdf from 'pdf-parse';
import axios from 'axios';
import pool from './database';
import path from 'path';

const apiKey = '';
const endpoint = 'https://api5.xhub.chat/v1/chat/completions';

async function extractPDFText(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);
  return data.text;
}

async function queryLLM(prompt: string): Promise<string> {
  const response = await axios.post(endpoint, {
    model: 'gpt-3.5-turbo-0125',
    messages: [
      { role: 'system', content: '你是一个有帮助的助手。' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
  }, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  return response.data.choices[0].message.content.trim();
}

export async function generateAISummary(relativePath: string): Promise<string> {
  const absolutePath = await getAbsolutePath(relativePath);
  const pdfText = await extractPDFText(absolutePath);
  const prompt = `请逐页解析以下课件内容，总结要点为Markdown笔记：${pdfText}`;
  return queryLLM(prompt);
}

export async function generateAIQuiz(relativePath: string): Promise<any[]> {
  const absolutePath = await getAbsolutePath(relativePath);
  const pdfText = await extractPDFText(absolutePath);
  const prompt = `根据课件内容生成5道测试题JSON格式：${pdfText}`;
  const result = await queryLLM(prompt);
  return JSON.parse(result.match(/\[.*\]/s)?.[0] || '[]');
}

async function getAbsolutePath(relativePath: string): Promise<string> {
  const [courseName, subfolder, ...filenameParts] = relativePath.split('/');
  const filename = filenameParts.join('/');
  const res = await pool.query("SELECT folder_path FROM courses WHERE name=$1", [courseName]);
  if (!res.rows[0]) throw new Error('课程未找到');
  return path.join(res.rows[0].folder_path, subfolder, filename);
}
