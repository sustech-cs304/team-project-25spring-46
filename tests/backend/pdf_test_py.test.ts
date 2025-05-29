import { spawnSync } from 'child_process';
import path from 'path';

describe('pdf_test.py CLI', () => {
  const pyPath = path.resolve(__dirname, '../../src/pdf_test.py');
  const testPdf = path.resolve(__dirname, '../fixtures/test.pdf'); // 需用户准备
  const outputDir = path.resolve(__dirname, '../fixtures/output'); // 需用户准备

  it('should print usage error if no args', () => {
    const res = spawnSync('python', [pyPath], { encoding: 'utf-8' });
    expect(res.stdout + res.stderr).toMatch(/用法错误|usage/i);
  });

  it('should print error if file not found', () => {
    const res = spawnSync('python', [pyPath, 'not_exist.pdf'], { encoding: 'utf-8' });
    expect(res.stdout + res.stderr).toMatch(/No such file|找不到|error/i);
  });

  it('should process a real PDF (manual)', () => {
    // 需要用户准备好 test.pdf 和 output 目录
    // 跳过此测试如果文件不存在
    const fs = require('fs');
    if (!fs.existsSync(testPdf) || !fs.existsSync(outputDir)) {
      return;
    }
    const res = spawnSync('python', [pyPath, testPdf, outputDir], { encoding: 'utf-8' });
    expect(res.stdout + res.stderr).toMatch(/json|code|完成|output/i);
  });
}); 