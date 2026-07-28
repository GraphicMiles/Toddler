import { parseUnifiedDiff, summarizeUnifiedDiff } from '../patch/unifiedDiff.js';

const STOP = new Set(['the', 'and', 'for', 'this', 'that', 'with', 'from', 'into', 'fix', 'change', 'update', 'implement', 'please']);
const SECURITY_PATTERNS = [
  { severity: 'high', id: 'dynamic-execution', expression: /\b(eval|new Function|exec)\s*\(/, message: 'Adds dynamic code execution.' },
  { severity: 'high', id: 'unsafe-html', expression: /dangerouslySetInnerHTML|\.innerHTML\s*=/, message: 'Adds raw HTML injection behavior.' },
  { severity: 'high', id: 'credential-access', expression: /\.env|id_rsa|id_ed25519|credentials|private[_-]?key/i, message: 'Adds access to credential-like data.' },
  { severity: 'medium', id: 'network', expression: /\bfetch\s*\(|WebSocket\s*\(|https?:\/\//, message: 'Adds network behavior that needs explicit justification.' },
  { severity: 'medium', id: 'shell', expression: /child_process|Runtime\.getRuntime|ProcessBuilder|\bexecFile\b/, message: 'Adds process or shell execution behavior.' },
  { severity: 'medium', id: 'broad-permission', expression: /MANAGE_EXTERNAL_STORAGE|READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE/, message: 'Adds broad Android storage permission.' },
];

function words(value) {
  return new Set(String(value || '').toLowerCase().split(/[^a-z0-9_.-]+/).filter(word => word.length > 2 && !STOP.has(word)));
}

export function shouldEchoRequirements(message = '') {
  const value = String(message);
  const reversals = value.match(/\b(actually|wait|no,?|scrap that|instead|change of plan|forget that)\b/gi) || [];
  return value.length >= 700 || reversals.length >= 2 || /\b(think out loud|voice note|dictat)/i.test(value);
}

export function buildRequirementsEcho(message = '') {
  const sentences = String(message).split(/(?<=[.!?])\s+|\n+/).map(sentence => sentence.trim()).filter(Boolean);
  const reversals = sentences.filter(sentence => /\b(actually|wait|scrap that|instead|change of plan|forget that)\b/i.test(sentence));
  const locked = sentences.filter(sentence => /\b(must|should|need|never|only|require|constraint|priority)\b/i.test(sentence));
  const open = sentences.filter(sentence => sentence.endsWith('?') || /\b(maybe|unsure|not sure|decide later)\b/i.test(sentence));
  return {
    mission: sentences[0] || 'Clarify the requested work.',
    locked: locked.slice(0, 10),
    open: open.slice(0, 8),
    reversals: reversals.slice(0, 8),
    assumptions: ['No file change should begin until this brief is confirmed.'],
  };
}

export function reviewPatchDeterministically({ request, patch, enabledSkillIds = [] }) {
  const enabled = new Set(enabledSkillIds);
  const parsed = parseUnifiedDiff(patch);
  const summary = summarizeUnifiedDiff(patch);
  const issues = [];
  const suggestions = [];

  if (enabled.has('scope-creep-detector')) {
    const intent = words(request);
    for (const file of summary) {
      const pathWords = words(file.path);
      const overlaps = [...pathWords].some(word => intent.has(word) || [...intent].some(term => word.includes(term) || term.includes(word)));
      const sensitiveScope = /(^|\/)(package(-lock)?\.json|\.github|android\/|.*\.gradle|.*\.ya?ml|.*\.toml)$/i.test(file.path);
      if (!overlaps && summary.length > 1) issues.push({ skill: 'scope-creep-detector', severity: 'medium', path: file.path, message: 'Changed path has no clear vocabulary link to the stated request; split or justify it.' });
      if (sensitiveScope && !/\b(dependency|build|android|workflow|config|package)\b/i.test(request)) issues.push({ skill: 'scope-creep-detector', severity: 'high', path: file.path, message: 'Patch changes dependency/build/configuration scope not named in the request.' });
      if (file.additions + file.deletions > 200) issues.push({ skill: 'scope-creep-detector', severity: 'medium', path: file.path, message: 'Large patch hunk should be split or explicitly justified.' });
    }
  }

  if (enabled.has('security-reviewer')) {
    for (const file of parsed) {
      for (const hunk of file.hunks) {
        for (const line of hunk.lines.filter(item => item.type === '+')) {
          for (const pattern of SECURITY_PATTERNS) {
            if (pattern.expression.test(line.content)) issues.push({ skill: 'security-reviewer', severity: pattern.severity, path: file.newPath, message: pattern.message, evidence: line.content.slice(0, 160) });
          }
        }
      }
    }
  }

  if (enabled.has('test-planner')) {
    for (const file of summary) {
      if (/\.(js|jsx|ts|tsx)$/.test(file.path) && !/\.(test|spec)\./.test(file.path)) suggestions.push(`Add or update a focused test for ${file.path}.`);
      if (/\.(java|kt|cpp)$/.test(file.path)) suggestions.push(`Run the Android unit/native build checks covering ${file.path}.`);
    }
    if (!summary.some(file => /\.(test|spec)\./.test(file.path))) suggestions.push('No test file is changed; verify whether the behavior needs a regression test.');
  }

  const blocking = issues.some(issue => issue.severity === 'high' || issue.severity === 'critical');
  return { verdict: blocking ? 'revise' : 'pass', issues, suggestions: [...new Set(suggestions)], summary };
}

export function reviewCreatedFileDeterministically({ request, path, content, enabledSkillIds = [] }) {
  const enabled = new Set(enabledSkillIds);
  const issues = [];
  const suggestions = [];
  if (enabled.has('scope-creep-detector')) {
    const requestedNames = String(request).toLowerCase();
    if (!requestedNames.includes(path.split('/').pop().toLowerCase())) {
      issues.push({ skill: 'scope-creep-detector', severity: 'medium', path, message: 'Proposed filename was not explicitly named in the request.' });
    }
  }
  if (enabled.has('security-reviewer')) {
    for (const line of String(content).split('\n')) {
      for (const pattern of SECURITY_PATTERNS) {
        if (pattern.expression.test(line)) issues.push({ skill: 'security-reviewer', severity: pattern.severity, path, message: pattern.message, evidence: line.slice(0, 160) });
      }
    }
  }
  if (enabled.has('test-planner')) suggestions.push(`Verify ${path} is referenced by the intended HTML/component and renders as expected.`);
  const blocking = issues.some(issue => issue.severity === 'high' || issue.severity === 'critical');
  return { verdict: blocking ? 'revise' : 'pass', issues, suggestions, summary: [{ path, additions: String(content).split('\n').length, deletions: 0 }] };
}

export function formatReviewForModel(review) {
  const issueText = review.issues.length
    ? review.issues.map(issue => `- [${issue.severity}] ${issue.path}: ${issue.message}${issue.evidence ? ` Evidence: ${issue.evidence}` : ''}`).join('\n')
    : '- No deterministic issue detected.';
  const tests = review.suggestions.length ? review.suggestions.map(item => `- ${item}`).join('\n') : '- No additional test suggestion.';
  return `Deterministic review verdict: ${review.verdict}\nIssues:\n${issueText}\nTest plan:\n${tests}`;
}
