/**
 * MCP Server - Model Context Protocol JSON-RPC Server
 * 
 * This server implements the MCP protocol to expose browser automation
 * capabilities to AI agents (like Claude) via stdio transport.
 * 
 * Architecture:
 * - Agent sends JSON-RPC requests via stdin (one per line)
 * - Server executes browserManager operations
 * - Server returns JSON-RPC responses via stdout (JSON per line)
 * - Server logs to stderr only (never stdout)
 * 
 * Protocol:
 * - JSON-RPC 2.0 format
 * - Methods: initialize, tools/list, tools/call
 * - Transport: stdio (line-delimited JSON)
 */

import * as readline from 'readline';
import * as path from 'path';
import { browserManager } from '../core/browserManager';
import { registerProcessHooks } from '../core/processHooks';
import { logger } from '../utils/logger';
import { config } from '../core/config';
import { ensureDir } from '../utils/fs';

/**
 * JSON-RPC error codes
 */
const ErrorCode = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

/**
 * JSON-RPC 2.0 request interface
 */
interface JSONRPCRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id?: string | number | null;
}

/**
 * JSON-RPC 2.0 response interface
 */
interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * MCP Server implementation
 */
export class MCPServer {
  private isInitialized = false;

  constructor() {
    // Register process hooks for graceful shutdown
    this.registerShutdownHooks();
  }

  /**
   * Register process hooks for graceful shutdown
   */
  private registerShutdownHooks(): void {
    registerProcessHooks(async () => {
      logger.info('MCP Server: Shutting down browser...');
      await browserManager.shutdown();
      logger.info('MCP Server: Browser shutdown complete');
    });
    
    logger.debug('MCP Server: Process hooks registered');
  }

  /**
   * Start the MCP server - listen to stdin for JSON-RPC requests
   */
  async start(): Promise<void> {
    logger.info('MCP Server: Starting stdio transport...');
    
    // Create readline interface for line-by-line stdin processing
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    // Process each line from stdin
    rl.on('line', async (line: string) => {
      // Ignore empty lines
      if (!line.trim()) {
        return;
      }

      logger.debug(`MCP Server: Received request: ${line.substring(0, 100)}...`);

      // Try to parse JSON
      let request: JSONRPCRequest;
      try {
        request = JSON.parse(line);
      } catch (error: any) {
        logger.error(`MCP Server: JSON parse error: ${error.message}`);
        this.sendError(null, ErrorCode.PARSE_ERROR, 'Parse error', error.message);
        return;
      }

      // Handle the request
      try {
        await this.handleRequest(request);
      } catch (error: any) {
        logger.error(`MCP Server: Error handling request: ${error.message}`);
        this.sendError(
          request.id ?? null,
          ErrorCode.INTERNAL_ERROR,
          'Internal error',
          error.message
        );
      }
    });

    rl.on('close', () => {
      logger.info('MCP Server: stdin closed, shutting down...');
      process.exit(0);
    });

    logger.info('MCP Server: Ready to receive requests on stdin');
  }

  /**
   * Route incoming JSON-RPC request to appropriate handler
   */
  private async handleRequest(request: JSONRPCRequest): Promise<void> {
    const { method, params, id } = request;

    logger.debug(`MCP Server: Handling method: ${method}`);

    switch (method) {
      case 'initialize':
        await this.handleInitialize(params, id ?? null);
        break;

      case 'tools/list':
        await this.handleToolsList(id ?? null);
        break;

      case 'tools/call':
        await this.handleToolsCall(params, id ?? null);
        break;

      default:
        this.sendError(id ?? null, ErrorCode.METHOD_NOT_FOUND, `Method not found: ${method}`);
    }
  }

  /**
   * Handle initialize request
   */
  private async handleInitialize(params: any, id: string | number | null): Promise<void> {
    logger.info('MCP Server: Initializing...');
    
    this.isInitialized = true;

    this.sendResult(id, {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
      },
      serverInfo: {
        name: 'playwright-mcp-framework',
        version: '0.1.0',
      },
    });

