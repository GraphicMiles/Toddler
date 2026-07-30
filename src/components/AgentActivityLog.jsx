import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, FileText, FilePlus, FileEdit, Trash2, Terminal, Search, Globe,
  GitBranch, ChevronRight, ChevronDown, ExternalLink, Clock, CheckCircle2,
  AlertCircle, Loader2, Eye, Code, Copy, Check,
} from 'lucide-react';
import './AgentActivityLog.css';

const STEP_ICONS = {
  thinking: Brain,
  read_file: FileText,
  write_file: FileEdit,
  create_file: FilePlus,
  delete_file: Trash2,
  delete: Trash2,
  apply_patch: FileEdit,
  run_terminal: Terminal,
  terminal: Terminal,
  search_code: Search,
  search_web: Globe,
  web_search: Globe,
  git_clone: GitBranch,
  git_commit: GitBranch,
  git_push: GitBranch,
  git_status: GitBranch,
  git_diff: GitBranch,
  git_log: GitBranch,
  respond: CheckCircle2,
  ask_user: AlertCircle,
  error: AlertCircle,
};

const STEP_LABELS = {
  thinking: 'Thinking',
  read_file: 'Read',
  write_file: 'Edited',
  create_file: 'Created',
  delete_file: 'Deleted',
  delete: 'Deleted',
  apply_patch: 'Patched',
  run_terminal: 'Ran command',
  terminal: 'Ran command',
  search_code: 'Searched code',
  search_web: 'Searched web',
  web_search: 'Searched web',
  git_clone: 'Cloned repo',
  git_commit: 'Committed',
  git_push: 'Pushed',
  git_status: 'Git status',
  git_diff: 'Git diff',
  git_log: 'Git log',
  respond: 'Responded',
  ask_user: 'Asking you',
  error: 'Error',
};

const STEP_COLORS = {
  thinking: '#a78bfa',
  read_file: '#60a5fa',
  write_file: '#f59e0b',
  create_file: '#22c55e',
  delete_file: '#ef4444',
  delete: '#ef4444',
  apply_patch: '#f59e0b',
  run_terminal: '#14b8a6',
  terminal: '#14b8a6',
  search_code: '#8b5cf6',
  search_web: '#3b82f6',
  web_search: '#3b82f6',
  git_clone: '#6366f1',
  git_commit: '#6366f1',
  git_push: '#6366f1',
  git_status: '#6366f1',
  git_diff: '#6366f1',
  git_log: '#6366f1',
  respond: '#22c55e',
  ask_user: '#f59e0b',
  error: '#ef4444',
};

function getFileExt(path) {
  return path?.split('.').pop()?.toLowerCase() || '';
}

function isHtml(path) {
  return /\.html?$/i.test(path || '');
}

/**
 * Code snippet preview
 */
function StepSnippet({ content, path, maxLines = 12 }) {
  const [copied, setCopied] = useState(false);
  if (!content) return null;
  const lines = content.split('\n');
  const shown = lines.slice(0, maxLines);
  const hasMore = lines.length > maxLines;
  const ext = getFileExt(path);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="aal-snippet">
      <div className="aal-snippet-bar">
        <span className="aal-snippet-ext mono">{ext || 'text'}</span>
        <span className="aal-snippet-lines mono">{lines.length} lines</span>
        <button className="aal-snippet-copy" onClick={handleCopy}>
          {copied ? <Check size={11} /> : <Copy size={11} />}
        </button>
      </div>
      <pre className="aal-snippet-code mono">
        {shown.map((line, i) => (
          <div key={i} className="aal-snippet-line">
            <span className="aal-line-num">{i + 1}</span>
            <span className="aal-line-text">{line}</span>
          </div>
        ))}
        {hasMore && <div className="aal-snippet-more">+{lines.length - maxLines} more lines</div>}
      </pre>
    </div>
  );
}

/**
 * HTML preview in iframe
 */
function StepHtmlPreview({ content }) {
  const [mode, setMode] = useState('preview');
  const iframeRef = useRef(null);

  useEffect(() => {
    if (iframeRef.current && mode === 'preview') {
      const doc = iframeRef.current.contentDocument;
      if (doc) { doc.open(); doc.write(content); doc.close(); }
    }
  }, [content, mode]);

  return (
    <div className="aal-html-preview">
      <div className="aal-html-tabs">
        <button className={`aal-html-tab ${mode === 'preview' ? 'active' : ''}`} onClick={() => setMode('preview')}>
          <Eye size={12} /> Preview
        </button>
        <button className={`aal-html-tab ${mode === 'code' ? 'active' : ''}`} onClick={() => setMode('code')}>
          <Code size={12} /> Code
        </button>
      </div>
      {mode === 'preview' ? (
        <iframe ref={iframeRef} className="aal-html-iframe" sandbox="allow-scripts" title="HTML Preview" />
      ) : (
        <StepSnippet content={content} path="preview.html" />
      )}
    </div>
  );
}

