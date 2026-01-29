/**
 * MCP Smoke Test - End-to-end test of MCP server
 * 
 * This test validates that the MCP server can:
 * - Start and initialize
 * - List all available tools
 * - Execute a complete browser automation workflow
 * 
 * Run with: node --test tests/mcp.smoke.test.ts
 * Or: npm test (if configured)
 */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { McpTestClient } from '../src/mcp/mcpTestClient';

// Global client instance for cleanup
let client: McpTestClient | null = null;

// Cleanup after all tests
after(async () => {
  if (client && client.isRunning()) {
    await client.stop();
  }
});

test('MCP Server Smoke Test', { timeout: 30000 }, async (t) => {
  try {
    // 1. Create and start MCP client
    await t.test('Start MCP server', async () => {
      client = new McpTestClient();
      await client.start();
      assert.ok(client.isRunning(), 'MCP server should be running');
    });

    // 2. Initialize
    await t.test('Send initialize', async () => {
      assert.ok(client, 'Client should be initialized');
      
      const response = await client.call('initialize', {}, 1);
      
      console.log('Initialize response:', JSON.stringify(response, null, 2));
      
      assert.ok(response.result, 'Should have result');
      assert.equal(response.result.protocolVersion, '2024-11-05', 'Protocol version should match');
      assert.ok(response.result.serverInfo, 'Should have serverInfo');
      assert.equal(response.result.serverInfo.name, 'playwright-mcp-framework', 'Server name should match');
      assert.equal(response.result.serverInfo.version, '0.1.0', 'Server version should match');
    });

    // 3. List tools and verify all 7 tools are present
    await t.test('Send tools/list', async () => {
      assert.ok(client, 'Client should be initialized');
      
      const response = await client.call('tools/list', {}, 2);
      
      console.log('Tools/list response:', JSON.stringify(response, null, 2));
      
      assert.ok(response.result, 'Should have result');
      assert.ok(response.result.tools, 'Should have tools array');
      assert.ok(Array.isArray(response.result.tools), 'Tools should be an array');
      
      const toolNames = response.result.tools.map((t: any) => t.name);
      
      // Verify all 7 required tools are present
      const requiredTools = [
        'browser_launch',
        'browser_navigate',
        'browser_find',
        'browser_click',
        'browser_type',
        'browser_screenshot',
        'browser_quit',
      ];
      
      for (const toolName of requiredTools) {
        assert.ok(
          toolNames.includes(toolName),
          `Tool "${toolName}" should be in tools list. Found: ${toolNames.join(', ')}`
        );
      }
      
      console.log(`✓ All ${requiredTools.length} required tools found`);
    });

    // 4. Execute minimal browser automation workflow
    await t.test('Execute browser workflow', async () => {
      assert.ok(client, 'Client should be initialized');
      
      // 4.1 Launch browser (headless)
      const launchResponse = await client.call(
        'tools/call',
        {
          name: 'browser_launch',
          arguments: { headless: true },
        },
        3
      );
      
      console.log('Launch response:', JSON.stringify(launchResponse, null, 2));
      assert.ok(launchResponse.result, 'Launch should have result');
      assert.ok(launchResponse.result.content, 'Launch should have content');
      assert.ok(launchResponse.result.content[0].text.includes('Browser launched'), 'Launch text should confirm success');
      
      // 4.2 Navigate to example.com
      const navigateResponse = await client.call(
        'tools/call',
        {
          name: 'browser_navigate',
          arguments: { url: 'https://example.com' },
        },
        4
      );
      
      console.log('Navigate response:', JSON.stringify(navigateResponse, null, 2));
      assert.ok(navigateResponse.result, 'Navigate should have result');
      assert.ok(navigateResponse.result.content[0].text.includes('Navigated to'), 'Navigate text should confirm success');
      
      // 4.3 Find an element (link)
      const findResponse = await client.call(
        'tools/call',
        {
          name: 'browser_find',
          arguments: { selector: 'a', timeoutMs: 5000 },
        },
        5
      );
      
      console.log('Find response:', JSON.stringify(findResponse, null, 2));
      assert.ok(findResponse.result, 'Find should have result');
      assert.ok(findResponse.result.content, 'Find should have content');
      
      const findText = findResponse.result.content[0].text;
      assert.ok(findText.includes('Found'), 'Find text should indicate element was found');
      assert.ok(findText.includes('<a>'), 'Find text should show tag name is <a>');
      
      // Verify data field contains element info
      if (findResponse.result.data) {
        assert.equal(findResponse.result.data.found, true, 'Element should be found');
        assert.equal(findResponse.result.data.tag, 'a', 'Tag should be "a"');
        assert.ok(findResponse.result.data.text, 'Should have text content');
        console.log(`✓ Found element: tag=${findResponse.result.data.tag}, text="${findResponse.result.data.text}"`);
      }
      
      // 4.4 Take screenshot
      const screenshotResponse = await client.call(
        'tools/call',
        {
          name: 'browser_screenshot',
          arguments: { filename: 'smoke.png', fullPage: false },
        },
        6
      );
      
      console.log('Screenshot response:', JSON.stringify(screenshotResponse, null, 2));
      assert.ok(screenshotResponse.result, 'Screenshot should have result');
      assert.ok(screenshotResponse.result.content[0].text.includes('Screenshot saved'), 'Screenshot text should confirm success');
      
      // 4.5 Quit browser
      const quitResponse = await client.call(
        'tools/call',
        {
          name: 'browser_quit',
          arguments: {},
        },
        7
      );
      
      console.log('Quit response:', JSON.stringify(quitResponse, null, 2));
      assert.ok(quitResponse.result, 'Quit should have result');
      assert.ok(quitResponse.result.content[0].text.includes('Browser session closed'), 'Quit text should confirm success');
      
      console.log('✓ Complete browser workflow executed successfully');
    });

  } catch (error: any) {
    console.error('Test failed with error:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    // Cleanup: stop the server
    if (client && client.isRunning()) {
      console.log('Stopping MCP server...');
      await client.stop();
      console.log('✓ MCP server stopped');
    }
  }
});
