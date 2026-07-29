import { StrictSecurityScanner } from './StrictSecurityScanner.js';
import { BasicSyntaxChecker } from './BasicSyntaxChecker.js';
import { PassthroughValidator } from './PassthroughValidator.js';

const VALIDATORS = {
  'strict-security': StrictSecurityScanner,
  'basic-syntax': BasicSyntaxChecker,
  'passthrough': PassthroughValidator,
};

const CONFIG_KEY = 'forgeai_skill_validators';
const TRUSTED_SOURCES_KEY = 'forgeai_trusted_skill_sources';

export class ValidatorRegistry {
  constructor() {
    this.validators = new Map();
    this.activeValidators = [];
    this.trustedSources = new Set();
    this.loadConfig();
  }

  loadConfig() {
    if (typeof localStorage === 'undefined') {
      this._loadDefaults();
      return;
    }

    try {
      const config = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}');
      
      // Load active validators
      const active = config.active || ['strict-security'];
      this.activeValidators = active;

      // Instantiate validators
      this.validators.clear();
      for (const key of active) {
        const ValidatorClass = VALIDATORS[key];
        if (ValidatorClass) {
          this.validators.set(key, new ValidatorClass());
        }
      }

      // Load trusted sources
      const trusted = JSON.parse(localStorage.getItem(TRUSTED_SOURCES_KEY) || '[]');
      this.trustedSources = new Set(trusted);
    } catch {
      console.warn('Failed to load validator config, using defaults');
      this._loadDefaults();
    }
  }

  _loadDefaults() {
    this.activeValidators = ['strict-security'];
    this.validators.set('strict-security', new StrictSecurityScanner());
    this.trustedSources = new Set();
  }

  saveConfig() {
    if (typeof localStorage === 'undefined') return;

    const config = {
      active: this.activeValidators,
      options: {},
    };

    for (const [key, validator] of this.validators) {
      config.options[key] = validator.options || {};
    }

    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    localStorage.setItem(TRUSTED_SOURCES_KEY, JSON.stringify([...this.trustedSources]));
  }

  // === Validator Management ===
  setActiveValidators(keys) {
    this.activeValidators = keys.filter(k => VALIDATORS[k]);
    this.validators.clear();

    for (const key of this.activeValidators) {
      const ValidatorClass = VALIDATORS[key];
      if (ValidatorClass) {
        this.validators.set(key, new ValidatorClass());
      }
    }
    this.saveConfig();
  }

  getActiveValidators() {
    return this.activeValidators;
  }

  getAllAvailableValidators() {
    return Object.keys(VALIDATORS);
  }

  // === Trusted Sources ===
  addTrustedSource(source) {
    this.trustedSources.add(source);
    this.saveConfig();
  }

  removeTrustedSource(source) {
    this.trustedSources.delete(source);
    this.saveConfig();
  }

  isTrustedSource(source) {
    return this.trustedSources.has(source);
  }

  // === Main Validation ===
  validate(skill, files = {}, _options = {}) {
    const results = [];
    let finalVerdict = 'pass';

    // Check for trusted pragma
    const hasTrustedPragma = Object.values(files).some(content =>
      String(content).includes('// @forgeai-trusted')
    );

    if (hasTrustedPragma) {
      return {
        verdict: 'pass',
        findings: [],
        summary: { critical: 0, warnings: 0, info: 0 },
        skipped: true,
        reason: 'Trusted pragma detected',
        validators: ['passthrough'],
      };
    }

    // Run all active validators
    for (const [_name, validator] of this.validators) {
      if (!validator.isEnabled()) continue;

      const result = validator.validate(skill, files);
      results.push(result);

      // Combine verdicts (reject > review > pass)
      if (result.verdict === 'reject') finalVerdict = 'reject';
      else if (result.verdict === 'review' && finalVerdict !== 'reject') finalVerdict = 'review';
    }

    // Merge all findings
    const allFindings = results.flatMap(r => r.findings);
    const critical = allFindings.filter(f => f.severity === 'critical').length;
    const warnings = allFindings.filter(f => f.severity === 'warning').length;

    return {
      verdict: finalVerdict,
      findings: allFindings,
      summary: { critical, warnings, info: allFindings.length - critical - warnings },
      validators: this.activeValidators,
      results,
    };
  }
}

export const validatorRegistry = new ValidatorRegistry();