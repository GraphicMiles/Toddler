/**
 * SafetyPolicy - Configurable safety system for ForgeAI
 * Supports enterprise compliance levels and power-user flexibility
 */

// No external import needed - virtualWorkspace used only as optional fallback

const DEFAULT_POLICY = Object.freeze({
  level: 'strict',
  enabled: true,
  rules: {
    // Skill scanner rules
    skillScanner: {
      enabled: true,
      blockCritical: true,
      blockWarnings: false,
      maxFileBytes: 1_000_000,
      allowNetworkInSkills: false,
    },
    // Patch / code change validation
    patchValidation: {
      enabled: true,
      requireUnifiedDiff: true,
      maxPatchSize: 200_000,
      requireContextSelection: true,
      blockLargeFiles: true,
      maxFileWriteBytes: 2 * 1024 * 1024,
    },
    // Terminal / shell restrictions (Full Autonomy)
    terminal: {
      enabled: true,
      allowArbitraryCommands: false,
      maxTimeoutSeconds: 120,
      blockDangerousPatterns: true,
      allowedCommands: ['ls', 'cat', 'echo', 'pwd', 'git', 'npm', 'node'],
      blockedPatterns: [
        'rm -rf', 'curl.*|.*sh', 'wget.*|.*sh', 'sudo', 'chmod 777',
        'dd if=', 'mkfs', 'format', ':(){ :|:& };:', 'eval', 'exec'
      ],
    },
    // Workspace safety
    workspace: {
      enabled: true,
      blockSensitivePaths: true,
      maxReadBytes: 2 * 1024 * 1024,
      maxWriteBytes: 2 * 1024 * 1024,
    },
    // Model & generation limits
    model: {
      enabled: true,
      minModelSizeForCode: 500, // MB
      blockSmokeTestForCode: true,
    },
    // Autonomy level enforcement
    autonomy: {
      requireApprovalForWrites: true,
      requireApprovalForTerminal: true,
      requireApprovalForGit: true,
    },
  },
  metadata: {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    description: 'Default strict enterprise policy',
  },
});

const POLICY_LEVELS = Object.freeze({
  STRICT: 'strict',
  MODERATE: 'moderate',
  MINIMAL: 'minimal',
  UNRESTRICTED: 'unrestricted',
});

export class SafetyPolicy {
  constructor(config = DEFAULT_POLICY) {
    this.config = this._mergeWithDefaults(config);
    this.level = this.config.level;
    this.enabled = this.config.enabled;
    Object.freeze(this);
  }

  _mergeWithDefaults(userConfig) {
    const merged = JSON.parse(JSON.stringify(DEFAULT_POLICY));
    
    if (userConfig.level) merged.level = userConfig.level;
    if (typeof userConfig.enabled === 'boolean') merged.enabled = userConfig.enabled;

    // Deep merge rules
    if (userConfig.rules) {
      for (const [category, rules] of Object.entries(userConfig.rules)) {
        if (!merged.rules[category]) merged.rules[category] = {};
        Object.assign(merged.rules[category], rules);
      }
    }

    if (userConfig.metadata) {
      merged.metadata = { ...merged.metadata, ...userConfig.metadata };
    }

    return merged;
  }

  // === Core Checks ===

  isEnabled() {
    return this.enabled && this.level !== POLICY_LEVELS.UNRESTRICTED;
  }

  getLevel() {
    return this.level;
  }

  isUnrestricted() {
    return this.level === POLICY_LEVELS.UNRESTRICTED;
  }

  // === Skill Scanner Policy ===

  shouldScanSkills() {
    return this.isEnabled() && this.config.rules.skillScanner?.enabled !== false;
  }

  shouldBlockSkillCritical() {
    if (this.isUnrestricted()) return false;
    return this.config.rules.skillScanner?.blockCritical !== false;
  }

  shouldBlockSkillWarnings() {
    if (this.isUnrestricted()) return false;
    return this.config.rules.skillScanner?.blockWarnings === true;
  }

  getMaxSkillFileBytes() {
    return this.config.rules.skillScanner?.maxFileBytes || DEFAULT_POLICY.rules.skillScanner.maxFileBytes;
  }

  // === Patch Validation Policy ===

  shouldValidatePatches() {
    return this.isEnabled() && this.config.rules.patchValidation?.enabled !== false;
  }

  requireUnifiedDiff() {
    return this.config.rules.patchValidation?.requireUnifiedDiff !== false;
  }

  getMaxPatchSize() {
    return this.config.rules.patchValidation?.maxPatchSize || DEFAULT_POLICY.rules.patchValidation.maxPatchSize;
  }

  requireContextForPatch() {
    if (this.isUnrestricted()) return false;
    return this.config.rules.patchValidation?.requireContextSelection !== false;
  }

  shouldBlockLargeFileWrites() {
    return this.config.rules.patchValidation?.blockLargeFiles !== false;
  }

  // === Terminal / Shell Policy ===

  shouldRestrictTerminal() {
    return this.isEnabled() && this.config.rules.terminal?.enabled !== false;
  }

  allowArbitraryTerminalCommands() {
    return this.isUnrestricted() || this.config.rules.terminal?.allowArbitraryCommands === true;
  }

  getTerminalMaxTimeout() {
    return this.config.rules.terminal?.maxTimeoutSeconds || 120;
  }

  isTerminalCommandAllowed(command = '') {
    if (this.isUnrestricted()) return true;
    if (!this.shouldRestrictTerminal()) return true;

    const cmdLower = command.toLowerCase().trim();
    const blocked = this.config.rules.terminal?.blockedPatterns || [];

    for (const pattern of blocked) {
      if (cmdLower.includes(pattern.toLowerCase())) return false;
    }
    return true;
  }

