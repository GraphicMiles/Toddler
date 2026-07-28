import { normalizeRelativeWorkspacePath } from '../workspace/workspaceProvider.js';

const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

function diffPath(line, marker) {
  const raw = line.slice(marker.length).split('\t')[0].trim();
  if (!raw || raw === '/dev/null') throw new Error('File creation and deletion patches are not enabled yet.');
  const withoutPrefix = raw.startsWith('a/') || raw.startsWith('b/') ? raw.slice(2) : raw;
  return normalizeRelativeWorkspacePath(withoutPrefix);
}

export function parseUnifiedDiff(text) {
  if (typeof text !== 'string' || text.length === 0 || text.length > 200_000) throw new Error('Unified diff is missing or too large.');
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const files = [];
  let index = 0;

  while (index < lines.length) {
    if (!lines[index].startsWith('--- ')) { index++; continue; }
    const oldPath = diffPath(lines[index], '--- ');
    index++;
    if (index >= lines.length || !lines[index].startsWith('+++ ')) throw new Error(`Missing +++ header for ${oldPath}.`);
    const newPath = diffPath(lines[index], '+++ ');
    if (oldPath !== newPath) throw new Error('Rename patches are not enabled; use the explicit rename action.');
    index++;
    const hunks = [];

    while (index < lines.length && !lines[index].startsWith('--- ')) {
      const match = lines[index].match(HUNK_HEADER);
      if (!match) { index++; continue; }
      const hunk = {
        oldStart: Number(match[1]),
        oldCount: Number(match[2] ?? 1),
        newStart: Number(match[3]),
        newCount: Number(match[4] ?? 1),
        lines: [],
      };
      index++;
      while (index < lines.length && !lines[index].startsWith('@@ ') && !lines[index].startsWith('--- ')) {
        const line = lines[index];
        if (line === '' && index === lines.length - 1) { index++; break; }
        if (line === '\\ No newline at end of file') { index++; continue; }
        const prefix = line[0];
        if (prefix !== ' ' && prefix !== '+' && prefix !== '-') throw new Error(`Invalid unified diff line in ${oldPath}.`);
        hunk.lines.push({ type: prefix, content: line.slice(1) });
        index++;
      }
      const oldCount = hunk.lines.filter(line => line.type !== '+').length;
      const newCount = hunk.lines.filter(line => line.type !== '-').length;
      if (oldCount !== hunk.oldCount || newCount !== hunk.newCount) throw new Error(`Hunk line counts do not match the header for ${oldPath}.`);
      hunks.push(Object.freeze(hunk));
    }
    if (hunks.length === 0) throw new Error(`No hunks found for ${oldPath}.`);
    files.push(Object.freeze({ oldPath, newPath, hunks: Object.freeze(hunks) }));
  }

  if (files.length === 0) throw new Error('No file patches found.');
  const unique = new Set(files.map(file => file.newPath));
  if (unique.size !== files.length) throw new Error('A unified diff must contain only one section per file.');
  return Object.freeze(files);
}

export function applyFilePatch(original, filePatch) {
  const normalized = String(original).replace(/\r\n/g, '\n');
  const hadFinalNewline = normalized.endsWith('\n');
  const source = normalized.split('\n');
  if (hadFinalNewline) source.pop();
  const output = [];
  let sourceIndex = 0;

  for (const hunk of filePatch.hunks) {
    const targetIndex = hunk.oldStart - 1;
    if (targetIndex < sourceIndex || targetIndex > source.length) throw new Error(`Overlapping or out-of-range hunk in ${filePatch.oldPath}.`);
    output.push(...source.slice(sourceIndex, targetIndex));
    sourceIndex = targetIndex;

    for (const line of hunk.lines) {
      if (line.type === ' ') {
        if (source[sourceIndex] !== line.content) throw new Error(`Patch context mismatch in ${filePatch.oldPath} at line ${sourceIndex + 1}.`);
        output.push(source[sourceIndex]);
        sourceIndex++;
      } else if (line.type === '-') {
        if (source[sourceIndex] !== line.content) throw new Error(`Patch deletion mismatch in ${filePatch.oldPath} at line ${sourceIndex + 1}.`);
        sourceIndex++;
      } else {
        output.push(line.content);
      }
    }
  }

  output.push(...source.slice(sourceIndex));
  return output.join('\n') + (hadFinalNewline ? '\n' : '');
}

export function summarizeUnifiedDiff(text) {
  return parseUnifiedDiff(text).map(file => ({
    path: file.newPath,
    additions: file.hunks.flatMap(hunk => hunk.lines).filter(line => line.type === '+').length,
    deletions: file.hunks.flatMap(hunk => hunk.lines).filter(line => line.type === '-').length,
  }));
}

export async function applyUnifiedDiff(workspaceProvider, text) {
  const patches = parseUnifiedDiff(text);
  const prepared = [];
  for (const patch of patches) {
    const original = await workspaceProvider.readText(patch.oldPath);
    prepared.push({ patch, updated: applyFilePatch(original, patch) });
  }

  const receipts = [];
  try {
    for (const item of prepared) {
      const receipt = await workspaceProvider.writeText(item.patch.newPath, item.updated);
      receipts.push({ path: item.patch.newPath, ...receipt });
    }
    for (const item of prepared) {
      const verified = await workspaceProvider.readText(item.patch.newPath);
      if (verified !== item.updated) throw new Error(`Post-apply verification failed for ${item.patch.newPath}.`);
    }
  } catch (error) {
    for (const receipt of [...receipts].reverse()) {
      if (receipt.backupId) await workspaceProvider.restoreBackup(receipt.backupId).catch(() => {});
    }
    throw error;
  }
  return { files: summarizeUnifiedDiff(text), receipts };
}
