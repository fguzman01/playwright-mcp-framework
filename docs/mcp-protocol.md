# Model Context Protocol (MCP)

Este documento describe el protocolo MCP y cómo se implementa en playwright-mcp-framework.

## ¿Qué es MCP?

**Model Context Protocol** es un protocolo basado en JSON-RPC 2.0 que permite a agentes AI (como Claude) invocar herramientas (tools) en sistemas externos.

### Flujo Básico

```
┌─────────┐                  ┌─────────────┐                  ┌──────────────┐
│ LLM/AI  │                  │  MCP Server │                  │  Playwright  │
│ Agent   │                  │  (Node.js)  │                  │   Browser    │
└────┬────┘                  └──────┬──────┘                  └──────┬───────┘
     │                              │                                │
     │  1. initialize               │                                │
     ├─────────────────────────────>│                                │
     │                              │                                │
     │  2. initialized              │                                │
     │<─────────────────────────────┤                                │
     │                              │                                │
     │  3. tools/list               │                                │
     ├─────────────────────────────>│                                │
     │                              │                                │
     │  4. tools list response      │                                │
     │<─────────────────────────────┤                                │
     │                              │                                │
     │  5. tools/call:              │                                │
     │     browser_launch           │                                │
     ├─────────────────────────────>│  chromium.launch()             │
     │                              ├───────────────────────────────>│
     │                              │                                │
     │  6. content[] response       │  Browser opened                │
     │<─────────────────────────────┤<───────────────────────────────┤
     │                              │                                │
     │  7. tools/call:              │                                │
     │     browser_navigate         │                                │
     ├─────────────────────────────>│  page.goto(url)                │
     │                              ├───────────────────────────────>│
     │                              │                                │
     │  8. content[] response       │  Page loaded                   │
     │<─────────────────────────────┤<───────────────────────────────┤
```

## JSON-RPC 2.0 Format

### Request

```typescript
interface JSONRPCRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: object;
}
```

### Response

```typescript
interface JSONRPCResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: object;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}
```

## MCP Methods

### 1. `initialize`

Inicializa la conexión MCP. Debe ser la primera llamada.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "clientInfo": {
      "name": "claude-desktop",
      "version": "1.0.0"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "playwright-mcp-server",
      "version": "1.0.0"
    }
  }
}
```

### 2. `tools/list`

Lista todas las herramientas disponibles.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list",
  "params": {}
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "browser_launch",
        "description": "Launch a Playwright browser (chromium, firefox, or webkit)",
        "inputSchema": {
          "type": "object",
          "properties": {
            "browserType": {
              "type": "string",
              "enum": ["chromium", "firefox", "webkit"],
              "default": "chromium",
              "description": "Type of browser to launch"
            },
            "headless": {
              "type": "boolean",
              "default": true,
              "description": "Run browser in headless mode"
            }
          }
        }
      },
      {
        "name": "browser_navigate",
        "description": "Navigate to a URL",
        "inputSchema": {
          "type": "object",
          "properties": {
            "url": {
              "type": "string",
              "description": "URL to navigate to"
            }
          },
          "required": ["url"]
        }
      }
      // ... más tools
    ]
  }
}
```

### 3. `tools/call`

Ejecuta una herramienta específica.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "browser_navigate",
    "arguments": {
      "url": "https://example.com"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Successfully navigated to https://example.com"
      }
    ]
  }
}
```

## Content Types

MCP tools retornan un array de `content` que puede contener:

### Text Content

```typescript
{
  type: "text",
  text: string
}
```

**Ejemplo:**
```json
{
  "type": "text",
  "text": "Clicked button 'Submit'"
}
```

### Image Content

```typescript
{
  type: "image",
  data: string,      // base64
  mimeType: string   // "image/png"
}
```

**Ejemplo:**
```json
{
  "type": "image",
  "data": "iVBORw0KGgoAAAANSUhEUgAA...",
  "mimeType": "image/png"
}
```

### Resource Content

```typescript
{
  type: "resource",
  resource: {
    uri: string,
    mimeType?: string,
    text?: string
  }
}
```

**Ejemplo:**
```json
{
  "type": "resource",
  "resource": {
    "uri": "file:///screenshots/screenshot-001.png",
    "mimeType": "image/png"
  }
}
```

## Error Handling

### Error Codes (JSON-RPC Standard)

| Code | Message | Meaning |
|------|---------|---------|
| -32700 | Parse error | Invalid JSON |
| -32600 | Invalid Request | Invalid JSON-RPC request |
| -32601 | Method not found | Method doesn't exist |
| -32602 | Invalid params | Invalid method parameters |
| -32603 | Internal error | Server-side error |

### MCP-Specific Errors

**Tool Not Found:**
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "error": {
    "code": -32601,
    "message": "Tool not found: browser_invalid",
    "data": {
      "availableTools": ["browser_launch", "browser_navigate", ...]
    }
  }
}
```

