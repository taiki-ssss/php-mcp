import { describe, expect, test } from 'vitest';
import { tokenizePhp } from '../index';
import { expectTokens, expectTokenValues } from './test-utils';

describe('Tokenizer', () => {
  describe('PHP tags', () => {
    test('should tokenize opening and closing PHP tags', () => {
      expectTokens('<?php ?>', ['T_OPEN_TAG', 'T_CLOSE_TAG']);
    });

    test('should tokenize short echo tags', () => {
      expectTokens('<?= "hello" ?>', ['T_OPEN_TAG_WITH_ECHO', 'T_CONSTANT_ENCAPSED_STRING', 'T_CLOSE_TAG']);
    });

    test('should handle inline HTML', () => {
      const result = tokenizePhp('<div><?php echo "test"; ?></div>');
      expect(result.success).toBe(true);
      if (result.success) {
        const types = result.value.map(t => t.type);
        expect(types).toContain('T_INLINE_HTML');
        expect(types).toContain('T_OPEN_TAG');
        expect(types).toContain('T_ECHO');
      }
    });
  });

  describe('Keywords', () => {
    test('should tokenize control structure keywords', () => {
      expectTokens('<?php if else elseif ?>', [
        'T_OPEN_TAG', 'T_IF', 'T_ELSE', 'T_ELSEIF', 'T_CLOSE_TAG'
      ]);
    });

    test('should tokenize loop keywords', () => {
      expectTokens('<?php for foreach while do ?>', [
        'T_OPEN_TAG', 'T_FOR', 'T_FOREACH', 'T_WHILE', 'T_DO', 'T_CLOSE_TAG'
      ]);
    });

    test('should tokenize function and class keywords', () => {
      expectTokens('<?php function class interface trait ?>', [
        'T_OPEN_TAG', 'T_FUNCTION', 'T_CLASS', 'T_INTERFACE', 'T_TRAIT', 'T_CLOSE_TAG'
      ]);
    });

    test('should tokenize visibility modifiers', () => {
      expectTokens('<?php public private protected ?>', [
        'T_OPEN_TAG', 'T_PUBLIC', 'T_PRIVATE', 'T_PROTECTED', 'T_CLOSE_TAG'
      ]);
    });

    test('should tokenize type declarations', () => {
      expectTokens('<?php int string bool float array ?>', [
        'T_OPEN_TAG', 'T_STRING', 'T_STRING', 'T_STRING', 'T_STRING', 'T_ARRAY', 'T_CLOSE_TAG'
      ]);
    });
  });

  describe('Variables', () => {
    test('should tokenize simple variables', () => {
      expectTokenValues('<?php $foo $bar $_test ?>', [
        ['T_OPEN_TAG', '<?php '],
        ['T_VARIABLE', '$foo'],
        ['T_VARIABLE', '$bar'],
        ['T_VARIABLE', '$_test'],
        ['T_CLOSE_TAG', '?>']
      ]);
    });

    test('should tokenize variable variables', () => {
      expectTokenValues('<?php $$foo ?>', [
        ['T_OPEN_TAG', '<?php '],
        ['T_DOLLAR', '$'],
        ['T_VARIABLE', '$foo'],
        ['T_CLOSE_TAG', '?>']
      ]);
    });
  });

  describe('Strings', () => {
    test('should tokenize single-quoted strings', () => {
      expectTokenValues("<?php 'hello world' ?>", [
        ['T_OPEN_TAG', '<?php '],
        ['T_CONSTANT_ENCAPSED_STRING', "'hello world'"],
        ['T_CLOSE_TAG', '?>']
      ]);
    });

    test('should tokenize double-quoted strings', () => {
      expectTokenValues('<?php "hello world" ?>', [
        ['T_OPEN_TAG', '<?php '],
        ['T_CONSTANT_ENCAPSED_STRING', '"hello world"'],
        ['T_CLOSE_TAG', '?>']
      ]);
    });

    test('should handle escaped characters in strings', () => {
      expectTokenValues('<?php "hello\\nworld" ?>', [
        ['T_OPEN_TAG', '<?php '],
        ['T_CONSTANT_ENCAPSED_STRING', '"hello\\nworld"'],
        ['T_CLOSE_TAG', '?>']
      ]);
    });

    test('should tokenize string interpolation', () => {
      const result = tokenizePhp('<?php "Hello $name!" ?>');
      expect(result.success).toBe(true);
      if (result.success) {
        const filtered = result.value.filter(t => t.type !== 'T_WHITESPACE');
        expect(filtered[1].type).toBe('T_CONSTANT_ENCAPSED_STRING');
        expect(filtered[1].value).toContain('$name');
      }
    });

    test('should tokenize heredoc strings', () => {
      const code = `<?php
$str = <<<EOT
Hello World
EOT;
?>`;
      const result = tokenizePhp(code);
      expect(result.success).toBe(true);
      if (result.success) {
        const types = result.value.map(t => t.type);
        expect(types).toContain('T_START_HEREDOC');
        expect(types).toContain('T_ENCAPSED_AND_WHITESPACE');
        expect(types).toContain('T_END_HEREDOC');
      }
    });

    test('should tokenize nowdoc strings', () => {
      const code = `<?php
$str = <<<'EOT'
Hello World
EOT;
?>`;
      const result = tokenizePhp(code);
      expect(result.success).toBe(true);
      if (result.success) {
        const types = result.value.map(t => t.type);
        expect(types).toContain('T_START_HEREDOC');
      }
    });
  });

  describe('Numbers', () => {
    test('should tokenize integers', () => {
      expectTokenValues('<?php 42 123 0 ?>', [
        ['T_OPEN_TAG', '<?php '],
        ['T_LNUMBER', '42'],
        ['T_LNUMBER', '123'],
        ['T_LNUMBER', '0'],
        ['T_CLOSE_TAG', '?>']
      ]);
    });

    test('should tokenize floating-point numbers', () => {
      expectTokenValues('<?php 3.14 0.5 .25 ?>', [
        ['T_OPEN_TAG', '<?php '],
        ['T_DNUMBER', '3.14'],
        ['T_DNUMBER', '0.5'],
        ['T_DNUMBER', '.25'],
        ['T_CLOSE_TAG', '?>']
      ]);
    });

    test('should tokenize hexadecimal numbers', () => {
      expectTokenValues('<?php 0xFF 0x10 ?>', [
        ['T_OPEN_TAG', '<?php '],
        ['T_LNUMBER', '0xFF'],
        ['T_LNUMBER', '0x10'],
        ['T_CLOSE_TAG', '?>']
      ]);
    });

    test('should tokenize binary numbers', () => {
      expectTokenValues('<?php 0b1010 0b11 ?>', [
        ['T_OPEN_TAG', '<?php '],
        ['T_LNUMBER', '0b1010'],
        ['T_LNUMBER', '0b11'],
        ['T_CLOSE_TAG', '?>']
      ]);
    });

    test('should tokenize octal numbers', () => {
      expectTokenValues('<?php 0755 0644 ?>', [
        ['T_OPEN_TAG', '<?php '],
        ['T_LNUMBER', '0755'],
        ['T_LNUMBER', '0644'],
        ['T_CLOSE_TAG', '?>']
      ]);
    });
  });

  describe('Operators', () => {
    test('should tokenize arithmetic operators', () => {
      expectTokens('<?php + - * / % ** ?>', [
        'T_OPEN_TAG', '+', '-', '*', '/', '%', 'T_POW', 'T_CLOSE_TAG'
      ]);
    });

    test('should tokenize comparison operators', () => {
      expectTokens('<?php == === != !== < > <= >= <=> ?>', [
        'T_OPEN_TAG', 'T_IS_EQUAL', 'T_IS_IDENTICAL', 'T_IS_NOT_EQUAL', 
        'T_IS_NOT_IDENTICAL', '<', '>', 'T_IS_SMALLER_OR_EQUAL', 
        'T_IS_GREATER_OR_EQUAL', 'T_SPACESHIP', 'T_CLOSE_TAG'
      ]);
    });

    test('should tokenize logical operators', () => {
      expectTokens('<?php && || ! and or xor ?>', [
        'T_OPEN_TAG', 'T_BOOLEAN_AND', 'T_BOOLEAN_OR', '!', 
        'T_LOGICAL_AND', 'T_LOGICAL_OR', 'T_LOGICAL_XOR', 'T_CLOSE_TAG'
      ]);
    });

    test('should tokenize assignment operators', () => {
      expectTokens('<?php = += -= *= /= %= **= .= ?>', [
        'T_OPEN_TAG', '=', 'T_PLUS_EQUAL', 'T_MINUS_EQUAL', 'T_MUL_EQUAL',
        'T_DIV_EQUAL', 'T_MOD_EQUAL', 'T_POW_EQUAL', 'T_CONCAT_EQUAL', 'T_CLOSE_TAG'
      ]);
    });

    test('should tokenize increment/decrement operators', () => {
      expectTokens('<?php ++ -- ?>', [
        'T_OPEN_TAG', 'T_INC', 'T_DEC', 'T_CLOSE_TAG'
      ]);
    });

    test('should tokenize null coalescing operators', () => {
      expectTokens('<?php ?? ??= ?>', [
        'T_OPEN_TAG', 'T_COALESCE', 'T_COALESCE_EQUAL', 'T_CLOSE_TAG'
      ]);
    });

    test('should tokenize arrow operators', () => {
      expectTokens('<?php -> => ?>', [
        'T_OPEN_TAG', 'T_OBJECT_OPERATOR', 'T_DOUBLE_ARROW', 'T_CLOSE_TAG'
      ]);
    });

    test('should tokenize scope resolution operator', () => {
      expectTokens('<?php :: ?>', [
        'T_OPEN_TAG', 'T_DOUBLE_COLON', 'T_CLOSE_TAG'
      ]);
    });

    test('should tokenize nullsafe operator', () => {
      expectTokens('<?php ?-> ?>', [
        'T_OPEN_TAG', 'T_NULLSAFE_OBJECT_OPERATOR', 'T_CLOSE_TAG'
      ]);
    });
  });

  describe('Comments', () => {
    test('should tokenize single-line comments', () => {
      const code = `<?php
// This is a comment
# This is also a comment
?>`;
      const result = tokenizePhp(code);
      expect(result.success).toBe(true);
      if (result.success) {
        const comments = result.value.filter(t => t.type === 'T_COMMENT');
        expect(comments.length).toBe(2);
        expect(comments[0].value).toContain('This is a comment');
        expect(comments[1].value).toContain('This is also a comment');
      }
    });

    test('should tokenize multi-line comments', () => {
      const code = `<?php
/* This is a
   multi-line comment */
?>`;
      const result = tokenizePhp(code);
      expect(result.success).toBe(true);
      if (result.success) {
        const comments = result.value.filter(t => t.type === 'T_COMMENT');
        expect(comments.length).toBe(1);
        expect(comments[0].value).toContain('multi-line comment');
      }
    });

    test('should tokenize doc comments', () => {
      const code = `<?php
/**
 * This is a doc comment
 * @param string $name
 */
?>`;
      const result = tokenizePhp(code);
      expect(result.success).toBe(true);
      if (result.success) {
        const docComments = result.value.filter(t => t.type === 'T_DOC_COMMENT');
        expect(docComments.length).toBe(1);
        expect(docComments[0].value).toContain('@param');
      }
    });
  });

  describe('Special tokens', () => {
    test('should tokenize namespaces', () => {
      expectTokens('<?php namespace App\\Models; ?>', [
        'T_OPEN_TAG', 'T_NAMESPACE', 'T_STRING', 'T_NS_SEPARATOR', 'T_STRING', ';', 'T_CLOSE_TAG'
      ]);
    });

    test('should tokenize use statements', () => {
      expectTokens('<?php use App\\Models\\User; ?>', [
        'T_OPEN_TAG', 'T_USE', 'T_STRING', 'T_NS_SEPARATOR', 'T_STRING', 
        'T_NS_SEPARATOR', 'T_STRING', ';', 'T_CLOSE_TAG'
      ]);
    });

    test('should tokenize attributes', () => {
      const code = '<?php #[Route("/api")] ?>';
      const result = tokenizePhp(code);
      expect(result.success).toBe(true);
      if (result.success) {
        const types = result.value.map(t => t.type).filter(t => t !== 'T_WHITESPACE');
        expect(types).toContain('T_ATTRIBUTE');
      }
    });

    test('should tokenize match expressions', () => {
      expectTokens('<?php match($x) { 1 => "one", default => "other" } ?>', [
        'T_OPEN_TAG', 'T_MATCH', '(', 'T_VARIABLE', ')', '{',
        'T_LNUMBER', 'T_DOUBLE_ARROW', 'T_CONSTANT_ENCAPSED_STRING', ',',
        'T_DEFAULT', 'T_DOUBLE_ARROW', 'T_CONSTANT_ENCAPSED_STRING',
        '}', 'T_CLOSE_TAG'
      ]);
    });

    test('should tokenize arrow functions', () => {
      expectTokens('<?php fn($x) => $x * 2 ?>', [
        'T_OPEN_TAG', 'T_FN', '(', 'T_VARIABLE', ')', 'T_DOUBLE_ARROW',
        'T_VARIABLE', '*', 'T_LNUMBER', 'T_CLOSE_TAG'
      ]);
    });
  });

  describe('Error handling', () => {
    test('should handle unterminated strings', () => {
      const result = tokenizePhp('<?php "unterminated string');
      expect(result.success).toBe(true); // Tokenizer should still succeed
      if (result.success) {
        const stringToken = result.value.find(t => t.type === 'T_CONSTANT_ENCAPSED_STRING' || t.type === 'T_ENCAPSED_AND_WHITESPACE');
        expect(stringToken).toBeDefined();
      }
    });

    test('should handle invalid characters', () => {
      const result = tokenizePhp('<?php @ # $ ?>');;
      expect(result.success).toBe(true);
      if (result.success) {
        const types = result.value.map(t => t.type).filter(t => t !== 'T_WHITESPACE');
        expect(types).toContain('@'); // @ is a valid operator
      }
    });

    test('should handle deeply nested structures', () => {
      const nested = '<?php [[[[[[[[[[]]]]]]]]]] ?>';
      const result = tokenizePhp(nested);
      expect(result.success).toBe(true);
    });
  });

  describe('Whitespace and formatting', () => {
    test('should preserve whitespace tokens', () => {
      const code = '<?php   $x  =  42  ;  ?>';
      const result = tokenizePhp(code);
      expect(result.success).toBe(true);
      if (result.success) {
        const whitespace = result.value.filter(t => t.type === 'T_WHITESPACE');
        expect(whitespace.length).toBeGreaterThan(0);
      }
    });

    test('should handle different line endings', () => {
      const codeUnix = "<?php\n\$x = 42;\n?>";
      const codeWindows = "<?php\r\n\$x = 42;\r\n?>";
      
      const resultUnix = tokenizePhp(codeUnix);
      const resultWindows = tokenizePhp(codeWindows);
      
      expect(resultUnix.success).toBe(true);
      expect(resultWindows.success).toBe(true);
    });
  });
});