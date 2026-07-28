import { parseStructuredActions, structuredActionPrompt, validateStructuredAction } from './actionProtocol.js';
import { parseUnifiedDiff } from '../patch/unifiedDiff.js';

export function isCodeChangeRequest(message = '') {
  return /\b(fix|implement|change|update|modify|refactor|replace|patch|correct|optimize|remove|rename)\b/i.test(message)
    && /\b(code|file|function|class|component|bug|error|project|workspace|[\w-]+\.(?:js|jsx|ts|tsx|json|py|java|kt|cpp|css|html|md))\b/i.test(message);
}

export async function generatePatchProposal({
  provider,
  model,
  request,
  workspaceContext,
  signal,
  toolNames = [],
}) {
  if (!provider?.stream || !model?.id) throw new Error('A loaded model provider is required for Phase 4.');
  if (!workspaceContext?.trim()) throw new Error('Workspace context is required before proposing a patch.');
  const instruction = `${structuredActionPrompt(toolNames)}\nReturn exactly one propose_patch action for this request. Modify existing text files only. Preserve unrelated code. The patch must use --- a/path and +++ b/path headers and exact context lines.`;
  const messages = [
    { role: 'system', content: instruction },
    { role: 'user', content: `REQUEST:\n${request}\n\nWORKSPACE CONTEXT:\n${workspaceContext}` },
  ];
  let output = '';
  const generationResult = await provider.stream({
    model,
    messages,
    signal,
    onToken: token => { output += token; },
  });
  let actions;
  try {
    actions = parseStructuredActions(output);
  } catch (protocolError) {
    const fenced = output.match(/```diff\s*([\s\S]*?)```/i);
    const directStart = output.indexOf('--- ');
    const patch = fenced?.[1]?.trim() || (directStart >= 0 ? output.slice(directStart).trim() : '');
    if (!patch) throw protocolError;
    const paths = parseUnifiedDiff(patch).map(file => file.newPath);
    actions = [validateStructuredAction({
      type: 'propose_patch',
      paths,
      rationale: 'Local model returned a directly parseable unified diff.',
      patch,
    })];
  }
  const patches = actions.filter(action => action.type === 'propose_patch');
  if (patches.length !== 1) throw new Error('The model did not return exactly one valid patch proposal.');
  return { action: patches[0], raw: output, generationResult };
}
