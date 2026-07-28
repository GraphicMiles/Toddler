import { BUILTIN_SKILLS } from './builtinSkills.js';

const STORAGE_KEY = 'forgeai_skills_v1';
const EXTERNAL_STORAGE_KEY = 'forgeai_external_skills_v1';
const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ALLOWED_PERMISSIONS = new Set(['workspaceRead', 'workspaceWrite', 'network', 'execute']);

function readState() {
  if (typeof localStorage === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function writeState(state) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function readExternalSkills() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const value = JSON.parse(localStorage.getItem(EXTERNAL_STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

function writeExternalSkills(skills) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(EXTERNAL_STORAGE_KEY, JSON.stringify(skills));
}

function tokens(value) {
  return new Set(String(value || '').toLowerCase().split(/[^a-z0-9_.-]+/).filter(token => token.length >= 3));
}

export function validateSkillManifest(skill) {
  if (!skill || typeof skill !== 'object') throw new Error('Skill manifest must be an object.');
  if (!NAME_PATTERN.test(skill.id || '')) throw new Error('Skill id must contain lowercase letters, numbers, and single hyphens only.');
  if (typeof skill.name !== 'string' || !skill.name.trim()) throw new Error('Skill name is required.');
  if (typeof skill.description !== 'string' || skill.description.length < 40 || skill.description.length > 1024) throw new Error('Skill description must contain 40-1024 characters.');
  if (!/^\d+\.\d+\.\d+$/.test(skill.version || '')) throw new Error('Skill version must use semantic x.y.z form.');
  if (!Array.isArray(skill.allowedTools)) throw new Error('Skill allowedTools must be an array.');
  if (!skill.permissions || typeof skill.permissions !== 'object') throw new Error('Skill permissions are required.');
  for (const key of Object.keys(skill.permissions)) if (!ALLOWED_PERMISSIONS.has(key)) throw new Error(`Unknown skill permission: ${key}`);
  if (skill.permissions.execute) throw new Error('Android skills cannot request command execution.');
  if (skill.external && skill.permissions.network) throw new Error('External Android skills cannot request network access in local-only mode.');
  return Object.freeze({ ...skill, allowedTools: Object.freeze([...new Set(skill.allowedTools)]) });
}

export class SkillRegistry {
  constructor(skills = BUILTIN_SKILLS) {
    this.skills = new Map();
    for (const skill of skills) {
      const validated = validateSkillManifest(skill);
      this.skills.set(validated.id, validated);
    }
    for (const skill of readExternalSkills()) {
      try {
        const validated = validateSkillManifest({ ...skill, external: true });
        if (!this.skills.has(validated.id)) this.skills.set(validated.id, validated);
      } catch (error) {
        console.warn('Skipped invalid external Android skill:', error.message);
      }
    }
    this.state = readState();
  }

  list() {
    return [...this.skills.values()].map(skill => ({ ...skill, enabled: this.isEnabled(skill.id) }));
  }

  get(id) { return this.skills.get(id) || null; }

  isEnabled(id) { return this.state[id]?.enabled !== false; }

  setEnabled(id, enabled) {
    if (!this.skills.has(id)) throw new Error(`Unknown skill: ${id}`);
    this.state = { ...this.state, [id]: { enabled: Boolean(enabled), updatedAt: Date.now() } };
    writeState(this.state);
    return this.isEnabled(id);
  }

  install(skill, scanReport) {
    if (scanReport?.verdict === 'reject') throw new Error('Skill package was rejected by the Android security scanner.');
    const validated = validateSkillManifest({ ...skill, external: true });
    if (BUILTIN_SKILLS.some(item => item.id === validated.id)) throw new Error('External skills cannot replace a built-in skill.');
    this.skills.set(validated.id, validated);
    writeExternalSkills([...this.skills.values()].filter(item => item.external));
    this.setEnabled(validated.id, false);
    return validated;
  }

  remove(id) {
    const skill = this.skills.get(id);
    if (!skill?.external) throw new Error('Only external skills can be removed.');
    this.skills.delete(id);
    delete this.state[id];
    writeState(this.state);
    writeExternalSkills([...this.skills.values()].filter(item => item.external));
    return true;
  }

  route(message, { limit = 4 } = {}) {
    const prompt = String(message || '').toLowerCase();
    const promptTokens = tokens(prompt);
    return this.list()
      .filter(skill => skill.enabled)
      .map(skill => {
        const descriptionTokens = tokens(`${skill.description} ${(skill.triggers || []).join(' ')}`);
        let score = [...promptTokens].filter(token => descriptionTokens.has(token)).length;
        for (const trigger of skill.triggers || []) if (prompt.includes(trigger.toLowerCase())) score += 3;
        return { skill, score };
      })
      .filter(item => item.score > 0)
      .sort((left, right) => right.score - left.score || left.skill.id.localeCompare(right.skill.id))
      .slice(0, limit)
      .map(item => item.skill);
  }

  instructionsFor(message, options) {
    return this.route(message, options).map(skill => `SKILL ${skill.name}: ${skill.instructions}`).join('\n');
  }
}

export const skillRegistry = new SkillRegistry();
