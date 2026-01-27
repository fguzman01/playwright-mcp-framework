/**
 * Filesystem utilities
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Ensure a directory exists, creating it and parent directories if needed
 * Similar to `mkdir -p`
 * 
 * @param dirPath - Path to directory to ensure exists
 * @throws Error if path exists but is not a directory
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    const stats = await fs.promises.stat(dirPath);
    
    if (!stats.isDirectory()) {
      throw new Error(`Path exists but is not a directory: ${dirPath}`);
    }
    
    // Directory already exists
    return;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Directory doesn't exist, create it
      await fs.promises.mkdir(dirPath, { recursive: true });
      return;
    }
    
    // Re-throw other errors
    throw error;
  }
}

/**
 * Check if a path exists
 */
export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get absolute path, resolving relative paths from cwd
 */
export function resolveAbsolute(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
}

/**
 * Clean a directory by removing all files (but keeping the directory)
 * Does not remove subdirectories, only files
 * 
 * @param dirPath - Path to directory to clean
 * @param pattern - Optional glob pattern to match files (e.g., '*.png')
 * @returns Number of files deleted
 */
export async function cleanDirectory(dirPath: string, pattern?: string): Promise<number> {
  try {
    // Check if directory exists
    if (!await pathExists(dirPath)) {
      // Directory doesn't exist, nothing to clean
      return 0;
    }

    const stats = await fs.promises.stat(dirPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${dirPath}`);
    }

    // Read all entries in directory
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    let deletedCount = 0;

    for (const entry of entries) {
      // Only delete files, not subdirectories
      if (entry.isFile()) {
        // If pattern is provided, check if file matches
        if (pattern) {
          const matches = matchesPattern(entry.name, pattern);
          if (!matches) {
            continue; // Skip files that don't match pattern
          }
        }

        const filePath = path.join(dirPath, entry.name);
        await fs.promises.unlink(filePath);
        deletedCount++;
      }
    }

    return deletedCount;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Directory disappeared during operation
      return 0;
    }
    throw error;
  }
}

/**
 * Simple glob pattern matching (supports * wildcard)
 * 
 * @param filename - Filename to test
 * @param pattern - Pattern with * wildcards (e.g., '*.png', 'error-*')
 * @returns True if filename matches pattern
 */
function matchesPattern(filename: string, pattern: string): boolean {
  // Convert glob pattern to regex
  // * becomes .*
  const regexPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
    .replace(/\*/g, '.*'); // Replace * with .*
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filename);
}
