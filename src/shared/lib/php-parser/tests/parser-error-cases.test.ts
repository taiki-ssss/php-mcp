import { describe, expect, test } from 'vitest';
import { expectParseSuccess, expectParseFail, getFirstStatement } from './test-utils';

describe('Parser - Error Cases', () => {
  test('should handle incomplete class declaration', () => {
    expectParseFail('<?php class ?>');
  });

  test('should handle incomplete function declaration', () => {
    expectParseFail('<?php function ?>');
  });

  test('should handle invalid property declaration', () => {
    expectParseFail('<?php class Foo { public; } ?>');
  });

  test('should handle invalid method declaration', () => {
    expectParseFail('<?php class Foo { public function; } ?>');
  });

  test('should handle invalid namespace declaration', () => {
    expectParseFail('<?php namespace; ?>');
  });

  test('should handle invalid use statement', () => {
    expectParseFail('<?php use; ?>');
  });

  test('should handle unclosed class', () => {
    expectParseFail('<?php class Foo { ?>');
  });

  test('should handle unclosed function', () => {
    expectParseFail('<?php function foo() { ?>');
  });

  test('should handle invalid attribute syntax', () => {
    expectParseFail('<?php #[ function foo() {} ?>');
  });

  test('should handle duplicate visibility modifiers', () => {
    expectParseFail('<?php class Foo { public public $bar; } ?>');
  });

  test('should handle invalid anonymous class', () => {
    expectParseFail('<?php $foo = new class extends {}; ?>');
  });

  test('should handle invalid trait use', () => {
    expectParseFail('<?php class Foo { use; } ?>');
  });

  test('should handle invalid const declaration', () => {
    expectParseFail('<?php const FOO; ?>');
  });

  test('should handle invalid enum declaration', () => {
    expectParseFail('<?php enum Foo: ?>');
  });

  test('should handle invalid interface method', () => {
    expectParseFail('<?php interface Foo { public function bar() { echo "no body allowed"; } } ?>');
  });
});