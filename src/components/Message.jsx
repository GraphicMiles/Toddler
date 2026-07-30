import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Globe, ArrowUpRight, FilePlus } from 'lucide-react';
import { App } from '@capacitor/app';
import { isNative } from '../nativeBridge.js';
import TypingIndicator from './TypingIndicator';
import './Message.css';

function sourceHost(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

/* ── Interactive code block with save/copy actions ── */
function CodeBlockWithActions({ code, language, onFileCreate }) {
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(null);

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  const inferFileName = () => {
    const extensions = {
      javascript: '.js', typescript: '.ts', python: '.py',
      html: '.html', css: '.css', json: '.json',
      jsx: '.jsx', tsx: '.tsx', java: '.java',
      kotlin: '.kt', cpp: '.cpp', c: '.c',
      yaml: '.yml', xml: '.xml', sql: '.sql',
      bash: '.sh', shell: '.sh', markdown: '.md',
    };
    const ext = extensions[language?.toLowerCase()] || '.txt';
    return `untitled${ext}`;
  };

  const handleCreateFile = async () => {
    if (!onFileCreate) return;
    setCreating(true);
    try {
      const fileName = prompt('Save as:', inferFileName());
      if (!fileName) { setCreating(false); return; }
      await onFileCreate(fileName, code);
      setCreated(true);
    } catch (err) {
      console.warn('Failed to create file:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = () => {
    if (!navigator.clipboard?.writeText) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="code-block-wrapper">
      <pre className="code-block">
        <code className={`language-${language}`}>{code}</code>
      </pre>
      <div className="code-actions">
        {onFileCreate && (
          <button 
            className={`code-action-btn ${created ? 'created' : ''}`}
            onClick={handleCreateFile}
            disabled={creating || created}
            title={created ? 'File created in workspace' : 'Save as file in workspace'}
          >
            {created ? <Check size={13} /> : <FilePlus size={13} />}
            {creating ? 'Creating...' : created ? 'Created' : 'Save to workspace'}
          </button>
        )}
        <button 
          className="code-action-btn"
          onClick={handleCopy}
          title={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

const messageVariants = {
  hidden: { 
    opacity: 0, 
    y: 12,
    scale: 0.98
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.25,
      ease: [0.32, 0.72, 0, 1]
    }
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.98,
    transition: { duration: 0.15 }
  }
};

export default function Message({ message = {}, streaming = false, onFileCreate }) {
  const [copied, setCopied] = useState(false);
  const [brokenImages, setBrokenImages] = useState(() => new Set());
  const copyResetTimer = useRef(null);
  const { role, content, timestamp, files = [] } = message;
  const safeContent = typeof content === 'string' ? content : String(content ?? '');
  const safeFiles = Array.isArray(files) ? files : [];
  const safeSources = (Array.isArray(message.sources) ? message.sources : [])
    .filter(source => source && source.url && source.title);
  const isUser = role === 'user';
  const isSystem = role === 'system';
  // While the agent is streaming, the (possibly still empty) placeholder shows an inline
  // typing state instead of an empty bubble with a Copy button.
  const showInlineTyping = streaming && !safeContent;

  useEffect(() => () => {
    if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
  }, []);

  const copy = useCallback((text) => {
    if (!navigator.clipboard?.writeText) return;
    navigator.clipboard.writeText(String(text ?? '')).then(() => {
      setCopied(true);
      if (copyResetTimer.current) clearTimeout(copyResetTimer.current);
      copyResetTimer.current = setTimeout(() => setCopied(false), 1500);
    }).catch(() => {
      setCopied(false);
    });
  }, []);

  const openSource = useCallback((url) => {
    if (!url) return;
    if (isNative) {
      App.openUrl({ url }).catch(() => {});
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const formatTime = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render content with file references highlighted and [n] research citations
  // rendered as tappable chips that open the matching source.
  const renderContent = (text) => {
    if (!text) return null;

    const withCitations = !isUser && safeSources.length > 0;
    const parts = text.split(/(@[\w./-]+)/g);

    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="file-chip">
            {part.slice(1)}
          </span>
        );
      }
      if (!withCitations) return part;
      return part.split(/(\[\d{1,2}\])/g).map((segment, j) => {
        const citation = segment.match(/^\[(\d{1,2})\]$/);
        if (!citation) return segment;
        const source = safeSources.find((s) => s.id === Number(citation[1]));
        if (!source) return segment;
        return (
          <button
            key={`${i}-${j}`}
            type="button"
            className="cite-chip mono"
            onClick={() => openSource(source.url)}
            aria-label={`Open source ${citation[1]}: ${source.title}`}
          >
            {citation[1]}
          </button>
        );
      });
    });
  };

  // Render code blocks with interactive actions
  const renderWithCode = (text) => {
    if (!text) return null;
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {renderContent(text.slice(lastIndex, match.index))}
          </span>
        );
      }
      
      // Add interactive code block
      const lang = match[1] || 'code';
      const code = match[2].trim();
      parts.push(
        <CodeBlockWithActions 
          key={`code-${match.index}`}
          code={code}
          language={lang}
          onFileCreate={onFileCreate}
        />
      );
      
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {renderContent(text.slice(lastIndex))}
        </span>
      );
    }

    return parts.length > 0 ? parts : renderContent(text);
  };

  // Never render an empty agent bubble (e.g. generation stopped before the first token).
  if (!isUser && !isSystem && !safeContent && !streaming) return null;

  if (isSystem) {
    const level = message.level || (safeContent.toLowerCase().includes('error') || safeContent.toLowerCase().includes('failed') ? 'error' : 'info');
    return (
      <motion.div
        className={`message system system-${level}`}
        variants={messageVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        layout
      >
        <div className="message-content">
          {renderWithCode(safeContent)}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`message ${isUser ? 'user' : 'agent'}`}
      variants={messageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
    >
      <div className="message-avatar">
        {isUser ? (
          <div className="avatar avatar-user">Y</div>
        ) : (
          <div className="avatar avatar-agent">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
        )}
      </div>

      <div className="message-body">
        <div className="message-header">
          <span className="message-role mono">
            {isUser ? 'you' : 'agent'}
          </span>
          {timestamp && (
            <span className="message-time mono">
              {formatTime(timestamp)}
            </span>
          )}
        </div>

        <div className="message-content">
          {showInlineTyping ? <TypingIndicator inline /> : renderWithCode(safeContent)}
        </div>

        {!isUser && safeSources.length > 0 && (
          <div className="source-strip" role="list" aria-label="Sources">
            {safeSources.map((source) => (
              <button
                key={source.id || source.url}
                type="button"
                className="source-card"
                role="listitem"
                onClick={() => openSource(source.url)}
                aria-label={`Open source ${source.id}: ${source.title}`}
              >
                {source.imageUrl && !brokenImages.has(source.url) && (
                  <span className="source-card-thumb">
                    <img
                      src={source.imageUrl}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={() => setBrokenImages(prev => new Set(prev).add(source.url))}
                    />
                  </span>
                )}
                <span className="source-card-top">
                  <span className="source-card-index mono">{source.id}</span>
                  <span className="source-card-meta">
                    <Globe size={11} aria-hidden="true" />
                    {source.publisher || sourceHost(source.url)}
                  </span>
                  <ArrowUpRight size={12} className="source-card-open" aria-hidden="true" />
                </span>
                <span className="source-card-title">{source.title}</span>
                {source.snippet && (
                  <span className="source-card-snippet">{source.snippet}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {!streaming && safeContent && (
          <button
            className="message-copy"
            type="button"
            onClick={() => copy(safeContent)}
            aria-label={copied ? 'Copied!' : 'Copy message'}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}

        {safeFiles.length > 0 && (
          <div className="message-files">
            {safeFiles.map((file, i) => (
              <span key={i} className="file-chip">
                {file}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
