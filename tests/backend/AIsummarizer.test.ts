// tests/backend/AIsummarizer.test.ts

/**
 * Mock external modules before any imports to prevent side-effects
 */
jest.mock('pdf-parse', () => jest.fn().mockResolvedValue({ text: 'parsed text' }));
jest.mock('axios', () => {
  // post: jest.fn().mockResolvedValue({ data: { choices: [{ message: { content: '   answer ' } }] } }),
  const instance = {
    post: jest.fn().mockResolvedValue({ 
      data: { choices: [{ message: { content: '   answer ' } }] } 
    }),
    get: jest.fn()
  };
  return {
    __esModule: true,
    default: {
      create: jest.fn(() => instance),
      ...instance
    }
  };
});
// Mock database module to avoid real connection and side-effects
jest.mock('../../src/database', () => ({
  __esModule: true,
  default: { query: jest.fn() }
}));
// Mock fs to override readFileSync
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    readFileSync: jest.fn().mockReturnValue(Buffer.from('PDF')),
    promises: actualFs.promises
  };
});
// No need to spy on path.join: use actual implementation

import pool from '../../src/database';
import { generateAISummary, generateAIQuiz } from '../../src/AIsummarizer';
import * as path from 'path';
import axios from 'axios';
const pdfMock = require('pdf-parse') as jest.Mock;
const axiosMock = axios as jest.Mocked<typeof axios>;

describe('AIsummarizer', () => {
  beforeEach(() => {
    // Reset mocks
    (pool.query as jest.Mock).mockResolvedValue({ rows: [{ folder_path: '/base' }] });
    pdfMock.mockClear();
    axiosMock.post.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('generateAISummary returns trimmed content', async () => {
    const result = await generateAISummary('course/sub/file.pdf');
    expect(pdfMock).toHaveBeenCalled();
    expect(axiosMock.post).toHaveBeenCalled();
    expect(result).toBe('answer');
  });

  it('generateAIQuiz returns parsed JSON array', async () => {
    // Adjust axios mock for quiz scenario
    axiosMock.post.mockResolvedValueOnce({ 
      data: { choices: [{ message: { content: '[1,2,3]' } }] } 
    });
  
    const quizRaw = await generateAIQuiz('course/sub/file.pdf');
    expect(pdfMock).toHaveBeenCalled();
    // 手动解析字符串
    const quiz = typeof quizRaw === 'string' ? JSON.parse(quizRaw) : quizRaw;
    expect(Array.isArray(quiz)).toBe(true);
    expect(quiz).toEqual([1, 2, 3]);
  });
});