    logger.info('MCP Server: Initialized successfully');
  }

  /**
   * Handle tools/list request
   */
  private async handleToolsList(id: string | number | null): Promise<void> {
    logger.debug('MCP Server: Listing tools...');

    const tools = [
      {
        name: 'browser_launch',
        description: 'Start a browser session (visible by default)',
        inputSchema: {
          type: 'object',
          properties: {
            headless: {
              type: 'boolean',
              description: 'Run browser headless',
            },
          },
          required: [],
        },
      },
      {
        name: 'browser_navigate',
        description: 'Go to a URL',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL to navigate to',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'browser_screenshot',
        description: 'Capture viewport (optionally save to file)',
        inputSchema: {
          type: 'object',
          properties: {
            filename: {
              type: 'string',
              description: 'Optional filename (relative to SCREENSHOT_DIR)',
            },
            returnBase64: {
              type: 'boolean',
              description: 'Return base64 instead of saving only',
            },
            fullPage: {
              type: 'boolean',
              description: 'Capture full page',
            },
          },
          required: [],
        },
      },
      {
        name: 'browser_quit',
        description: 'Close the browser session',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ];

    this.sendResult(id, { tools });
  }

  /**
   * Handle tools/call request
   */
  private async handleToolsCall(params: any, id: string | number | null): Promise<void> {
    if (!params || typeof params !== 'object') {
      this.sendError(id, ErrorCode.INVALID_PARAMS, 'Invalid params: expected object');
      return;
    }

    const { name, arguments: args } = params;

    if (!name || typeof name !== 'string') {
      this.sendError(id, ErrorCode.INVALID_PARAMS, 'Invalid params: missing or invalid "name"');
      return;
    }

    logger.info(`MCP Server: Calling tool: ${name}`);

    switch (name) {
      case 'browser_launch':
        await this.toolBrowserLaunch(args || {}, id);
        break;

      case 'browser_navigate':
        await this.toolBrowserNavigate(args || {}, id);
        break;

      case 'browser_screenshot':
        await this.toolBrowserScreenshot(args || {}, id);
        break;

      case 'browser_quit':
        await this.toolBrowserQuit(args || {}, id);
        break;

      default:
        this.sendError(id, ErrorCode.METHOD_NOT_FOUND, `Unknown tool: ${name}`);
    }
  }

  /**
   * Tool: browser_launch
   */
  private async toolBrowserLaunch(args: any, id: string | number | null): Promise<void> {
    try {
      const headless = args.headless === true;
      
      logger.info(`MCP Server: Launching browser (headless: ${headless})...`);
      
      await browserManager.launch({ headless });

      const resultText = `Browser launched (headless: ${headless})`;
      
      this.sendResult(id, {
        content: [
          {
            type: 'text',
            text: resultText,
          },
        ],
      });

      logger.info('MCP Server: Browser launched successfully');
    } catch (error: any) {
      logger.error(`MCP Server: Error launching browser: ${error.message}`);
      this.sendError(id, ErrorCode.INTERNAL_ERROR, `Failed to launch browser: ${error.message}`);
    }
  }

  /**
   * Tool: browser_navigate
   */
  private async toolBrowserNavigate(args: any, id: string | number | null): Promise<void> {
    try {
      const { url } = args;

      if (!url || typeof url !== 'string') {
        this.sendError(id, ErrorCode.INVALID_PARAMS, 'Missing or invalid "url" parameter');
        return;
      }

      logger.info(`MCP Server: Navigating to ${url}...`);
      
      await browserManager.navigate(url);

      this.sendResult(id, {
        content: [
          {
            type: 'text',
            text: `Navigated to ${url}`,
          },
        ],
      });

      logger.info('MCP Server: Navigation successful');
    } catch (error: any) {
      logger.error(`MCP Server: Error navigating: ${error.message}`);
      
      // Check if error is due to browser not being launched
      if (error.message.includes('not launched') || error.message.includes('No browser')) {
        this.sendError(id, ErrorCode.INTERNAL_ERROR, 'Browser not launched. Call browser_launch first.');
      } else {
        this.sendError(id, ErrorCode.INTERNAL_ERROR, `Failed to navigate: ${error.message}`);
      }
    }
  }

  /**
   * Tool: browser_screenshot
   */
  private async toolBrowserScreenshot(args: any, id: string | number | null): Promise<void> {
    try {
      const { filename, returnBase64, fullPage } = args;

      logger.info(`MCP Server: Taking screenshot (filename: ${filename || 'none'}, base64: ${returnBase64 || false}, fullPage: ${fullPage || false})...`);

      const options: any = {
        fullPage: fullPage === true,
      };

      let screenshotPath: string | undefined;
      let base64Data: string | undefined;

      // If filename is provided, save to file
      if (filename && typeof filename === 'string') {
        screenshotPath = path.join(config.screenshotDir, filename);
        
        // Ensure screenshot directory exists
        await ensureDir(config.screenshotDir);
        
        options.path = screenshotPath;
      }

      // If returnBase64 is true, also return base64
      if (returnBase64 === true) {
        options.encoding = 'base64';
        const buffer = await browserManager.screenshot(options);
        base64Data = buffer.toString('base64');
      } else {
        await browserManager.screenshot(options);
      }

      // Build result text
      let resultText = '';
      if (screenshotPath) {
        resultText += `Screenshot saved to ${screenshotPath}`;
      }
      if (base64Data) {
        if (resultText) resultText += ' and ';
        resultText += `returned as base64 (${base64Data.length} chars)`;
      }
      if (!resultText) {
        resultText = 'Screenshot captured';
      }

      this.sendResult(id, {
        content: [
          {
            type: 'text',
            text: resultText,
          },
        ],
      });

      logger.info('MCP Server: Screenshot successful');
    } catch (error: any) {
      logger.error(`MCP Server: Error taking screenshot: ${error.message}`);
      
      // Check if error is due to browser not being launched
      if (error.message.includes('not launched') || error.message.includes('No browser')) {
        this.sendError(id, ErrorCode.INTERNAL_ERROR, 'Browser not launched. Call browser_launch first.');
      } else {
        this.sendError(id, ErrorCode.INTERNAL_ERROR, `Failed to take screenshot: ${error.message}`);
      }
    }
  }

  /**
   * Tool: browser_quit
   */
  private async toolBrowserQuit(args: any, id: string | number | null): Promise<void> {
    try {
      logger.info('MCP Server: Closing browser session...');
      
      await browserManager.shutdown();

      this.sendResult(id, {
        content: [
          {
            type: 'text',
            text: 'Browser session closed',
          },
        ],
      });

      logger.info('MCP Server: Browser session closed successfully');
    } catch (error: any) {
      logger.error(`MCP Server: Error closing browser: ${error.message}`);
      this.sendError(id, ErrorCode.INTERNAL_ERROR, `Failed to close browser: ${error.message}`);
    }
  }

  /**
   * Send JSON-RPC success result to stdout
   */
  private sendResult(id: string | number | null, result: any): void {
    const response: JSONRPCResponse = {
      jsonrpc: '2.0',
      id,
      result,
    };

    // Write to stdout (NOT stderr - this is the JSON-RPC channel)
    process.stdout.write(JSON.stringify(response) + '\n');
    
    logger.debug(`MCP Server: Sent result for id: ${id}`);
  }

  /**
   * Send JSON-RPC error to stdout
   */
  private sendError(
    id: string | number | null,
    code: number,
    message: string,
    data?: any
  ): void {
    const response: JSONRPCResponse = {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        ...(data !== undefined && { data }),
      },
    };

    // Write to stdout (NOT stderr - this is the JSON-RPC channel)
    process.stdout.write(JSON.stringify(response) + '\n');
    
    logger.debug(`MCP Server: Sent error for id: ${id}, code: ${code}, message: ${message}`);
  }
}

/**
 * Main entry point for MCP server
 */
if (require.main === module) {
  const server = new MCPServer();
  server.start().catch((error) => {
    logger.error('Fatal error starting MCP server', error);
    process.exit(1);
  });
}
