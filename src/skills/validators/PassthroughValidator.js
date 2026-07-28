import { SkillValidator } from './SkillValidator.js';

export class PassthroughValidator extends SkillValidator {
  getDescription() {
    return 'No validation. All skills are accepted (use with trusted sources only).';
  }

  validate(_skill, _files = {}) {
    return {
      validator: this.getName(),
      findings: [],
      summary: { critical: 0, warnings: 0, info: 0 },
      verdict: 'pass',
      skipped: true,
      reason: 'Passthrough validator (no checks performed)',
    };
  }
}