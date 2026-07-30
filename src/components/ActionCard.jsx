import { motion } from 'framer-motion';
import { FileEdit, Terminal, GitBranch, Github, Globe, AlertTriangle, Check, X } from 'lucide-react';
import './ActionCard.css';

const ACTION_ICONS = {
  write_file: FileEdit,
  apply_patch: FileEdit,
  create_file: FileEdit,
  terminal: Terminal,
  git: GitBranch,
  git_clone: GitBranch,
  github_api: Github,
  web_search: Globe,
  default: AlertTriangle,
};

const ACTION_LABELS = {
  write_file: 'Proposed write',
  apply_patch: 'Proposed patch',
  create_file: 'Proposed new file',
  terminal: 'Terminal command',
  git: 'Git operation',
  git_clone: 'Clone repository',
  github_api: 'GitHub API request',
  web_search: 'Web research',
  default: 'Action required',
};

export default function ActionCard({ action, onApprove, onDiscard }) {
  const { type, path, content, description } = action;
  
  const Icon = ACTION_ICONS[type] || ACTION_ICONS.default;
  const label = ACTION_LABELS[type] || ACTION_LABELS.default;

  const previewLimit = ['apply_patch', 'create_file'].includes(type) ? 5000 : 500;
  const previewContent = content?.length > previewLimit
    ? content.slice(0, previewLimit) + '...\n\n[truncated]'
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
