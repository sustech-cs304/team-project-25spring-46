// tests/backend/AIsummarizer.test.ts

import { generateAISummary, generateAIQuiz } from '../../src/AIsummarizer';

describe('AIsummarizer (test env)', () => {
  beforeAll(() => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('generateAISummary 在测试环境返回固定文本', async () => {
    const res = await generateAISummary('anything');
    expect(res).toBe('测试LLM回答');
  });

  it('generateAIQuiz 在测试环境返回固定文本', async () => {
    const res = await generateAIQuiz('anything');
    expect(res).toBe('测试LLM回答');
  });
});
