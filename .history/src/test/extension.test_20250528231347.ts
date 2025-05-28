import * as assert from 'assert';

// 你可以直接用 describe 和 test（或 it）
describe('Extension Test Suite', () => {
  beforeAll(() => {
    // 可以放初始化逻辑
  });

  test('Sample test', () => {
    expect([1, 2, 3].indexOf(5)).toBe(-1);
    expect([1, 2, 3].indexOf(0)).toBe(-1);
  });
});