**Tool Execution Failed:**
```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "error": {
    "code": -32603,
    "message": "Tool execution failed: browser_click",
    "data": {
      "error": "Element not found: button.submit",
      "selector": "button.submit",
      "stack": "Error: locator.click: ..."
    }
  }
}
```

**Browser Not Launched:**
```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "error": {
    "code": -32603,
    "message": "No browser instance found. Call browser_launch first.",
    "data": {
      "hint": "Use browser_launch tool to start a browser session"
    }
  }
}
```

## MCP Server Implementation

### TypeScript Types

```typescript
// src/mcp/types.ts

export interface JSONRPCRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: any;
}

export interface JSONRPCResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: any;
  error?: JSONRPCError;
}

export interface JSONRPCError {
  code: number;
  message: string;
  data?: any;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPContent {
  type: "text" | "image" | "resource";
  text?: string;
  data?: string;
  mimeType?: string;
  resource?: {
    uri: string;
    mimeType?: string;
    text?: string;
  };
}

export interface ToolResult {
  content: MCPContent[];
}

export type ToolHandler = (args: any) => Promise<ToolResult>;
```

### Server Structure

```typescript
// src/mcp/server.ts

import { JSONRPCRequest, JSONRPCResponse, MCPTool, ToolHandler } from './types';

export class MCPServer {
  private tools: Map<string, { definition: MCPTool; handler: ToolHandler }>;
  private initialized: boolean = false;

  async handleRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    try {
      switch (request.method) {
        case 'initialize':
          return this.handleInitialize(request);
        case 'tools/list':
          return this.handleToolsList(request);
        case 'tools/call':
          return this.handleToolCall(request);
        default:
          return this.createErrorResponse(request.id, -32601, 'Method not found');
      }
    } catch (error) {
      return this.createErrorResponse(request.id, -32603, 'Internal error', error);
    }
  }

  private async handleInitialize(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    this.initialized = true;
    
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: {
          name: "playwright-mcp-server",
          version: "1.0.0"
        }
      }
    };
  }

  private async handleToolsList(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    const tools = Array.from(this.tools.values()).map(t => t.definition);
    
    return {
      jsonrpc: "2.0",
      id: request.id,
      result: { tools }
    };
  }

  private async handleToolCall(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    const { name, arguments: args } = request.params;
    
    const tool = this.tools.get(name);
    if (!tool) {
      return this.createErrorResponse(
        request.id,
        -32601,
        `Tool not found: ${name}`
      );
    }
    
    const result = await tool.handler(args);
    
    return {
      jsonrpc: "2.0",
      id: request.id,
      result
    };
  }

  private createErrorResponse(
    id: string | number,
    code: number,
    message: string,
    data?: any
  ): JSONRPCResponse {
    return {
      jsonrpc: "2.0",
      id,
      error: { code, message, data }
    };
  }
}
```

## Transport Layer

MCP puede usar diferentes transportes:

### stdio (Standard Input/Output)
```typescript
// Para integración con Claude Desktop
process.stdin.on('data', (data) => {
  const request = JSON.parse(data.toString());
  const response = await server.handleRequest(request);
  process.stdout.write(JSON.stringify(response) + '\n');
});
```

### HTTP/WebSocket
```typescript
// Para servicios web
app.post('/mcp', async (req, res) => {
  const response = await server.handleRequest(req.body);
  res.json(response);
});
```

## Referencias

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [JSON-RPC 2.0](https://www.jsonrpc.org/specification)
- [Claude MCP Documentation](https://docs.anthropic.com/claude/docs/model-context-protocol)
- [Vibium MCP Implementation](https://github.com/vibium/vibium)
