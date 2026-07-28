/**
 * RAG (Retrieval-Augmented Generation) Utility
 * 
 * Provides safe, efficient file content retrieval for the AI.
 * - Limits total context size to prevent token overflow.
 * - Prioritizes selected file + search matches.
 * - Never reads more than MAX_FILES or MAX_TOTAL_CHARS.
 */

import { rankWorkspaceFiles } from '../context/contextEngine.js';
import { WORKSPACE_LIMITS } from '../workspace/workspacePolicy.js';

const MAX_FILES = 4;
const MAX_TOTAL_CHARS = 12000; // ~3k tokens rough estimate
const MAX_FILE_CHARS = 4000;   // per file limit

export function shouldRetrieveWorkspaceContext(query = '', selectedPath = '') {
  const value = query.trim().toLowerCase();
  if (!value) return false;
  if (/^(hi|hello|hey|good (morning|afternoon|evening)|thanks|thank you)[!.? ]*$/.test(value)) return false;
  const selectedName = selectedPath.split('/').pop()?.toLowerCase();
  if (selectedName && value.includes(selectedName)) return true;
  return /\b(code|file|folder|workspace|project|function|class|component|bug|error|fix|debug|review|explain|refactor|implement|rename|delete|search|find|test|build|import|dependency|json|javascript|typescript|python|java|css|html|readme)\b/.test(value)
    || /@[\w./-]+/.test(value)
    || /\b[\w-]+\.(js|jsx|ts|tsx|json|py|java|kt|cpp|c|h|css|html|md|yml|yaml|toml)\b/.test(value);
}

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

  const candidates = rankWorkspaceFiles({
    query,
    workspaceTree,
    selectedPath,
    limit: maxFiles,
  }).map(file => ({
    ...file,
    extension: file.name?.split('.').pop()?.toLowerCase() || 'none',
    priority: file.score,
  }));

  // Read file contents (with limits)
  const results = [];
  let totalChars = 0;

  for (const candidate of candidates) {
    if (totalChars >= MAX_TOTAL_CHARS) break;

    try {
      const rawContent = await workspaceProvider.readText(candidate.path, { maxBytes: WORKSPACE_LIMITS.ragReadBytes });
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