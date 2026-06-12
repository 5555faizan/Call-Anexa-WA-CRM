import React, { useState } from 'react';
import { Brain, Key, Sparkles, Save } from 'lucide-react';

function AISettings({ session, onUpdate, onClose }) {
  const [aiEnabled, setAiEnabled] = useState(session.aiEnabled || false);
  const [aiProvider, setAiProvider] = useState(session.aiProvider || 'none');
  const [aiApiKey, setAiApiKey] = useState(session.aiApiKey || '');
  const [aiModel, setAiModel] = useState(session.aiModel || 'gpt-3.5-turbo');

  const handleSave = () => {
    onUpdate(session.id, {
      aiEnabled,
      aiProvider,
      aiApiKey,
      aiModel
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ai-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><Brain size={24} /> AI Configuration</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="ai-settings-form">
          <div className="setting-row">
            <div className="setting-info">
              <Sparkles size={18} className="icon-muted" />
              <span>Enable AI Responses</span>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={aiEnabled}
                onChange={(e) => setAiEnabled(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>

          {aiEnabled && (
            <>
              <div className="form-group">
                <label>AI Provider</label>
                <select 
                  className="form-select"
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                >
                  <option value="none">None (Manual Mode)</option>
                  <option value="openai">OpenAI (ChatGPT)</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </div>

              {aiProvider !== 'none' && (
                <>
                  <div className="form-group">
                    <label><Key size={16} /> API Key</label>
                    <input 
                      type="password"
                      placeholder={aiProvider === 'openai' ? 'sk-...' : 'AIza...'}
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      className="form-input"
                    />
                    <small className="form-hint">
                      {aiProvider === 'openai' 
                        ? 'Get your key from platform.openai.com'
                        : 'Get your key from ai.google.dev'}
                    </small>
                  </div>

                  {aiProvider === 'openai' && (
                    <div className="form-group">
                      <label>Model</label>
                      <select 
                        className="form-select"
                        value={aiModel}
                        onChange={(e) => setAiModel(e.target.value)}
                      >
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast & Cheap)</option>
                        <option value="gpt-4">GPT-4 (Powerful)</option>
                        <option value="gpt-4-turbo">GPT-4 Turbo (Best)</option>
                      </select>
                    </div>
                  )}
                </>
              )}

              <div className="info-box">
                <strong>💡 How it works:</strong>
                <p>When enabled, the AI will generate intelligent responses based on your system prompt. The agent will use the selected AI provider to understand context and respond naturally.</p>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={18} /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}

export default AISettings;
