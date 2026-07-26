import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Square } from 'lucide-react';
import './MessageInput.css';

export default function MessageInput({ onSend, onStop, disabled = false, prefilledText, onPrefilledTextConsumed }) {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  // Consume prefilled text from suggestions
  useEffect(() => {
    if (prefilledText) {
      setValue(prefilledText);
      onPrefilledTextConsumed?.();
      textareaRef.current?.focus();
    }
  }, [prefilledText, onPrefilledTextConsumed]);

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [value]);

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    
    onSend?.(trimmed);
    setValue('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="message-input-wrapper">
      <div className="message-input-container">
        <motion.div 
          className={`input-field ${disabled ? 'disabled' : ''}`}
          animate={disabled ? { opacity: 0.6 } : { opacity: 1 }}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            disabled={disabled}
          />
        </motion.div>

        <div className="input-actions">
          <motion.button
            className="send-button"
            onClick={disabled ? onStop : handleSubmit}
            disabled={!disabled && !value.trim()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {disabled ? (
              <Square size={16} />
            ) : (
              <Send size={16} />
            )}
          </motion.button>
        </div>
      </div>

      <div className="input-hint mono">
        Enter to send · Shift + Enter for new line
      </div>
    </div>
  );
}
