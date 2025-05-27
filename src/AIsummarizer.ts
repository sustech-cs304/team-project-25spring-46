// AIsummarizer.ts
import * as fs from 'fs';
import pdf from 'pdf-parse';
import axios from 'axios';
import pool from './database';
import path from 'path';
import apiKey from './apikey';

const endpoint = 'https://sg.uiuiapi.com/v1/chat/completions';

async function extractPDFText(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);
  return data.text;
}

async function queryLLM(prompt: string): Promise<string> {
  console.log(`Querying LLM with prompt: ${prompt}`);
  const response = await axios.post(endpoint, {
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: '你是一个有帮助的助手。' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
  }, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  console.log(`LLM response: ${response.data.choices[0].message.content.trim()}`);
  return response.data.choices[0].message.content.trim();
}

export async function generateAISummary(relativePath: string): Promise<string> {
  console.log(`Generating summary for: ${relativePath}`);
  const absolutePath = await getAbsolutePath(relativePath);
  const pdfText = await extractPDFText(absolutePath);
  const prompt = `请逐页解析以下课件内容，总结要点为Markdown笔记：${pdfText}。请只返回Markdown格式的内容，不要包含其他文字。`;
  const result = await queryLLM(prompt);
  return result;
}

export async function generateAIQuiz(relativePath: string): Promise<string> {
  const absolutePath = await getAbsolutePath(relativePath);
  const pdfText = await extractPDFText(absolutePath);
  const prompt = `请根据以下课件内容，出 5 道 quiz（可以是选择题或填空题），用 JSON 数组格式返回，每题应包含：题干、选项（如有）、参考答案、解析。例如：
[
  {
    "question": "xxx?",
    "options": ["A.xxx", "B.xxx", "C.xxx"],
    "answer": "B",
    "explanation": "正确答案是 B，因为..."
  }
]
以下是课件内容：${pdfText}。请只返回json数据，不要包含其他文字。`;
  const result = await queryLLM(prompt);
  return result;
}

async function getAbsolutePath(relativePath: string): Promise<string> {
  const [courseName, subfolder, ...filenameParts] = relativePath.split('/');
  const filename = filenameParts.join('/');
  const res = await pool.query("SELECT folder_path FROM courses WHERE name=$1", [courseName]);
  if (!res.rows[0]) {throw new Error('课程未找到');}
  return path.join(res.rows[0].folder_path, subfolder, filename);
}
