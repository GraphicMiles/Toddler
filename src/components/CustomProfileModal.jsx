import { useState } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { saveCustomProfile } from '../models/customPromptProfiles.js';
import './CustomProfileModal.css';

export default function CustomProfileModal({ 
  isOpen, 
  onClose, 
  model = null, 
  existingProfile = null,
  onSave 
}) {
  const [form, setForm] = useState(() => ({
    name: existingProfile?.name || (model ? `${model.name} Custom` : 'New Custom Profile'),
    systemPrompt: existingProfile?.systemPrompt || '',
    userMessageTemplate: existingProfile?.userMessageTemplate || '{{message}}',
    stopTokens: existingProfile?.stopTokens?.join(', ') || '<|im_end|>, </s>',
    contextTokens: existingProfile?.contextTokens || 4096,
    maxOutputTokens: existingProfile?.maxOutputTokens || 512,
    temperature: existingProfile?.temperature || 0.7,
    topP: existingProfile?.topP || 0.95,
    promptTemplate: existingProfile?.promptTemplate || 'chatml',
  }));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const profileData = {
        ...form,
        modelId: model?.id || '',
        stopTokens: form.stopTokens.split(',').map(t => t.trim()).filter(Boolean),
      };

      const saved = saveCustomProfile(profileData);
      
      if (onSave) onSave(saved);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {existingProfile ? 'Edit Custom Profile' : 'Create Custom Profile'}
            {model && <span className="modal-subtitle">for {model.name}</span>}
          </h3>
          <button className="modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          {error && (
            <div className="form-error">
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <div className="form-group">
            <label>Profile Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              placeholder="Creative Writer, Security Researcher, etc."
              required
            />
          </div>

          <div className="form-group">
            <label>System Prompt</label>
            <textarea
              value={form.systemPrompt}
              onChange={e => handleChange('systemPrompt', e.target.value)}
              placeholder="You are a helpful assistant specialized in..."
              rows={4}
            />
            <small className="form-hint">Leave empty for raw model behavior</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Prompt Template</label>
              <select 
                value={form.promptTemplate} 
                onChange={e => handleChange('promptTemplate', e.target.value)}
              >
                <option value="chatml">ChatML</option>
                <option value="llama2">Llama-2</option>
                <option value="plain">Plain Text</option>
              </select>
            </div>

            <div className="form-group">
              <label>Context Window</label>
              <input
                type="number"
                value={form.contextTokens}
                onChange={e => handleChange('contextTokens', parseInt(e.target.value) || 4096)}
                min="512"
                max="32768"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Max Output Tokens</label>
              <input
                type="number"
                value={form.maxOutputTokens}
                onChange={e => handleChange('maxOutputTokens', parseInt(e.target.value) || 512)}
                min="64"
                max="8192"
              />
            </div>

            <div className="form-group">
              <label>Temperature</label>
              <input
                type="number"
                step="0.1"
                value={form.temperature}
                onChange={e => handleChange('temperature', parseFloat(e.target.value) || 0.7)}
                min="0"
                max="2"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Stop Tokens (comma separated)</label>
            <input
              type="text"
              value={form.stopTokens}
              onChange={e => handleChange('stopTokens', e.target.value)}
              placeholder="<|im_end|>, </s>, <|endoftext|>"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              <Save size={14} />
              {saving ? 'Saving...' : (existingProfile ? 'Update Profile' : 'Create Profile')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}