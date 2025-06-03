import { spawnSync } from 'child_process';
import path from 'path';

describe('text_to_code.py functions', () => {
  const pyPath = path.resolve(__dirname, '../../src/text_to_code.py');

  function callCheckCode(input: string) {
    const res = spawnSync('python', [pyPath, 'checkcode', input], { encoding: 'utf-8' });
    return res.stdout + res.stderr;
  }

  it('should detect Python code', () => {
    const code = 'def foo():\n    print("hi")';
    const out = callCheckCode(code);
    expect(out).toMatch(/Python/);
  });

  it('should detect C code', () => {
    const code = '#include <stdio.h>\nint main() { return 0; }';
    const out = callCheckCode(code);
    expect(out).toMatch(/C/);
  });

  it('should detect Java code', () => {
    const code = 'public class Main { public static void main(String[] args) { } }';
    const out = callCheckCode(code);
    expect(out).toMatch(/Java/);
  });

  it('should detect Unknown for random text', () => {
    const code = 'hello world!';
    const out = callCheckCode(code);
    expect(out).toMatch(/Unknown/);
  });
}); 