/**
 * Single activity step
 */
function ActivityStep({ step, index, onFileOpen, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const { tool, args, result, _iteration, duration, status } = step;

  const Icon = STEP_ICONS[tool] || Brain;
  const label = STEP_LABELS[tool] || tool;
  const color = STEP_COLORS[tool] || '#6b7280';
  const path = args?.path || args?.url || args?.command || '';
  const content = args?.content || result?.content || '';
  const hasContent = content && ['create_file', 'write_file', 'apply_patch', 'read_file'].includes(tool);
  const isFileAction = ['create_file', 'write_file', 'apply_patch', 'read_file', 'delete_file', 'delete'].includes(tool);

  return (
    <motion.div
      className={`aal-step ${isLast ? 'aal-step-last' : ''} ${status === 'error' ? 'aal-step-error' : ''}`}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
    >
      {/* Timeline line */}
      <div className="aal-step-timeline">
        <div className="aal-step-dot" style={{ background: color }}>
          <Icon size={10} />
        </div>
        {!isLast && <div className="aal-step-line" />}
      </div>

      {/* Step content */}
      <div className="aal-step-body">
        <div className="aal-step-header" onClick={() => hasContent && setExpanded(!expanded)}>
          <span className="aal-step-label" style={{ color }}>{label}</span>

          {path && (
            isFileAction && onFileOpen ? (
              <button
                className="aal-step-path mono"
                onClick={(e) => { e.stopPropagation(); onFileOpen(path, content); }}
                title="Open in editor"
              >
                {path}
                <ExternalLink size={10} />
              </button>
            ) : (
              <span className="aal-step-path-detail mono">{path}</span>
            )
          )}

          <div className="aal-step-meta">
            {duration && <span className="aal-step-time mono"><Clock size={10} />{duration}</span>}
            {hasContent && (
              <span className="aal-step-toggle">{expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
            )}
            {status === 'running' && <Loader2 size={12} className="aal-step-spinner" />}
            {result?.success === false && <AlertCircle size={12} className="aal-step-fail" />}
          </div>
        </div>

        {/* Terminal output */}
        {tool === 'run_terminal' || tool === 'terminal' ? (
          result?.output && (
            <div className="aal-terminal-output mono">
              {String(result.output).slice(0, 2000)}
            </div>
          )
        ) : null}

        {/* Search results */}
        {(tool === 'search_web' || tool === 'web_search') && result?.sources ? (
          <div className="aal-search-results">
            {result.sources.slice(0, 3).map((src, i) => (
              <div key={i} className="aal-search-result">
                <span className="aal-search-title">{src.title}</span>
                <span className="aal-search-snippet">{src.snippet}</span>
              </div>
            ))}
          </div>
        ) : null}

        {/* Expandable code/HTML preview */}
        <AnimatePresence>
          {expanded && hasContent && (
            <motion.div
              className="aal-step-expand"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {isHtml(path) ? (
                <StepHtmlPreview content={content} />
              ) : (
                <StepSnippet content={content} path={path} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/**
 * Agent Activity Log — shows all steps the agent took
 */
export default function AgentActivityLog({
  steps = [],
  totalTime,
  onFileOpen,
  summary,
  defaultCollapsed = false,
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  if (!steps || steps.length === 0) return null;

  const fileSteps = steps.filter(s => ['create_file', 'write_file', 'apply_patch', 'delete_file'].includes(s.tool));
  const fileCount = fileSteps.length;

  return (
    <div className="agent-activity-log">
      {/* Collapsible header */}
      <button className="aal-header" onClick={() => setCollapsed(!collapsed)}>
        <div className="aal-header-left">
          {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          <Brain size={14} className="aal-header-icon" />
          <span className="aal-header-title">
            {summary || `Agent completed ${steps.length} step${steps.length !== 1 ? 's' : ''}`}
            {fileCount > 0 && <span className="aal-header-files"> · {fileCount} file{fileCount !== 1 ? 's' : ''}</span>}
          </span>
        </div>
        {totalTime && <span className="aal-header-time mono"><Clock size={11} />{totalTime}</span>}
      </button>

      {/* Steps timeline */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            className="aal-steps"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {steps.map((step, i) => (
              <ActivityStep
                key={`${step.tool}-${i}`}
                step={step}
                index={i}
                onFileOpen={onFileOpen}
                isLast={i === steps.length - 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
