import { motion } from 'framer-motion';
import { FolderOpen, Code, FileText, Sparkles } from 'lucide-react';
import './EmptyState.css';

const suggestions = [
  { icon: FileText, text: 'Read and explain a file in my workspace' },
  { icon: Code, text: 'Write a function to sort an array' },
  { icon: FolderOpen, text: 'Show me the structure of my project' },
  { icon: Sparkles, text: 'Help me debug this error' },
];

export default function EmptyState() {
  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
    >
      <motion.div 
        className="empty-icon"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </motion.div>

      <motion.h1
        className="empty-title display"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        Ready to build
      </motion.h1>

      <motion.p
        className="empty-description"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Browse the workspace to reference a file, or just ask me to read, explain, or change something. I'll show you edits before writing anything.
      </motion.p>

      <motion.div
        className="suggestions"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        {suggestions.map((suggestion, index) => (
          <motion.button
            key={index}
            className="suggestion-btn"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.05 }}
            whileHover={{ x: 4, backgroundColor: 'var(--bg-elev-2)' }}
            whileTap={{ scale: 0.98 }}
          >
            <suggestion.icon size={14} />
            <span>{suggestion.text}</span>
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}
