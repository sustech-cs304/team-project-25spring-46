// src/AIsummarizer.ts
import * as fs from 'fs';
import pdf from 'pdf-parse-debugging-disabled';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { Agent as HttpsAgent } from 'https';
import apiKey from './apikey';
import { getFileAbsolutePath } from './courseService';
const ENDPOINT = 'https://sg.uiuiapi.com/v1/chat/completions';

// 1. 创建带超时 & keep-alive 的 HTTP 客户端
const axiosClient: AxiosInstance = axios.create({
  baseURL: ENDPOINT,
  timeout: 120_000,  // 2 分钟超时
  httpsAgent: new HttpsAgent({ keepAlive: true }),
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  },
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
});

async function extractPDFText(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdf(dataBuffer);
  return data.text;
}

/**
 * 向 LLM 发请求并获取结果，失败时针对网络错误做重试
 */
async function queryLLM(prompt: string): Promise<string> {
  const maxRetries = 2;
  let lastErr: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🛰 [LLM] Attempt ${attempt + 1}: sending prompt...`);
      const resp = await axiosClient.post('', {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: '你是一个有帮助的助手。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      });
      const content = resp.data.choices?.[0]?.message?.content?.trim() ?? '';
      console.log('🛰 [LLM] Response received');
      return content;
    } catch (err) {
      lastErr = err;
      const ae = err as AxiosError;
      const code = ae.code;
      const msg  = ae.message;
      console.warn(`⚠️ [LLM] Attempt ${attempt + 1} failed: [${code}] ${msg}`);

      // 只有在网络断开、重置或超时的情况下才重试
      const isRetryable =
        code === 'ECONNRESET' ||
        code === 'ECONNABORTED' ||
        msg.includes('socket hang up') ||
        msg.includes('timeout');

      if (attempt < maxRetries && isRetryable) {
        // 等待一小会儿再重试
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      // 非重试错误，或已到达重试上限
      break;
    }
  }

  // 全部重试都失败，则抛出最后一次错误
  throw lastErr;
}

/**
 * 生成课程总结（Markdown）
 */
export async function generateAISummary(relativePath: string): Promise<string> {
  console.log(`▶️ Generating summary for: ${relativePath}`);
  const absolutePath = await getFileAbsolutePath(relativePath);
  const pdfText = await extractPDFText(absolutePath);
  const prompt =
    '请逐页解析以下课件内容，总结要点为 Markdown 格式的笔记：\n\n' +
    pdfText +
    '\n\n请只返回 Markdown，不要包含多余文字。';
  const result = await queryLLM(prompt);
  return result;
}

/**
 * 生成 Quiz（JSON 数组）
 */
export async function generateAIQuiz(relativePath: string): Promise<string> {
  console.log(`▶️ Generating quiz for: ${relativePath}`);
  const absolutePath = await getFileAbsolutePath(relativePath);
  const pdfText = await extractPDFText(absolutePath);
  const prompt =
    '请根据以下课件内容，出 5 道 quiz（选择题或填空题），用 JSON 数组格式返回，每题包含：题干、选项（如有）、参考答案、解析，例如：\n' +
    '[\n' +
    '  { "question": "...", "options": ["A...", "B...", "C..."], "answer": "B", "explanation": "..." }\n' +
    ']\n\n' +
    pdfText +
    '\n\n请只返回 JSON，不要包含多余文字。';
  const result = await queryLLM(prompt);
  return result;
}
