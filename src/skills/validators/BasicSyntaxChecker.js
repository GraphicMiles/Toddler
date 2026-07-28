import { SkillValidator, createFinding } from './SkillValidator.js';

export class BasicSyntaxChecker extends SkillValidator {
  getDescription() {
    return 'Minimal syntax and manifest validation. Only checks for obvious errors.';
  }

  validate(skill, files = {}) {
    const findings = [];

    // Basic manifest checks
    if (!skill?.id) {
      findings.push(createFinding('MISSING_ID', 'warning', 'Skill manifest is missing an id.'));
    }
    if (!skill?.name) {
      findings.push(createFinding('MISSING_NAME', 'warning', 'Skill manifest is missing a name.'));
    }
    if (typeof skill.description === 'string' && skill.description.length < 20) {
      findings.push(createFinding('SHORT_DESCRIPTION', 'warning', 'Description is very short.'));
    }

    // Check for obvious syntax issues in files
    for (const [path, raw] of Object.entries(files)) {
      const content = String(raw ?? '');

      // Check for unmatched brackets (very basic)
      const openBraces = (content.match(/\{/g) || []).length;
      const closeBraces = (content.match(/\}/g) || []).length;
      if (openBraces !== closeBraces) {
        findings.push(createFinding('UNMATCHED_BRACES', 'warning', 'Unmatched braces detected.', path));
      }

      // Check for obvious syntax errors in JS/TS
      if (/\.(js|ts|jsx|tsx)$/.test(path)) {
        if (content.includes('import ') && !content.includes('from ')) {
          findings.push(createFinding('BAD_IMPORT', 'warning', 'Suspicious import statement.', path));
        }
      }
    }

    const critical = findings.filter(f => f.severity === 'critical').length;
    const warnings = findings.filter(f => f.severity === 'warning').length;

    return {
      validator: this.getName(),
      findings,
      summary: { critical, warnings, info: findings.length - critical - warnings },
      verdict: critical > 0 ? 'reject' : warnings > 0 ? 'review' : 'pass',
    };
  }
}