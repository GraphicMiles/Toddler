import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Terminal,
  Zap,
  CheckCircle,
  XCircle,
  Database,
  Clock,
  FileText,
  Edit3,
  Plus,
  GitBranch,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import './AgentReasoningPanel.css';

const iconMap = {
  thought: Brain,
  command: Terminal,
  tool_call: Zap,
  result_success: CheckCircle,
  result_error: XCircle,
  memory: Database,
  file_create: Plus,
  file_edit: Edit3,
  diff: GitBranch,
  default: Clock,
};

// Neutral working-state phrases shown while the agent thinks (kept professional
// to match the app's offline/enterprise tone).
const thinkingPhrases = [
  "Thinking...",
  "Reasoning...",
  "Analyzing...",
  "Working on it...",
  "Synthesizing...",
  "Double-checking...",
];

// Generate retro terminal-style progress bar using block characters
function generateTerminalProgressBar(percent) {
  const totalBlocks = 24;
  const safePercent = Math.min(100, Math.max(0, Number(percent) || 0));
  const filled = Math.floor((safePercent / 100) * totalBlocks);
  const partial = ((safePercent / 100) * totalBlocks) - filled;

  let bar = '';

  // Full blocks
  for (let i = 0; i < filled; i++) {
    bar += '█';
  }

  // Partial block
  if (partial > 0 && filled < totalBlocks) {
    if (partial > 0.66) bar += '▓';
    else if (partial > 0.33) bar += '▒';
    else bar += '░';
  }

  // Empty blocks
  const remaining = totalBlocks - filled - (partial > 0 ? 1 : 0);
  for (let i = 0; i < remaining; i++) {
    bar += '░';
  }

  return bar;
}

export default function AgentReasoningPanel({
  steps = [],
  isThinking = false
}) {
  const [currentPhrase, setCurrentPhrase] = useState(thinkingPhrases[0]);
  // Expanded while streaming; collapsed by default once the turn completes.
  const [expanded, setExpanded] = useState(true);

  // Rotate thinking phrases while agent is thinking
  useEffect(() => {
    if (!isThinking) return;

    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * thinkingPhrases.length);
      setCurrentPhrase(thinkingPhrases[randomIndex]);
    }, 1800);

    return () => clearInterval(interval);
  }, [isThinking]);

  useEffect(() => {
    setExpanded(isThinking);
  }, [isThinking, steps.length]);

  if (!steps.length && !isThinking) return null;

  return (
    <div className={`reasoning-panel ${isThinking ? 'live' : 'complete'}`}>
      <div className="reasoning-header">
        {isThinking ? (
          <>
            <div className="thinking-phrase">
              {currentPhrase}
            </div>
            <div className="thinking-indicator">
              <div className="dot" />
              <div className="dot" />
              <div className="dot" />
            </div>
          </>
        ) : (
          <button
            type="button"
            className="reasoning-toggle"
            onClick={() => setExpanded(value => !value)}
            aria-expanded={expanded}
          >
            <Brain size={13} />
            <span>Reasoning · {steps.length} step{steps.length === 1 ? '' : 's'}</span>
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}
      </div>

      {(isThinking || expanded) && (
      <div className="reasoning-steps">
        <AnimatePresence>
          {steps.map((step, index) => {
            const Icon = iconMap[step.type] || iconMap.default;

            return (
              <motion.div
                key={index}
                className={`reasoning-step ${step.type} ${step.status || ''}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                <div className="step-icon">
                  <Icon size={13} />
                </div>

                <div className="step-content">
                  <div className="step-header">
                    <div className="step-title">
                      {step.title}
                      {step.duration && <span className="duration">({step.duration})</span>}
                    </div>
                    {step.status === 'success' && <CheckCircle size={11} className="status success" />}
                    {step.status === 'error' && <XCircle size={11} className="status error" />}
                  </div>

                  {step.content && <div className="step-text">{step.content}</div>}

                  {/* Diff Preview */}
                  {step.type === 'diff' && step.diff && (
                    <div className="diff-preview">
                      <div className="diff-header">
                        <GitBranch size={11} /> {step.fileName}
                      </div>
                      <pre className="diff-content">{step.diff}</pre>
                    </div>
                  )}

                  {/* Terminal-style Block Progress Bar */}
                  {step.type === 'progress' && (() => {
                    const progress = Math.min(100, Math.max(0, Number(step.progress) || 0));
                    return (
                      <div className="terminal-progress">
                        <div className="progress-text">
                          {step.progressText || 'Processing...'}
                        </div>
                        <div className="progress-bar terminal-blocks">
                          {generateTerminalProgressBar(progress)}
                        </div>
                        <div className="progress-percent">
                          {progress}%
                        </div>
                      </div>
                    );
                  })()}

                  {/* File Preview */}
                  {(step.type === 'file_create' || step.type === 'file_edit') && step.file && (
                    <div className="file-preview-card">
                      <div className="file-header">
                        <FileText size={11} />
                        <span className="file-name">{step.file.name}</span>
                        <span className="file-action">
                          {step.type === 'file_create' ? 'Created' : 'Edited'}
                        </span>
                      </div>
                      {step.file.content && (
                        <pre className="file-content">
                          {step.file.content.length > 280 
                            ? step.file.content.slice(0, 280) + '...' 
                            : step.file.content}
                        </pre>
                      )}
                    </div>
                  )}

                  {/* Command List */}
                  {step.commands && step.commands.length > 0 && (
                    <div className="command-list">
                      {step.commands.map((cmd, i) => (
                        <div key={i} className="command">
                          <span className="command-prefix">$</span> {cmd}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      )}
    </div>
  );
}
