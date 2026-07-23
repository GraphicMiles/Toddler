import { motion } from 'framer-motion';
import { FileEdit, Terminal, GitBranch, AlertTriangle, Check, X } from 'lucide-react';
import './ActionCard.css';

const ACTION_ICONS = {
  write_file: FileEdit,
  terminal: Terminal,
  git: GitBranch,
  default: AlertTriangle,
};

const ACTION_LABELS = {
  write_file: 'Proposed write',
  terminal: 'Terminal command',
  git: 'Git operation',
  default: 'Action required',
};

export default function ActionCard({ action, onApprove, onDiscard }) {
  const { id, type, path, content, description } = action;
  
  const Icon = ACTION_ICONS[type] || ACTION_ICONS.default;
  const label = ACTION_LABELS[type] || ACTION_LABELS.default;

  // Truncate long content for preview
  const previewContent = content?.length > 500 
    ? content.slice(0, 500) + '...\n\n[truncated]' 
    : content;

  return (
    <motion.div
      className="action-card"
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
      layout
    >
      <div className="action-header">
        <div className="action-label-group">
          <div className="action-icon">
            <Icon size={14} />
          </div>
          <span className="action-label mono">{label}</span>
        </div>
        
        {path && (
          <div className="action-path mono" title={path}>
            {path}
          </div>
        )}
      </div>

      {description && (
        <div className="action-description">
          {description}
        </div>
      )}

      {content && (
        <div className="action-body">
          <pre className="action-content mono">{previewContent}</pre>
        </div>
      )}

      <div className="action-footer">
        <motion.button
          className="action-btn approve"
          onClick={onApprove}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Check size={14} />
          Approve
        </motion.button>
        
        <motion.button
          className="action-btn discard"
          onClick={onDiscard}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <X size={14} />
          Discard
        </motion.button>
      </div>
    </motion.div>
  );
}
