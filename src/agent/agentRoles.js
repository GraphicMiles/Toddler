export const AGENT_ROLES = Object.freeze({
  planner: Object.freeze({ id: 'planner', title: 'Planner', allowedTools: ['search', 'read_file'], instructions: 'Frame the request, success criteria, relevant files, and risks. Never write files.' }),
  contextScout: Object.freeze({ id: 'context-scout', title: 'Context Scout', allowedTools: ['search', 'index', 'read_file'], instructions: 'Find the smallest sufficient set of files and symbols. Never write files.' }),
  coder: Object.freeze({ id: 'coder', title: 'Coder', allowedTools: [], instructions: 'Produce a minimal unified diff that preserves unrelated behavior.' }),
  reviewer: Object.freeze({ id: 'reviewer', title: 'Reviewer', allowedTools: ['validate_patch'], instructions: 'Critique correctness, scope, security, and tests. Never apply changes.' }),
  verifier: Object.freeze({ id: 'verifier', title: 'Verifier', allowedTools: ['read_file', 'validate_patch'], instructions: 'Check the approved result and report evidence. Never modify files.' }),
});
