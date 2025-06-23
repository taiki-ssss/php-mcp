import { describe, expect, test } from 'vitest';
import { parsePhp, tokenizePhp } from '../index.js';

describe('Trait Adaptations - Debug', () => {
  test('simple trait use without adaptations', () => {
    const code = `<?php 
    class Foo { 
      use Bar; 
    }`;
    
    const result = parsePhp(code);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.value.statements.length).toBeGreaterThan(0);
    }
  });

  test('trait use with simple alias adaptation', () => {
    const code = `<?php 
    class Foo { 
      use Bar { 
        bar as private; 
      } 
    }`;
    
    // First check tokenization
    const tokens = tokenizePhp(code);
    
    const result = parsePhp(code, { errorRecovery: false });
    
    if (!result.success) {
    }
    
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.value.statements.length).toBeGreaterThan(0);
    }
  });

  test('trait use with method alias', () => {
    const code = `<?php 
    class Foo { 
      use Bar { 
        bar as myBar; 
      } 
    }`;
    
    const result = parsePhp(code, { errorRecovery: false });
    
    if (!result.success) {
    }
    
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.value.statements.length).toBeGreaterThan(0);
    }
  });

  test('trait use with insteadof', () => {
    const code = `<?php 
    class Foo { 
      use A, B { 
        A::bar insteadof B; 
      } 
    }`;
    
    const result = parsePhp(code);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.value.statements.length).toBeGreaterThan(0);
    }
  });

  test('complex trait adaptations', () => {
    const code = `<?php 
    class Foo { 
      use A, B { 
        A::bar insteadof B;
        B::baz as private myBaz;
        qux as protected;
      } 
    }`;
    
    const result = parsePhp(code);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.value.statements.length).toBeGreaterThan(0);
    }
  });

  test('minimal code with adaptation', () => {
    const code = `<?php use Bar { bar as private; }`;
    
    const result = parsePhp(code);
    
    if (!result.success) {
    }
  });
});