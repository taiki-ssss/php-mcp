# PHP MCP Server

A Model Context Protocol (MCP) server that provides semantic PHP code analysis and refactoring tools. This server enables AI assistants to perform safe, intelligent PHP code transformations at the AST level.

## Overview

The PHP MCP Server provides tools for analyzing and refactoring PHP code through semantic operations rather than simple text manipulation. It includes a full PHP parser that generates type-safe ASTs and supports PSR-4 standards for namespace handling.

## Tools

### 1. `php_rename_symbol`

Rename a PHP symbol (variable, function, class, etc.) across the entire codebase.

**Parameters:**
- `filePath` (string): File path containing the symbol (relative to root)
- `line` (number | string): Line number (1-based) or string to match
- `oldName` (string): Current name of the symbol
- `newName` (string): New name for the symbol
- `root` (string, optional): Root directory for resolving relative paths

**Returns:**
- List of changed files with their modifications
- Total number of changes made

**Example:**
```json
{
  "filePath": "src/User.php",
  "line": 10,
  "oldName": "getUserName",
  "newName": "getUsername"
}
```

### 2. `php_find_references`

Find all references to a PHP symbol across the codebase.

**Parameters:**
- `filePath` (string): File path containing the symbol (relative to root)
- `line` (number | string): Line number (1-based) or string to match
- `symbolName` (string): Name of the symbol to find references for
- `root` (string, optional): Root directory for resolving relative paths

**Returns:**
- List of files containing references
- Line numbers and context for each reference

**Example:**
```json
{
  "filePath": "src/User.php",
  "line": 5,
  "symbolName": "User"
}
```

### 3. `php_get_symbols`

Get all symbols (classes, functions, methods, properties, etc.) from a PHP file.

**Parameters:**
- `filePath` (string): File path to analyze (relative to root)
- `root` (string, optional): Root directory for resolving relative paths

**Returns:**
- Symbols grouped by type (classes, functions, methods, properties)
- Location information for each symbol

**Example:**
```json
{
  "filePath": "src/User.php"
}
```

### 4. `php_move_file`

Move a PHP file and automatically update all references to it (namespaces, use statements, require/include).

**Parameters:**
- `oldPath` (string): Current file path (relative to root)
- `newPath` (string): New file path (relative to root)
- `root` (string, optional): Root directory for resolving relative paths
- `updateReferences` (boolean, optional): Update references in other files (default: true)

**Returns:**
- Information about the move operation
- List of files that were updated

**Example:**
```json
{
  "oldPath": "src/User.php",
  "newPath": "src/Models/User.php",
  "updateReferences": true
}
```

## Features

- **Full PHP Parser**: Complete PHP parser that generates type-safe ASTs
- **Semantic Analysis**: All operations work at the AST level, not just string replacement
- **PSR-4 Support**: Automatic namespace handling following PHP standards
- **Project-wide Refactoring**: Analyze and update multiple files across the entire project
- **Error Recovery**: Parser continues processing even when encountering syntax errors

## Installation

1. Install the PHP MCP server:
```bash
npm install php-mcp
```

2. Configure your MCP client to use the server:
```json
{
  "mcpServers": {
    "php-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/php-mcp/dist/app/index.js"],
    }
  }
}
```

## Usage

The PHP MCP server is designed to be used by AI assistants for performing code analysis and refactoring tasks. Once configured, the AI assistant can use the tools to:

- Rename variables, functions, classes, and other symbols
- Find all usages of a particular symbol
- Analyze file structure and extract symbol information
- Move files while maintaining code integrity

## Requirements

- Node.js 16 or higher
- MCP-compatible client (e.g., Claude Desktop, Continue.dev)

## Development

To build the server from source:

```bash
git clone https://github.com/your-repo/php-mcp.git
cd php-mcp
npm install
npm run build
```