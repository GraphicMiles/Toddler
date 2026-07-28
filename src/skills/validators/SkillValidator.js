/**
 * SkillValidator Interface
 * Pluggable validation rules for skill packages
 */

export class SkillValidator {
  constructor(options = {}) {
    this.options = options;
  }

  getName() {
    return this.constructor.name;
  }

  getDescription() {
    return 'Base validator';
  }

  /**
   * @param {Object} skill - Skill manifest
   * @param {Object} files - { path: content }
   * @returns {{ verdict: 'pass'|'review'|'reject', findings: Array, summary: Object }}
   */
  validate(skill, files = {}) {
    throw new Error('validate() must be implemented by subclass');
  }

  isEnabled() {
    return this.options.enabled !== false;
  }
}

// Base findings helper
export function createFinding(id, severity, message, path = '') {
  return { id, severity, message, path };
}