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
  GitBranch
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

// Fun, weird thinking phrases (Claude / Arena style)
const thinkingPhrases = [
  "Flabbergasted by your request...",
  "Cherry-picking the best results...",
  "Burning the midnight oil...",
  "Serving the master...",
  "Doing what I can...",
  "Summoning the code spirits...",
  "Wrestling with the prompt...",
  "Consulting the ancient scrolls...",
  "Channeling my inner AI...",
  "Plotting world domination...",
  "Pretending to understand...",
  "Googling in my mind...",
  "Asking the rubber duck...",
  "Bribing the compiler...",
  "Negotiating with the bugs...",
  "Reading the tea leaves...",
  "Casting spells on the code...",
  "Debating with myself...",
  "Having an existential crisis...",
  "Trying not to panic...",
  "Calculating the meaning of life...",
  "Convincing the electrons to behave...",
  "Whispering sweet nothings to the CPU...",
  "Haggling with the memory allocator...",
  "Performing dark magic on the stack...",
];

// Generate retro terminal-style progress bar using block characters
function generateTerminalProgressBar(percent) {
  const totalBlocks = 24;
  const filled = Math.floor((percent / 100) * totalBlocks);
  const partial = ((percent / 100) * totalBlocks) - filled;

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

  // Rotate fun thinking phrases while agent is thinking
  useEffect(() => {
    if (!isThinking) return;

    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * thinkingPhrases.length);
      setCurrentPhrase(thinkingPhrases[randomIndex]);
    }, 1800);

    return () => clearInterval(interval);
  }, [isThinking]);

  if (!steps.length && !isThinking) return null;

  return (
    <div className="reasoning-panel">
      <div className="reasoning-header">
        {isThinking && (
          <div className="thinking-phrase">
            {currentPhrase}
          </div>
        )}

        {isThinking && (
          <div className="thinking-indicator">
            <div className="dot" />
            <div className="dot" />
            <div className="dot" />
          </div>
        )}
      </div>

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
                  {step.type === 'progress' && (
                    <div className="terminal-progress">
                      <div className="progress-text">
                        {step.progressText || 'Processing...'}
                      </div>
                      <div className="progress-bar terminal-blocks">
                        {generateTerminalProgressBar(step.progress || 0)}
                      </div>
                      <div className="progress-percent">
                        {step.progress || 0}%
                      </div>
                    </div>
                  )}

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
    </div>
  );
}
