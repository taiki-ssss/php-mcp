import { describe, expect, test } from 'vitest';
import { parsePhp } from '../index';

describe('Minimal Parser Test', () => {
  test('should parse simple PHP code', () => {
    const code = `<?php
    $name = "test";
    echo $name;
    ?>`;
    
    const result = parsePhp(code);
    expect(result.success).toBe(true);
  });

  test('should parse function declaration', () => {
    const code = `<?php
    function greet($name) {
      return "Hello, $name!";
    }
    ?>`;
    
    const result = parsePhp(code);
    expect(result.success).toBe(true);
  });

  test('should handle parse errors', () => {
    const code = `<?php
    function // incomplete
    ?>`;
    
    const result = parsePhp(code, { errorRecovery: false });
    expect(result.success).toBe(false);
  });
});