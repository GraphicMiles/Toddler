import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import { Database } from 'lucide-react';
import Message from './Message';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import ActionCard from './ActionCard';
import EmptyState from './EmptyState';
import './ChatContainer.css';

export default function ChatContainer({ 
  messages = [], 
  isTyping = false,
  onSendMessage,
  onStopGeneration,
  onApproveAction,
  onDiscardAction,
  pendingActions = [],
  noModelSelected = false,
  conversations = [],
  activeConversationId,
  onConversationChange,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  onExportChat,
  onClearChat,
}) {
  const scrollRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, autoScroll]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setAutoScroll(isAtBottom);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-toolbar">
        <select aria-label="Conversation" value={activeConversationId || ''} onChange={e => onConversationChange?.(e.target.value)}>{conversations.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
        <button type="button" onClick={onNewConversation}>New</button><button type="button" onClick={() => onRenameConversation?.()} disabled={!conversations.length}>Rename</button><button type="button" onClick={onDeleteConversation} disabled={conversations.length < 2}>Delete</button><button type="button" onClick={onExportChat} disabled={!messages.length}>Export</button><button type="button" onClick={onClearChat} disabled={!messages.length}>Clear</button>
      </div>
      <div 
        className="chat-scroll" 
        ref={scrollRef}
        onScroll={handleScroll}
      >
        <div className="chat-column">
          {messages.length === 0 && !isTyping ? (
            noModelSelected ? (
              <div className="no-model-state">
                <div className="no-model-icon">
                  <Database size={32} />
                </div>
                <h2 className="display">Select a model to start</h2>
                <p>Go to My Collection to select a downloaded model, or visit the Model Zoo to download one.</p>
              </div>
            ) : (
              <EmptyState />
            )
          ) : (
            <motion.div
              className="messages-wrapper"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence mode="popLayout">
                {messages.map((message, index) => (
                  <Message
                    key={message.id || index}
                    message={message}
                    index={index}
                  />
                ))}
              </AnimatePresence>

              {isTyping && <TypingIndicator />}
            </motion.div>
          )}

          {/* Pending Actions */}
          <AnimatePresence>
            {pendingActions.map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                onApprove={() => onApproveAction?.(action.id)}
                onDiscard={() => onDiscardAction?.(action.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      <MessageInput onSend={onSendMessage} onStop={onStopGeneration} disabled={isTyping} />
    </div>
  );
}
