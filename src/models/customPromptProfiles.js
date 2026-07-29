/**
 * Custom Prompt Profiles System
 * Supports user-created profiles for imported and official models.
 * Profiles are stored as JSON in profiles/custom/
 */

const CUSTOM_PROFILES_KEY = 'forgeai_custom_profiles';
const RAW_MODE_KEY = 'forgeai_raw_mode';

export const DEFAULT_CUSTOM_PROFILE = Object.freeze({
  id: '',
  name: '',
  modelId: '', // can be empty for global profiles
  systemPrompt: '',
  userMessageTemplate: '{{message}}',
  stopTokens: ['<|im_end|>', '</s>', '<|endoftext|>'],
  contextTokens: 4096,
  maxOutputTokens: 512,
  temperature: 0.7,
  topP: 0.95,
  promptTemplate: 'chatml',
  createdAt: null,
  updatedAt: null,
});

export class CustomPromptProfileManager {
  constructor() {
    this.profiles = new Map();
    this.rawMode = false;
    this.loadFromStorage();
  }

  loadFromStorage() {
    if (typeof localStorage === 'undefined') return;

    try {
      // Load custom profiles
      const saved = localStorage.getItem(CUSTOM_PROFILES_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        this.profiles = new Map(data);
      }

      // Load raw mode preference
      this.rawMode = localStorage.getItem(RAW_MODE_KEY) === 'true';
    } catch (error) {
      console.warn('Failed to load custom prompt profiles:', error);
    }
  }

  saveToStorage() {
    if (typeof localStorage === 'undefined') return;

    try {
      localStorage.setItem(CUSTOM_PROFILES_KEY, JSON.stringify(Array.from(this.profiles.entries())));
      localStorage.setItem(RAW_MODE_KEY, this.rawMode.toString());
    } catch (error) {
      console.warn('Failed to save custom prompt profiles:', error);
    }
  }

  // Create or update a custom profile
  saveProfile(profileData) {
    const id = profileData.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    const profile = {
      ...DEFAULT_CUSTOM_PROFILE,
      ...profileData,
      id,
      updatedAt: Date.now(),
      createdAt: profileData.createdAt || Date.now(),
    };

    // Validate
    if (!profile.name?.trim()) {
      throw new Error('Profile name is required');
    }

    this.profiles.set(id, profile);
    this.saveToStorage();
    return profile;
  }

  getProfile(id) {
    return this.profiles.get(id) || null;
  }

  getAllProfiles() {
    return Array.from(this.profiles.values()).sort((a, b) => 
      (b.updatedAt || 0) - (a.updatedAt || 0)
    );
  }

  getProfilesForModel(modelId) {
    return this.getAllProfiles().filter(p => 
      !p.modelId || p.modelId === modelId
    );
  }

  deleteProfile(id) {
    const deleted = this.profiles.delete(id);
    if (deleted) this.saveToStorage();
    return deleted;
  }

  // === Raw Mode (disables system prompt injection) ===
  setRawMode(enabled) {
    this.rawMode = !!enabled;
    this.saveToStorage();
  }

  isRawMode() {
    return this.rawMode;
  }

  // === Profile Resolution ===
  resolveProfileForModel(model, selectedProfileId = null) {
    // Raw mode takes highest priority
    if (this.rawMode) {
      return {
        ...DEFAULT_CUSTOM_PROFILE,
        id: 'raw-mode',
        name: 'Raw Mode',
        systemPrompt: '',
        promptTemplate: 'plain',
      };
    }

    // User-selected custom profile
    if (selectedProfileId) {
      const custom = this.getProfile(selectedProfileId);
      if (custom) return custom;
    }

    // Model-specific custom profiles
    const modelProfiles = this.getProfilesForModel(model?.id);
    if (modelProfiles.length > 0) {
      return modelProfiles[0]; // Most recently updated
    }

    // Fallback to model catalog profile (handled elsewhere)
    return null;
  }

  // Generate formatted prompt using custom profile
  formatWithCustomProfile(messages = [], profile = DEFAULT_CUSTOM_PROFILE) {
    if (this.rawMode || !profile) {
      return messages.map(m => m.content).join('\n\n');
    }

    let result = '';
    const list = [...messages];

    // Inject system prompt if present and not already present
    if (profile.systemPrompt && list[0]?.role !== 'system') {
      list.unshift({ role: 'system', content: profile.systemPrompt });
    }

    const template = profile.promptTemplate || 'chatml';

    if (template === 'chatml') {
      result = list.map(msg => 
        `<|im_start|>${msg.role || 'user'}\n${msg.content}<|im_end|>`
      ).join('\n') + '\n<|im_start|>assistant\n';
    } else if (template === 'llama2') {
      result = list.map(msg => {
        if (msg.role === 'system') return `[INST] <<SYS>>\n${msg.content}\n<</SYS>>\n`;
        if (msg.role === 'user') return `[INST] ${msg.content} [/INST]`;
        return msg.content;
      }).join('\n') + '\n';
    } else if (template === 'plain') {
      result = list.map(msg => `${msg.role || 'user'}: ${msg.content}`).join('\n') + '\nassistant:';
    } else {
      // Default chatml
      result = list.map(msg => 
        `<|im_start|>${msg.role || 'user'}\n${msg.content}<|im_end|>`
      ).join('\n') + '\n<|im_start|>assistant\n';
    }

    return result;
  }
}

// Singleton instance
export const customProfileManager = new CustomPromptProfileManager();

// Convenience exports
export function getCustomProfiles() {
  return customProfileManager.getAllProfiles();
}

export function saveCustomProfile(profile) {
  return customProfileManager.saveProfile(profile);
}

export function deleteCustomProfile(id) {
  return customProfileManager.deleteProfile(id);
}

export function resolveProfile(model, profileId = null) {
  return customProfileManager.resolveProfileForModel(model, profileId);
}

export function isRawModeEnabled() {
  return customProfileManager.isRawMode();
}

export function setRawMode(enabled) {
  customProfileManager.setRawMode(enabled);
}