  // === Workspace Policy ===

  shouldEnforceWorkspacePolicy() {
    return this.isEnabled() && this.config.rules.workspace?.enabled !== false;
  }

  shouldBlockSensitivePaths() {
    return this.config.rules.workspace?.blockSensitivePaths !== false;
  }

  getMaxReadBytes() {
    return this.config.rules.workspace?.maxReadBytes || DEFAULT_POLICY.rules.workspace.maxReadBytes;
  }

  getMaxWriteBytes() {
    return this.config.rules.workspace?.maxWriteBytes || DEFAULT_POLICY.rules.workspace.maxWriteBytes;
  }

  // === Model Safety ===

  shouldEnforceModelSafety() {
    return this.isEnabled() && this.config.rules.model?.enabled !== false;
  }

  getMinModelSizeForCode() {
    return this.config.rules.model?.minModelSizeForCode || 500;
  }

  shouldBlockSmokeTestForCode() {
    return this.config.rules.model?.blockSmokeTestForCode !== false;
  }

  // === Autonomy Enforcement ===

  shouldRequireApprovalForWrites() {
    if (this.isUnrestricted()) return false;
    return this.config.rules.autonomy?.requireApprovalForWrites !== false;
  }

  shouldRequireApprovalForTerminal() {
    if (this.isUnrestricted()) return false;
    return this.config.rules.autonomy?.requireApprovalForTerminal !== false;
  }

  shouldRequireApprovalForGit() {
    if (this.isUnrestricted()) return false;
    return this.config.rules.autonomy?.requireApprovalForGit !== false;
  }

  // === Utility ===

  getPolicySummary() {
    return {
      level: this.level,
      enabled: this.enabled,
      unrestricted: this.isUnrestricted(),
      activeRules: Object.keys(this.config.rules).filter(key => 
        this.config.rules[key]?.enabled !== false
      ),
    };
  }

  toJSON() {
    return JSON.parse(JSON.stringify(this.config));
  }
}

// === Policy Factory & Loader ===

let _currentPolicy = null;

export function createSafetyPolicy(configOrLevel) {
  if (typeof configOrLevel === 'string') {
    const levelConfig = getLevelConfig(configOrLevel);
    return new SafetyPolicy(levelConfig);
  }
  return new SafetyPolicy(configOrLevel);
}

export function getLevelConfig(level) {
  const base = JSON.parse(JSON.stringify(DEFAULT_POLICY));
  base.level = level;

  switch (level) {
    case POLICY_LEVELS.STRICT:
      base.rules.skillScanner.blockWarnings = true;
      base.rules.patchValidation.requireContextSelection = true;
      base.rules.terminal.allowArbitraryCommands = false;
      base.rules.terminal.blockDangerousPatterns = true;
      base.rules.autonomy.requireApprovalForWrites = true;
      base.rules.autonomy.requireApprovalForTerminal = true;
      break;

    case POLICY_LEVELS.MODERATE:
      base.rules.skillScanner.blockWarnings = false;
      base.rules.patchValidation.requireContextSelection = true;
      base.rules.terminal.allowArbitraryCommands = false;
      base.rules.terminal.blockDangerousPatterns = true;
      base.rules.autonomy.requireApprovalForWrites = true;
      base.rules.autonomy.requireApprovalForTerminal = false;
      break;

    case POLICY_LEVELS.MINIMAL:
      base.rules.skillScanner.blockWarnings = false;
      base.rules.patchValidation.requireContextSelection = false;
      base.rules.terminal.allowArbitraryCommands = false;
      base.rules.terminal.blockDangerousPatterns = true;
      base.rules.autonomy.requireApprovalForWrites = false;
      base.rules.autonomy.requireApprovalForTerminal = false;
      break;

    case POLICY_LEVELS.UNRESTRICTED:
      base.enabled = true; // still enabled but skips most checks
      base.rules.skillScanner.enabled = false;
      base.rules.patchValidation.enabled = false;
      base.rules.terminal.enabled = false;
      base.rules.workspace.enabled = false;
      base.rules.model.enabled = false;
      base.rules.autonomy.requireApprovalForWrites = false;
      base.rules.autonomy.requireApprovalForTerminal = false;
      base.rules.autonomy.requireApprovalForGit = false;
      break;
  }

  return base;
}

export async function loadSafetyPolicyFromFile() {
  // Try to load from config/safety_policy.json
  // In browser we use virtual workspace; in Android this would be a real file
  try {
    // Attempt to read from virtual workspace first (browser dev)
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem('forgeai_safety_policy');
      if (stored) {
        const parsed = JSON.parse(stored);
        return createSafetyPolicy(parsed);
      }
    }

    // Fallback: default strict policy
    return createSafetyPolicy(POLICY_LEVELS.STRICT);
  } catch (err) {
    console.warn('Failed to load safety_policy.json, falling back to strict:', err);
    return createSafetyPolicy(POLICY_LEVELS.STRICT);
  }
}

export function saveSafetyPolicy(policy) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('forgeai_safety_policy', JSON.stringify(policy.toJSON()));
    }
    _currentPolicy = policy;
    return true;
  } catch (err) {
    console.error('Failed to persist safety policy:', err);
    return false;
  }
}

export function getCurrentSafetyPolicy() {
  if (!_currentPolicy) {
    _currentPolicy = createSafetyPolicy(POLICY_LEVELS.STRICT);
  }
  return _currentPolicy;
}

export function setCurrentSafetyPolicy(policy) {
  _currentPolicy = policy;
}

export { POLICY_LEVELS, DEFAULT_POLICY };