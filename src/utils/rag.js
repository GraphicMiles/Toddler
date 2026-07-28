/**
 * RAG (Retrieval-Augmented Generation) Utility
 * 
 * Provides safe, efficient file content retrieval for the AI.
 * - Limits total context size to prevent token overflow.
 * - Prioritizes selected file + search matches.
 * - Never reads more than MAX_FILES or MAX_TOTAL_CHARS.
 */

import { buildFileIndex, searchFiles } from './fileIndex.js';

const MAX_FILES = 4;
const MAX_TOTAL_CHARS = 12000; // ~3k tokens rough estimate
const MAX_FILE_CHARS = 4000;   // per file limit

/**
 * Retrieve relevant file contents from the workspace.
 * Returns an array of { path, content, relevance }
 */
export async function retrieveRelevantContext({
  query = '',
  workspaceTree = [],
  selectedPath = '',
  workspaceProvider = null,
  maxFiles = MAX_FILES,
} = {}) {
  if (!workspaceProvider || !workspaceTree.length) {
    return [];
  }

  const index = buildFileIndex(workspaceTree);
  let candidates = [];

  // 1. Highest priority: the currently selected file
  if (selectedPath) {
    const selectedFile = index.allFiles.find(f => f.path === selectedPath);
    if (selectedFile) {
      candidates.push({ ...selectedFile, priority: 100 });
    }
  }

  // 2. Search-based candidates
  if (query.trim()) {
    const searchResults = searchFiles(query, workspaceTree);
    for (const result of searchResults) {
      if (result.type !== 'folder') {
        candidates.push({ ...result, priority: 80 });
      }
    }
  }

  // 3. Fallback: recent/common files (top 5 by name)
  if (candidates.length < 3) {
    const sorted = [...index.allFiles]
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 5);
    for (const f of sorted) {
      candidates.push({ ...f, priority: 30 });
    }
  }

  // Deduplicate + sort by priority
  const seen = new Set();
  candidates = candidates
    .filter(c => {
      if (seen.has(c.path)) return false;
      seen.add(c.path);
      return true;
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, maxFiles);

  // Read file contents (with limits)
  const results = [];
  let totalChars = 0;

  for (const candidate of candidates) {
    if (totalChars >= MAX_TOTAL_CHARS) break;

    try {
      const rawContent = await workspaceProvider.readText(candidate.path);
      if (!rawContent) continue;

      let content = String(rawContent);
      if (content.length > MAX_FILE_CHARS) {
        content = content.slice(0, MAX_FILE_CHARS) + '\n... [truncated]';
      }

      const charCount = content.length;
      if (totalChars + charCount > MAX_TOTAL_CHARS) {
        const remaining = MAX_TOTAL_CHARS - totalChars;
        content = content.slice(0, remaining) + '\n... [truncated for context limit]';
      }

      results.push({
        path: candidate.path,
        name: candidate.name,
        extension: candidate.extension,
        content,
        relevance: candidate.priority >= 80 ? 'high' : candidate.priority >= 50 ? 'medium' : 'low',
      });

      totalChars += content.length;
    } catch (err) {
      console.warn(`RAG: Failed to read ${candidate.path}`, err.message);
    }
  }

  return results;
}

/**
 * Format retrieved context into a clean string for the model prompt.
 */
export function formatContextForPrompt(contextItems = []) {
  if (!contextItems.length) return '';

  let output = '=== RELEVANT WORKSPACE FILES ===\n\n';

  for (const item of contextItems) {
    output += `--- ${item.path} (${item.relevance} relevance) ---\n`;
    output += item.content + '\n\n';
  }

  output += '=== END OF CONTEXT ===\n\n';
  return output;
}