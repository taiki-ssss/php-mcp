import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { moveFile } from './move-file.js';
import os from 'os';

describe('moveFile', () => {
  let tmpDir: string;

  beforeEach(async () => {
    // Create a temporary directory for tests
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'php-mcp-test-'));
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe('namespace update scenarios', () => {
    it('should only update references to the moved class, not other classes in the same namespace', async () => {
      // Setup: Create Laravel-like structure
      const appDir = path.join(tmpDir, 'app');
      const modelsDir = path.join(appDir, 'Models');
      const seedersDir = path.join(tmpDir, 'database', 'seeders');
      
      await fs.mkdir(appDir, { recursive: true });
      await fs.mkdir(modelsDir, { recursive: true });
      await fs.mkdir(seedersDir, { recursive: true });

      // Create Employee.php in app/ directory
      const employeeContent = `<?php

namespace App;

class Employee
{
    protected $name;
}`;
      await fs.writeFile(path.join(appDir, 'Employee.php'), employeeContent);

      // Create User.php already in app/Models/ directory
      const userContent = `<?php

namespace App\\Models;

class User
{
    protected $email;
}`;
      await fs.writeFile(path.join(modelsDir, 'User.php'), userContent);

      // Create DatabaseSeeder.php that uses both User and Employee
      const seederContent = `<?php

namespace Database\\Seeders;

use App\\Employee;
use App\\Models\\User;
use Illuminate\\Database\\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run()
    {
        $user = new User();
        $employee = new Employee();
    }
}`;
      await fs.writeFile(path.join(seedersDir, 'DatabaseSeeder.php'), seederContent);

      // Move Employee.php from app/ to app/Models/
      const result = await moveFile({
        oldPath: path.join(appDir, 'Employee.php'),
        newPath: path.join(modelsDir, 'Employee.php'),
        root: tmpDir,
        updateReferences: true,
      });

      // Verify the move was successful
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.moved).toBe(true);
        expect(result.value.updatedFiles).toBeDefined();
        expect(result.value.updatedFiles!.length).toBeGreaterThan(0);
      }

      // Check that Employee.php was moved and namespace updated
      const movedEmployeeContent = await fs.readFile(path.join(modelsDir, 'Employee.php'), 'utf-8');
      expect(movedEmployeeContent).toContain('namespace App\\Models;');
      expect(movedEmployeeContent).toContain('class Employee');

      // Check that DatabaseSeeder.php was updated correctly
      const updatedSeederContent = await fs.readFile(path.join(seedersDir, 'DatabaseSeeder.php'), 'utf-8');
      
      // Employee reference should be updated
      expect(updatedSeederContent).toContain('use App\\Models\\Employee;');
      expect(updatedSeederContent).not.toContain('use App\\Employee;');
      
      // User reference should NOT be changed (this is the bug we're testing)
      expect(updatedSeederContent).toContain('use App\\Models\\User;');
      expect(updatedSeederContent).not.toContain('use App\\Models\\Models\\User;');
    });

    it('should handle moving files with different class names than file names', async () => {
      // Setup directories
      const srcDir = path.join(tmpDir, 'src');
      const libDir = path.join(tmpDir, 'lib');
      
      await fs.mkdir(srcDir, { recursive: true });
      await fs.mkdir(libDir, { recursive: true });

      // Create MyFile.php with a different class name
      const fileContent = `<?php

namespace Src;

class DifferentClassName
{
    public function test() {}
}`;
      await fs.writeFile(path.join(srcDir, 'MyFile.php'), fileContent);

      // Create a file that uses this class
      const usageContent = `<?php

namespace App;

use Src\\DifferentClassName;

class Consumer
{
    public function consume()
    {
        $obj = new DifferentClassName();
    }
}`;
      await fs.writeFile(path.join(tmpDir, 'Consumer.php'), usageContent);

      // Move the file
      const result = await moveFile({
        oldPath: path.join(srcDir, 'MyFile.php'),
        newPath: path.join(libDir, 'MyFile.php'),
        root: tmpDir,
        updateReferences: true,
      });

      expect(result.isOk()).toBe(true);

      // Check that the namespace was updated in the moved file
      const movedContent = await fs.readFile(path.join(libDir, 'MyFile.php'), 'utf-8');
      expect(movedContent).toContain('namespace Lib;');
      expect(movedContent).toContain('class DifferentClassName');

      // Check that the reference was updated correctly
      const updatedUsageContent = await fs.readFile(path.join(tmpDir, 'Consumer.php'), 'utf-8');
      expect(updatedUsageContent).toContain('use Lib\\DifferentClassName;');
      expect(updatedUsageContent).not.toContain('use Src\\DifferentClassName;');
    });

    it('should not update unrelated use statements', async () => {
      // Setup directories
      const controllersDir = path.join(tmpDir, 'app', 'Controllers');
      const modelsDir = path.join(tmpDir, 'app', 'Models');
      
      await fs.mkdir(controllersDir, { recursive: true });
      await fs.mkdir(modelsDir, { recursive: true });

      // Create AuthController.php
      const authControllerContent = `<?php

namespace App\\Controllers;

class AuthController
{
    public function login() {}
}`;
      await fs.writeFile(path.join(controllersDir, 'AuthController.php'), authControllerContent);

      // Create multiple models
      const userContent = `<?php

namespace App\\Models;

class User
{
    protected $email;
}`;
      await fs.writeFile(path.join(modelsDir, 'User.php'), userContent);

      const postContent = `<?php

namespace App\\Models;

class Post
{
    protected $title;
}`;
      await fs.writeFile(path.join(modelsDir, 'Post.php'), postContent);

      // Create a service that uses all of them
      const serviceContent = `<?php

namespace App\\Services;

use App\\Controllers\\AuthController;
use App\\Models\\User;
use App\\Models\\Post;

class AuthService
{
    public function authenticate()
    {
        $controller = new AuthController();
        $user = new User();
        $post = new Post();
    }
}`;
      const servicesDir = path.join(tmpDir, 'app', 'Services');
      await fs.mkdir(servicesDir, { recursive: true });
      await fs.writeFile(path.join(servicesDir, 'AuthService.php'), serviceContent);

      // Move AuthController to a different namespace
      const apiControllersDir = path.join(tmpDir, 'app', 'Api', 'Controllers');
      await fs.mkdir(apiControllersDir, { recursive: true });
      
      const result = await moveFile({
        oldPath: path.join(controllersDir, 'AuthController.php'),
        newPath: path.join(apiControllersDir, 'AuthController.php'),
        root: tmpDir,
        updateReferences: true,
      });

      expect(result.isOk()).toBe(true);

      // Check that only AuthController reference was updated
      const updatedServiceContent = await fs.readFile(path.join(servicesDir, 'AuthService.php'), 'utf-8');
      
      // AuthController reference should be updated
      expect(updatedServiceContent).toContain('use App\\Api\\Controllers\\AuthController;');
      expect(updatedServiceContent).not.toContain('use App\\Controllers\\AuthController;');
      
      // Other references should remain unchanged
      expect(updatedServiceContent).toContain('use App\\Models\\User;');
      expect(updatedServiceContent).toContain('use App\\Models\\Post;');
      expect(updatedServiceContent).not.toContain('use App\\Api\\Models\\User;');
      expect(updatedServiceContent).not.toContain('use App\\Api\\Models\\Post;');
    });
  });

  describe('basic move operations', () => {
    it('should move a file without references', async () => {
      const oldPath = path.join(tmpDir, 'old.php');
      const newPath = path.join(tmpDir, 'new.php');
      
      await fs.writeFile(oldPath, '<?php\necho "Hello";');
      
      const result = await moveFile({
        oldPath,
        newPath,
        root: tmpDir,
        updateReferences: false,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.moved).toBe(true);
        expect(result.value.updatedFiles).toBeUndefined();
      }

      // Check file was moved
      await expect(fs.access(newPath)).resolves.toBeUndefined();
      await expect(fs.access(oldPath)).rejects.toThrow();
    });

    it('should fail if source file does not exist', async () => {
      const result = await moveFile({
        oldPath: path.join(tmpDir, 'nonexistent.php'),
        newPath: path.join(tmpDir, 'new.php'),
        root: tmpDir,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toContain('Source file not found');
      }
    });

    it('should fail if destination already exists', async () => {
      const oldPath = path.join(tmpDir, 'old.php');
      const newPath = path.join(tmpDir, 'existing.php');
      
      await fs.writeFile(oldPath, '<?php\necho "Old";');
      await fs.writeFile(newPath, '<?php\necho "Existing";');
      
      const result = await moveFile({
        oldPath,
        newPath,
        root: tmpDir,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toContain('Destination file already exists');
      }
    });
  });

  describe('composer.json PSR-4 support', () => {
    it('should respect composer.json PSR-4 mappings', async () => {
      // Create composer.json with PSR-4 mapping
      const composerJson = {
        autoload: {
          'psr-4': {
            'App\\': 'app/',
            'Database\\': 'database/',
          },
        },
      };
      await fs.writeFile(
        path.join(tmpDir, 'composer.json'),
        JSON.stringify(composerJson, null, 2)
      );

      // Create directories
      const appDir = path.join(tmpDir, 'app');
      const modelsDir = path.join(appDir, 'Models');
      await fs.mkdir(modelsDir, { recursive: true });

      // Create a file in app/
      const fileContent = `<?php

namespace App;

class Example
{
    public function test() {}
}`;
      await fs.writeFile(path.join(appDir, 'Example.php'), fileContent);

      // Move to app/Models/
      const result = await moveFile({
        oldPath: path.join(appDir, 'Example.php'),
        newPath: path.join(modelsDir, 'Example.php'),
        root: tmpDir,
        updateReferences: true,
      });

      expect(result.isOk()).toBe(true);

      // Check namespace was updated correctly based on PSR-4
      const movedContent = await fs.readFile(path.join(modelsDir, 'Example.php'), 'utf-8');
      expect(movedContent).toContain('namespace App\\Models;');
    });
  });
});