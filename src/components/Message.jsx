import { motion } from 'framer-motion';
import { Copy } from 'lucide-react';
import './Message.css';

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

export default function Message({ message, index }) {
  const copy = (text) => navigator.clipboard?.writeText(text);
  const { role, content, timestamp, files = [] } = message;
  const isUser = role === 'user';
  const isSystem = role === 'system';

  const formatTime = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render content with file references highlighted
  const renderContent = (text) => {
    if (!text) return null;
    
    const parts = text.split(/(@[\w./-]+)/g);
    
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="file-chip">
            {part.slice(1)}
          </span>
        );
      }
      return part;
    });
  };

  // Render code blocks
  const renderWithCode = (text) => {
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
      
      // Add code block
      const lang = match[1] || 'code';
      const code = match[2].trim();
      parts.push(
        <pre key={`code-${match.index}`} className="code-block">
          <code className={`language-${lang}`}>{code}</code>
        </pre>
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

  if (isSystem) {
    return (
      <motion.div
        className="message system"
        variants={messageVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        layout
      >
        <div className="message-content">
          {renderWithCode(content)}
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
          {renderWithCode(content)}
        </div>
        <button className="message-copy" type="button" onClick={() => copy(content)} aria-label="Copy message"><Copy size={13} /> Copy</button>

        {files.length > 0 && (
          <div className="message-files">
            {files.map((file, i) => (
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
