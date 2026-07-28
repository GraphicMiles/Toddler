const MAX_FILE_BYTES = 1_000_000;
const SCRIPT_EXTENSIONS = /\.(?:js|mjs|cjs|ts|py|sh|bash|zsh|ps1|rb|pl)$/i;
const PATTERNS = Object.freeze([
  { id: 'REMOTE_SHELL', severity: 'critical', expression: /(?:curl|wget)[^\n|]{0,200}\|\s*(?:ba|z|fi)?sh\b/i, message: 'Downloads remote content directly into a shell.' },
  { id: 'DYNAMIC_EXEC', severity: 'critical', expression: /\b(?:eval|exec|new\s+Function)\s*\(/i, message: 'Uses dynamic code execution.' },
  { id: 'CREDENTIAL_ACCESS', severity: 'critical', expression: /(?:\.ssh|id_rsa|id_ed25519|\.aws\/credentials|\.netrc|\.npmrc|\.pypirc)/i, message: 'References credential-bearing files.' },
  { id: 'ENV_ENUMERATION', severity: 'warning', expression: /(?:Object\.(?:keys|entries)\(process\.env\)|os\.environ\.(?:items|copy)\(|printenv\b)/i, message: 'Enumerates the process environment.' },
  { id: 'NETWORK', severity: 'warning', expression: /(?:\bfetch\s*\(|\baxios\b|https?:\/\/|socket\.|WebSocket\s*\()/i, message: 'Contains network behavior.' },
  { id: 'OBFUSCATION', severity: 'warning', expression: /(?:base64|b64decode|fromhex|atob\s*\()/i, message: 'Contains encoded or obfuscated content handling.' },
]);

export function scanSkillPackage(skill, files = {}) {
  const findings = [];
  const declaredNetwork = skill?.permissions?.network === true;
  for (const [path, raw] of Object.entries(files)) {
    const content = String(raw ?? '');
    if (new TextEncoder().encode(content).byteLength > MAX_FILE_BYTES) {
      findings.push({ path, id: 'FILE_TOO_LARGE', severity: 'critical', message: 'Skill file exceeds the scanner limit.' });
      continue;
    }
    if (SCRIPT_EXTENSIONS.test(path)) {
      findings.push({ path, id: 'ANDROID_SCRIPT_DISABLED', severity: 'info', message: 'Android stores skill scripts as inert resources and never executes them.' });
    }
    for (const pattern of PATTERNS) {
      if (!pattern.expression.test(content)) continue;
      const severity = pattern.id === 'NETWORK' && declaredNetwork ? 'info' : pattern.severity;
      findings.push({ path, id: pattern.id, severity, message: pattern.message });
    }
  }
  const critical = findings.filter(finding => finding.severity === 'critical').length;
  const warnings = findings.filter(finding => finding.severity === 'warning').length;
  return {
    findings,
    summary: { critical, warnings, info: findings.length - critical - warnings },
    verdict: critical ? 'reject' : warnings ? 'review' : 'pass',
  };
}
