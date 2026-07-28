import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Database, Boxes, Menu, Plus, X, Pencil, Trash2, Download, MessageSquare } from 'lucide-react';
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
  ollamaConnected = false,
  isNative = false,
  conversations = [],
  activeConversationId,
  onConversationChange,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  onExportChat,
  onClearChat,
  onOpenZoo,
  onOpenCollection,
  proactiveSuggestions = [],
}) {
  const scrollRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [prefilledText, setPrefilledText] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuForId, setMenuForId] = useState(null);

  const handleSuggestionClick = useCallback((text) => {
    setPrefilledText(text);
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, autoScroll]);

  const [showScrollDown, setShowScrollDown] = useState(false);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setAutoScroll(isAtBottom);
    setShowScrollDown(!isAtBottom && messages.length > 0);
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const topbarTitle = activeConversation?.title || 'ForgeAI';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const sidebarVariants = {
    hidden: { x: '-100%' },
    visible: { x: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
    exit: { x: '-100%', transition: { duration: 0.2 } },
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const handleSelectConversation = (id) => {
    onConversationChange?.(id);
    setSidebarOpen(false);
    setMenuForId(null);
  };

  const handleNewFromSidebar = () => {
    onNewConversation?.();
    setSidebarOpen(false);
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getLastMessageTime = (conv) => {
    const msgs = conv.messages || [];
    if (msgs.length === 0) return conv.id ? '' : '';
    return formatDate(msgs[msgs.length - 1]?.timestamp);
  };

  return (
    <div className="chat-container">
      {/* Minimal top bar */}
      <div className="chat-topbar">
        <button
          type="button"
          className="chat-topbar-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open chat history"
        >
          <Menu size={20} />
        </button>
        <span className="chat-topbar-title">{topbarTitle}</span>
        <button
          type="button"
          className="chat-topbar-btn"
          onClick={onNewConversation}
          aria-label="New chat"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className="sidebar-overlay"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => { setSidebarOpen(false); setMenuForId(null); }}
            />
            <motion.div
              className="chat-sidebar"
              variants={sidebarVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="sidebar-header">
                <span className="sidebar-header-title">Chat History</span>
                <button
                  type="button"
                  className="sidebar-close"
                  onClick={() => { setSidebarOpen(false); setMenuForId(null); }}
                  aria-label="Close sidebar"
                >
                  <X size={18} />
                </button>
              </div>

              <button type="button" className="sidebar-new-btn" onClick={handleNewFromSidebar}>
                <Plus size={14} />
                New chat
              </button>

              <div className="sidebar-list">
                {conversations.map((conv) => {
                  const isActive = conv.id === activeConversationId;
                  const menuOpen = menuForId === conv.id;
                  return (
                    <div key={conv.id} className={`sidebar-item ${isActive ? 'active' : ''}`}>
                      <button
                        type="button"
                        className="sidebar-item-main"
                        onClick={() => handleSelectConversation(conv.id)}
                      >
                        <MessageSquare size={14} className="sidebar-item-icon" />
                        <div className="sidebar-item-text">
                          <span className="sidebar-item-title">{conv.title || 'Untitled'}</span>
                          <span className="sidebar-item-time">{getLastMessageTime(conv)}</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        className="sidebar-item-menu"
                        onClick={(e) => { e.stopPropagation(); setMenuForId(menuOpen ? null : conv.id); }}
                        aria-label="More actions"
                      >
                        ...
                      </button>
                      {menuOpen && (
                        <div className="sidebar-item-actions">
                          <button onClick={() => { setMenuForId(null); onRenameConversation?.(); }}>
                            <Pencil size={12} /> Rename
                          </button>
                          <button onClick={() => { setMenuForId(null); onExportChat?.(); }}>
                            <Download size={12} /> Export
                          </button>
                          <button onClick={() => { setMenuForId(null); onDeleteConversation?.(); }}>
                            <Trash2 size={12} /> Delete
                          </button>
                          <button onClick={() => { setMenuForId(null); onClearChat?.(); }}>
                            Clear messages
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
                {!isNative && !ollamaConnected ? (
                  <>
                    <h2 className="display">Setup required</h2>
                    <p>This app uses Ollama to download and run models. Install and start Ollama, then download a model to begin.</p>
                    <div className="no-model-actions">
                      <button className="btn-primary" onClick={onOpenZoo}>
                        <Boxes size={14} />
                        Model Zoo (setup guide)
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="display">Select a model to start</h2>
                    <p>Download a model from the Model Zoo, then select it from your Collection to begin chatting.</p>
                    <div className="no-model-actions">
                      <button className="btn-primary" onClick={onOpenZoo}>
                        <Boxes size={14} />
                        Browse Model Zoo
                      </button>
                      <button className="btn-secondary" onClick={onOpenCollection}>
                        <Database size={14} />
                        My Collection
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <EmptyState onSuggestionClick={handleSuggestionClick} />
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

      {showScrollDown && (
        <button className="scroll-to-bottom" onClick={scrollToBottom} aria-label="Scroll to latest messages">
          v
        </button>
      )}
      {!isTyping && proactiveSuggestions.length > 0 && (
        <div className="proactive-suggestions" aria-label="Suggested next actions">
          {proactiveSuggestions.map(suggestion => (
            <button key={suggestion.type} onClick={() => handleSuggestionClick(suggestion.prompt)} title={suggestion.reason}>
              <span>{suggestion.type.replace(/-/g, ' ')}</span>
              <small>{suggestion.reason}</small>
            </button>
          ))}
        </div>
      )}
      <MessageInput onSend={onSendMessage} onStop={onStopGeneration} disabled={isTyping} prefilledText={prefilledText} onPrefilledTextConsumed={() => setPrefilledText('')} />
    </div>
  );
}
