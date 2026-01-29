/**
 * MCP Test Client - Client for testing MCP server via stdio transport
 * 
 * This client spawns the MCP server as a child process and communicates
 * via stdin/stdout using JSON-RPC protocol.
 * 
 * Usage:
 *   const client = new McpTestClient();
 *   await client.start();
 *   const response = await client.call('initialize', {});
 *   await client.stop();
 */

import { spawn, ChildProcess } from 'child_process';
import * as readline from 'readline';

/**
 * JSON-RPC response interface
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
 * Pending request tracker
 */
interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timeout: NodeJS.Timeout;
}

/**
 * MCP Test Client
 */
export class McpTestClient {
  private serverProcess: ChildProcess | null = null;
  private pendingRequests: Map<number, PendingRequest> = new Map();
  private nextId = 1;
  private readonly REQUEST_TIMEOUT_MS = 10000; // 10 seconds

  /**
   * Start the MCP server as a child process
   */
  async start(): Promise<void> {
    if (this.serverProcess) {
      throw new Error('MCP server is already running');
    }

    // Spawn server process using ts-node
    this.serverProcess = spawn(process.execPath, [
      '-r',
      'ts-node/register',
      'src/mcp/server.ts',
    ], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr
    });

    // Handle stderr (logs) - just consume them, don't fail
    if (this.serverProcess.stderr) {
      this.serverProcess.stderr.on('data', (data) => {
        // Silently consume stderr logs
        // Could log to console if needed: console.log('[SERVER]', data.toString());
      });
    }

    // Handle stdout (JSON responses) - parse line by line
    if (this.serverProcess.stdout) {
      const rl = readline.createInterface({
        input: this.serverProcess.stdout,
        crlfDelay: Infinity,
      });

      rl.on('line', (line: string) => {
        this.handleResponse(line);
      });
    }

    // Handle process errors
    this.serverProcess.on('error', (error) => {
      console.error('MCP server process error:', error);
      this.rejectAllPending(error);
    });

    // Handle process exit
    this.serverProcess.on('exit', (code, signal) => {
      if (code !== 0 && code !== null) {
        const error = new Error(`MCP server exited with code ${code}`);
        this.rejectAllPending(error);
      }
      this.serverProcess = null;
    });

    // Wait a bit for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  /**
   * Call a JSON-RPC method on the MCP server
   * 
   * @param method - JSON-RPC method name
   * @param params - Method parameters
   * @param id - Optional request ID (auto-generated if not provided)
   * @returns Promise that resolves with the full JSON-RPC response
   */
  async call(method: string, params: any = {}, id?: number): Promise<JSONRPCResponse> {
    if (!this.serverProcess || !this.serverProcess.stdin) {
      throw new Error('MCP server is not running. Call start() first.');
    }

    // Generate ID if not provided
    const requestId = id ?? this.nextId++;

    // Create the JSON-RPC request
    const request = {
      jsonrpc: '2.0',
      method,
      params,
      id: requestId,
    };

    // Create promise for this request
    const promise = new Promise<JSONRPCResponse>((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout after ${this.REQUEST_TIMEOUT_MS}ms for method: ${method}`));
      }, this.REQUEST_TIMEOUT_MS);

      // Store pending request
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout,
      });
    });

    // Send request to server
    const requestJson = JSON.stringify(request) + '\n';
    this.serverProcess.stdin.write(requestJson);

    return promise;
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (!this.serverProcess) {
      return; // Already stopped
    }

    // Close stdin to signal shutdown
    if (this.serverProcess.stdin) {
      this.serverProcess.stdin.end();
    }

    // Wait for process to exit gracefully
    const exitPromise = new Promise<void>((resolve) => {
      if (!this.serverProcess) {
        resolve();
        return;
      }

      this.serverProcess.once('exit', () => {
        resolve();
      });

      // Force kill after 2 seconds if not exited
      setTimeout(() => {
        if (this.serverProcess && !this.serverProcess.killed) {
          this.serverProcess.kill('SIGTERM');
        }
        resolve();
      }, 2000);
    });

    await exitPromise;
    this.serverProcess = null;
  }

  /**
   * Handle incoming JSON-RPC response from server
   */
  private handleResponse(line: string): void {
    if (!line.trim()) {
      return; // Ignore empty lines
    }

    try {
      const response: JSONRPCResponse = JSON.parse(line);

      // Find pending request by ID
      const requestId = typeof response.id === 'number' ? response.id : null;
      if (requestId === null) {
        console.warn('Received response with null ID:', response);
        return;
      }

      const pending = this.pendingRequests.get(requestId);
      if (!pending) {
        console.warn(`Received response for unknown request ID: ${requestId}`);
        return;
      }

      // Clear timeout
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(requestId);

      // Resolve or reject based on response
      if (response.error) {
        pending.reject(new Error(`JSON-RPC error ${response.error.code}: ${response.error.message}`));
      } else {
        pending.resolve(response);
      }
    } catch (error: any) {
      console.error('Failed to parse JSON-RPC response:', line, error.message);
    }
  }

  /**
   * Reject all pending requests (called on process error/exit)
   */
  private rejectAllPending(error: Error): void {
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.serverProcess !== null && !this.serverProcess.killed;
  }
}
