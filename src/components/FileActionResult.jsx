import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FilePlus, FileEdit, Trash2, ChevronDown, ChevronRight, ExternalLink,
  Eye, Code, Clock, CheckCircle2, FolderOpen, Copy, Check,
} from 'lucide-react';
import './FileActionResult.css';

const ACTION_ICONS = {
  create_file: FilePlus,
  write_file: FileEdit,
  apply_patch: FileEdit,
  delete_file: Trash2,
  delete: Trash2,
};

const ACTION_VERBS = {
  create_file: 'Created',
  write_file: 'Edited',
  apply_patch: 'Patched',
  delete_file: 'Deleted',
  delete: 'Deleted',
};

const ACTION_COLORS = {
  create_file: 'var(--success, #22c55e)',
  write_file: 'var(--accent, #6366f1)',
  apply_patch: 'var(--accent, #6366f1)',
  delete_file: 'var(--danger, #ef4444)',
  delete: 'var(--danger, #ef4444)',
};

function getFileLanguage(path) {
  const ext = path.split('.').pop()?.toLowerCase();
  const langMap = {
    js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
    py: 'python', java: 'java', kt: 'kotlin', cpp: 'cpp',
    css: 'css', scss: 'scss', html: 'html', xml: 'xml',
    json: 'json', yaml: 'yaml', yml: 'yaml', md: 'markdown',
    sh: 'bash', sql: 'sql', go: 'go', rs: 'rust', rb: 'ruby',
  };
  return langMap[ext] || 'text';
}

function isHtmlFile(path) {
  return /\.html?$/i.test(path);
}

/**
 * Code snippet — shows first N lines with syntax-aware coloring
 */
function CodeSnippet({ content, path, maxLines = 12 }) {
  const [copied, setCopied] = useState(false);
  const lines = content.split('\n').slice(0, maxLines);
  const hasMore = content.split('\n').length > maxLines;
  const lang = getFileLanguage(path);

  const handleCopy = () => {
    navigator.clipboard?.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="far-snippet">
      <div className="far-snippet-header">
        <span className="far-snippet-lang mono">{lang}</span>
        <span className="far-snippet-lines mono">
          {content.split('\n').length} lines
        </span>
        <button className="far-snippet-copy" onClick={handleCopy} title="Copy full content">
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
      <pre className="far-snippet-code mono">
        {lines.map((line, i) => (
          <div key={i} className="far-snippet-line">
            <span className="far-line-num">{i + 1}</span>
            <span className="far-line-text">{line}</span>
          </div>
        ))}
        {hasMore && (
          <div className="far-snippet-more mono">
            ... {content.split('\n').length - maxLines} more lines
          </div>
        )}
      </pre>
    </div>
  );
}

/**
 * HTML Preview — renders HTML in a sandboxed iframe
 */
function HtmlPreview({ content, path }) {
  const iframeRef = useRef(null);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (iframeRef.current && showPreview) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(content);
        doc.close();
      }
    }
  }, [content, showPreview]);

  return (
    <div className="far-html-preview">
      <div className="far-html-tabs">
        <button
          className={`far-html-tab ${showPreview ? 'active' : ''}`}
          onClick={() => setShowPreview(true)}
        >
          <Eye size={13} /> Preview
        </button>
        <button
          className={`far-html-tab ${!showPreview ? 'active' : ''}`}
          onClick={() => setShowPreview(false)}
        >
          <Code size={13} /> Code
        </button>
      </div>
      {showPreview ? (
        <iframe
          ref={iframeRef}
          className="far-html-iframe"
          sandbox="allow-scripts"
          title={`Preview of ${path}`}
        />
      ) : (
        <CodeSnippet content={content} path={path} />
      )}
    </div>
  );
}

/**
 * Single file action result card
 */
function FileActionItem({ action, onFileOpen, index }) {
  const [expanded, setExpanded] = useState(false);
  const { type, path, content, duration } = action;

  const Icon = ACTION_ICONS[type] || FileEdit;
  const verb = ACTION_VERBS[type] || 'Modified';
  const color = ACTION_COLORS[type] || 'var(--accent)';

  const handleOpen = () => {
    if (onFileOpen) {
      onFileOpen(path, content);
    }
  };

  return (
    <motion.div
      className="far-item"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
    >
      <div className="far-item-header" onClick={() => setExpanded(!expanded)}>
        <div className="far-item-left">
          <div className="far-item-icon" style={{ color }}>
            <Icon size={14} />
          </div>
          <span className="far-item-verb">{verb}</span>
          <button className="far-item-path mono" onClick={(e) => { e.stopPropagation(); handleOpen(); }} title="Open in editor">
            {path}
            <ExternalLink size={11} className="far-item-open" />
          </button>
        </div>
        <div className="far-item-right">
          {duration && (
            <span className="far-item-time mono">
              <Clock size={11} /> {duration}
            </span>
          )}
          {content && (
            <button className="far-item-toggle">
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && content && (
          <motion.div
            className="far-item-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {isHtmlFile(path) ? (
              <HtmlPreview content={content} path={path} />
            ) : (
              <CodeSnippet content={content} path={path} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * File Action Result — main component
 * Renders a list of file actions (created, edited, deleted) with previews.
 */
export default function FileActionResult({
  actions = [],
  totalTime,
  onFileOpen,
  summary,
}) {
  const created = (actions || []).filter(a => a.type === 'create_file');
  const edited = (actions || []).filter(a => ['write_file', 'apply_patch'].includes(a.type));
  const deleted = (actions || []).filter(a => ['delete_file', 'delete'].includes(a.type));

  // Build summary string if not provided
  const autoSummary = useMemo(() => {
    const parts = [];
    if (created.length) parts.push(`Created ${created.length} file${created.length > 1 ? 's' : ''}`);
    if (edited.length) parts.push(`Edited ${edited.length} file${edited.length > 1 ? 's' : ''}`);
    if (deleted.length) parts.push(`Deleted ${deleted.length} file${deleted.length > 1 ? 's' : ''}`);
    return parts.join(', ');
  }, [created.length, edited.length, deleted.length]);

  if (!actions || actions.length === 0) return null;

  return (
    <motion.div
      className="file-action-result"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header with summary */}
      <div className="far-header">
        <div className="far-summary">
          <CheckCircle2 size={15} className="far-check" />
          <span>{summary || autoSummary}</span>
        </div>
        {totalTime && (
          <span className="far-time mono">
            <Clock size={12} />
            {totalTime}
          </span>
        )}
      </div>

      {/* File list */}
      <div className="far-list">
        {actions.map((action, i) => (
          <FileActionItem
            key={action.path || i}
            action={action}
            onFileOpen={onFileOpen}
            index={i}
          />
        ))}
      </div>

      {/* Open all in workspace button */}
      {onFileOpen && actions.length > 1 && (
        <div className="far-footer">
          <button className="far-open-all" onClick={() => onFileOpen(actions[0].path, actions[0].content)}>
            <FolderOpen size={13} />
            Open in workspace
          </button>
        </div>
      )}
    </motion.div>
  );
}
