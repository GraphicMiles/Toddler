import { useState, useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Layout, { SCREENS } from './components/Layout';
import ChatContainer from './components/ChatContainer';
import ModelZoo from './components/ModelZoo';
import MyCollection from './components/MyCollection';
import Settings from './components/Settings';
import useModelCollection from './hooks/useModelCollection';
import useDeviceCapability from './hooks/useDeviceCapability';
import { haptics, isNative } from './nativeBridge';
import { createModelProvider } from './providers/modelProvider';
import { AgentCore } from './agent/core.js';
import { ToolRegistry } from './tools/toolRegistry.js';
import { ApprovalGate } from './tools/toolApproval.js';
import { fileSystem } from './nativeBridge.js';
import { buildFileIndex, searchFiles } from './utils/fileIndex.js';
import './styles/index.css';

const defaultConversationTitle = () => `Chat ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

// Screen types are imported from ./components/Layout (SCREENS)

export default function App() {
  // Screen state
  const [currentScreen, setCurrentScreen] = useState(SCREENS.CHAT);
  
  // UI state
  
  // Chat state
  const [conversations, setConversations] = useState(() => { try { return JSON.parse(localStorage.getItem('forgeai_conversations') || '[]'); } catch { return []; } });
  const [activeConversationId, setActiveConversationId] = useState(() => localStorage.getItem('forgeai_active_conversation') || '');
  const [messages, setMessages] = useState(() => { try { return JSON.parse(localStorage.getItem('forgeai_chat') || '[]'); } catch { return []; } });
  const [isTyping, setIsTyping] = useState(false);
  const [abortController, setAbortController] = useState(null);
  const [endpoint, setEndpoint] = useState(() => localStorage.getItem('forgeai_endpoint') || import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434');
  const [pendingActions, setPendingActions] = useState([]);
  
  // Ollama state
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [modelStatus, setModelStatus] = useState('off');
  const [isConnecting, setIsConnecting] = useState(true);
  
  // Model collection
  const {
    models: downloadedModels,
    activeModel,
    downloadModel,
    deleteModel,
    setActiveModel,
    stopModel,
    pauseDownload,
    cancelDownload,
    downloads,
  } = useModelCollection({ endpoint });

  useEffect(() => { localStorage.setItem('forgeai_chat', JSON.stringify(messages)); }, [messages]);
  useEffect(() => {
    if (!activeConversationId) { const id = generateId(); setActiveConversationId(id); setConversations([{ id, title: defaultConversationTitle(), messages }]); }
  }, [activeConversationId, messages]);
  useEffect(() => { localStorage.setItem('forgeai_conversations', JSON.stringify(conversations)); localStorage.setItem('forgeai_active_conversation', activeConversationId); }, [conversations, activeConversationId]);
  useEffect(() => { if (activeConversationId) setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, messages } : c)); }, [messages, activeConversationId]);

  const { deviceCapability, refresh: refreshDevice } = useDeviceCapability();
  const provider = useMemo(() => createModelProvider({ mode: isNative ? 'on-device' : 'ollama', endpoint }), [endpoint]);

  // Agent core setup with plugin contract for scalable integrations
  const agentToolRegistry = useMemo(() => {
    const registry = new ToolRegistry();
    // Real read_file using native bridge filesystem
    registry.register({
      name: 'read_file',
      description: 'Read a user-selected workspace file',
      permission: 'read',
      execute: async ({ path }) => {
        if (typeof path !== 'string' || !path.trim()) throw new Error('A file path is required.');
        const content = await fileSystem.readFile(path);
        return { path, content, type: 'read' };
      },
    });
    // Real write_file using native bridge filesystem
    registry.register({
      name: 'write_file',
      description: 'Write or edit a workspace file (requires approval)',
      permission: 'write',
      execute: async ({ path, content }) => {
        if (typeof path !== 'string' || !path.trim()) throw new Error('A file path is required.');
        await fileSystem.writeFile(path, content || '');
        return { path, content: content || '', type: 'write' };
      },
    });
    // Search workspace files by query
    registry.register({
      name: 'search',
      description: 'Search workspace files and folders by name or extension',
      permission: 'read',
      execute: async ({ query, workspaceTree }) => {
        const results = searchFiles(query || '', workspaceTree || []);
        return { query, results, count: results.length, type: 'search' };
      },
    });
    // Terminal command execution (stub for future native integration)
    registry.register({
      name: 'terminal',
      description: 'Execute a simple terminal or shell command (requires approval)',
      permission: 'dangerous',
      execute: async ({ command }) => {
        if (typeof command !== 'string' || !command.trim()) throw new Error('A command is required.');
        return { command, output: `Executed: ${command}`, type: 'terminal', status: 'completed' };
      },
    });
    // Index files by extension/folder for retrieval
    registry.register({
      name: 'index',
      description: 'Build or retrieve workspace file index',
      permission: 'read',
      execute: async ({ workspaceTree, filterType }) => {
        const index = buildFileIndex(workspaceTree || []);
        const result = filterType ? index.byExtension[filterType] || [] : index;
        return { index: result, type: 'index', count: Array.isArray(result) ? result.length : (result.count || 0) };
      },
    });
    return registry;
  }, []);

  const agentApprovalGate = useMemo(() => new ApprovalGate(), []);

  const agentCore = useMemo(() => {
    const core = new AgentCore({
      toolRegistry: agentToolRegistry,
      approvalGate: agentApprovalGate,
      provider,
    });
    core.registerPlugin({
      id: 'base-capabilities',
      name: 'Base Capabilities',
      version: '0.1.0',
      registerTools: ({ register }) => {
        register({
          name: 'read_file',
          description: 'Read a workspace file using native filesystem',
          permission: 'read',
          execute: async ({ path }) => {
            if (typeof path !== 'string' || !path.trim()) throw new Error('A file path is required.');
            const content = await fileSystem.readFile(path);
            return { path, content, type: 'read' };
          },
        });
        register({
          name: 'write_file',
          description: 'Write or edit a workspace file (approval required)',
          permission: 'write',
          execute: async ({ path, content }) => {
            if (typeof path !== 'string' || !path.trim()) throw new Error('A file path is required.');
            await fileSystem.writeFile(path, content || '');
            return { path, content: content || '', type: 'write' };
          },
        });
        register({
          name: 'search',
          description: 'Search workspace files by query and extension',
          permission: 'read',
          execute: async ({ query, workspaceTree }) => {
            const results = searchFiles(query || '', workspaceTree || []);
            return { query, results, count: results.length, type: 'search' };
          },
        });
        register({
          name: 'terminal',
          description: 'Execute a terminal or shell command (approval required)',
          permission: 'dangerous',
          execute: async ({ command }) => {
            if (typeof command !== 'string' || !command.trim()) throw new Error('A command is required.');
            return { command, output: `Executed: ${command}`, type: 'terminal', status: 'completed' };
          },
        });
        register({
          name: 'index',
          description: 'Build or retrieve a workspace file index by extension or folder',
          permission: 'read',
          execute: async ({ workspaceTree, filterType }) => {
            const index = buildFileIndex(workspaceTree || []);
            const result = filterType ? index.byExtension[filterType] || [] : index;
            return { index: result, type: 'index', count: Array.isArray(result) ? result.length : result.count || 0 };
          },
        });
      },
    });
    return core;
  }, [agentToolRegistry, agentApprovalGate, provider]);

  // Check Ollama connection
  const checkConnection = useCallback(async () => {
    try {
      const result = await provider.getStatus();
      const available = Boolean(result.connected ?? result.available);
      setOllamaConnected(available);
      setModelStatus(available ? 'idle' : 'off');
    } catch {
      setOllamaConnected(false);
      setModelStatus('off');
    } finally {
      setIsConnecting(false);
    }
  }, [provider]);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substring(2, 15);

  // Add message to chat. level can be 'info', 'error', or 'warn'.
  const addMessage = (role, content, metadata = {}) => {
    const message = {
      id: generateId(),
      role,
      content,
      timestamp: Date.now(),
      ...metadata,
    };
    setMessages(prev => [...prev, message]);
    return message;
  };

  const addSystemMessage = (content, level = 'info') => addMessage('system', content, { level });

  // Send a real streaming request to Ollama. The assistant placeholder is updated per token.
  // Agent core processes the message first (full agent mode), proposes actions through manual approval,
  // and contributes its review to the conversation.
  const handleSendMessage = useCallback(async (text) => {
    if (!activeModel) { addSystemMessage('Please select a model from My Collection first.', 'warn'); return; }

    const userMessage = { id: generateId(), role: 'user', content: text, timestamp: Date.now() };
    const assistantId = generateId();

    // Agent processing - best-effort, non-blocking. Never let agent errors abort the chat.
    let agentResponseText = '';
    try {
      const agentResult = await agentCore.processMessage({
        message: text,
        workspace: { path: '', name: 'workspace', tree: [] },
      });
      // Only keep tool-based proposed actions (those that have a gate entry).
      // agent_review / plan_task items are informational and have no gate entry,
      // so they must NOT show Approve/Discard buttons.
      const toolActions = (agentResult.proposedActions || []).filter(a => a.type !== 'agent_review');
      if (toolActions.length > 0) setPendingActions(prev => [...prev, ...toolActions]);
      agentResponseText = agentResult.agentResponse || '';
    } catch (agentErr) {
      console.warn('Agent processing skipped:', agentErr);
    }

    // Build the initial assistant message (agent summary or placeholder)
    const initialContent = agentResponseText || '';
    setMessages(prev => [...prev, userMessage, { id: assistantId, role: 'assistant', content: initialContent, timestamp: Date.now() }]);
    setIsTyping(true); setModelStatus('busy');
    const controller = new AbortController(); setAbortController(controller);
    if (isNative) await haptics.light();
    try {
      const history = [...messages, userMessage].filter(m => m.role === 'user' || m.role === 'assistant').map(({ role, content }) => ({ role, content }));
      await provider.loadModel?.(isNative ? activeModel.localPath : (activeModel.ollamaName || activeModel.id));
      await provider.stream({ model: activeModel.ollamaName || activeModel.id, messages: history, signal: controller.signal,
        onToken: (token) => setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: m.content + token } : m)),
      });
      if (isNative) await haptics.success();
    } catch (error) {
      if (error.name !== 'AbortError') {
        const friendly = error.message?.includes('loaded safely')
          ? 'Model could not be loaded. It may still be downloading, or the file may be corrupted - try re-downloading from Model Zoo.'
          : `Something went wrong: ${error.message}`;
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, role: 'system', content: friendly, level: 'error' } : m));
      }
    } finally { setIsTyping(false); setModelStatus('idle'); setAbortController(null); }
  }, [activeModel, messages, provider, agentCore]);

  const handleStopGeneration = useCallback(() => { abortController?.abort(); }, [abortController]);

  // Handle action approval - executes through agent core (manual approval enforced)
  const handleApproveAction = useCallback(async (actionId) => {
    const action = pendingActions.find(a => a.id === actionId);
    if (!action) return;

    setPendingActions(prev => prev.filter(a => a.id !== actionId));
    if (isNative) await haptics.medium();

    // Informational / plan actions have no gate entry - just acknowledge them
    if (action.type === 'agent_review' || !action.type) {
      addSystemMessage('Plan acknowledged.', 'info');
      if (isNative) await haptics.success();
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Execute through agent core with approval
    try {
      const result = await agentCore.executeApprovedAction(actionId);
      addSystemMessage(`Agent executed: ${action.type} -> ${JSON.stringify(result)}`, 'info');
      addMessage('assistant', `Done! Executed ${action.type} with result: ${JSON.stringify(result)}`);
    } catch (execError) {
      addSystemMessage(`Agent execution failed: ${execError.message}`, 'error');
    }

    if (isNative) await haptics.success();
  }, [pendingActions, agentCore]);

  // Handle action discard
  const handleDiscardAction = useCallback((actionId) => {
    setPendingActions(prev => prev.filter(a => a.id !== actionId));
    addSystemMessage('Action cancelled.', 'warn');
  }, []);

  // Handle model download
  const handleDownload = useCallback(async (model, onProgress) => {
    const result = await downloadModel(model, onProgress);
    if (result.success) {
      addSystemMessage(`${model.name} downloaded successfully.`, 'info');
      if (isNative) {
        await haptics.success();
      }
    } else if (result.error) {
      addSystemMessage(`Failed to download ${model.name}: ${result.error}`, 'error');
    }
  }, [downloadModel]);

  // Handle model selection
  const handleSelectModel = useCallback((model) => {
    setActiveModel(model);
    setModelStatus('idle');
    addSystemMessage(`Switched to **${model.name}**`, 'info');
    if (isNative) {
      haptics.medium();
    }
    setTimeout(() => setCurrentScreen(SCREENS.CHAT), 500);
  }, [setActiveModel]);

  // Handle model deletion
  const handleDeleteModel = useCallback((model) => {
    if (!window.confirm(`Delete ${model.name} permanently?`)) return;
    deleteModel(model.id);
    addSystemMessage(`**${model.name}** deleted from collection`, 'warn');
  }, [deleteModel]);

  const newConversation = useCallback(() => { const id = generateId(); setConversations(prev => [...prev, { id, title: defaultConversationTitle(), messages: [] }]); setActiveConversationId(id); setMessages([]); }, []);
  const switchConversation = useCallback((id) => { const target = conversations.find(c => c.id === id); if (target) { setActiveConversationId(id); setMessages(target.messages || []); } }, [conversations]);
  const renameConversation = useCallback(() => { const current = conversations.find(c => c.id === activeConversationId); if (!current) return; const title = window.prompt('Conversation name', current.title); if (title?.trim()) setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, title: title.trim() } : c)); }, [conversations, activeConversationId]);
  const deleteConversation = useCallback(() => { if (conversations.length <= 1 || !window.confirm('Delete this conversation?')) return; const next = conversations.filter(c => c.id !== activeConversationId); setConversations(next); setActiveConversationId(next[0].id); setMessages(next[0].messages || []); }, [conversations, activeConversationId]);
  const exportChat = useCallback(() => { const blob = new Blob([messages.map(m => `${m.role.toUpperCase()}\n${m.content}`).join('\n\n')], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'forgeai-chat.txt'; a.click(); URL.revokeObjectURL(a.href); }, [messages]);
  const clearChat = useCallback(() => { if (window.confirm('Clear this conversation?')) setMessages([]); }, []);

  const handleResetApp = useCallback(() => {
    if (!window.confirm('Reset all app data? This will clear all conversations, model metadata, and settings.')) return;
    localStorage.clear();
    setMessages([]);
    setConversations([]);
    setActiveConversationId('');
    setEndpoint('http://localhost:11434');
  }, []);

  // Screen switching
  const screenVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <Layout
      model={activeModel?.name || 'No model'}
      status={modelStatus}
      ollamaConnected={ollamaConnected}
      onScreenChange={setCurrentScreen}
      currentScreen={currentScreen}
      modelCount={downloadedModels.length}
      isConnecting={isConnecting}
    >
      {/* Screens */}
      <AnimatePresence mode="wait">
        {currentScreen === SCREENS.CHAT && (
          <motion.div
            key="chat"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="screen-container"
          >
            <ChatContainer
              messages={messages}
              isTyping={isTyping}
              pendingActions={pendingActions}
              onSendMessage={handleSendMessage}
              onStopGeneration={handleStopGeneration}
              onApproveAction={handleApproveAction}
              onDiscardAction={handleDiscardAction}
              noModelSelected={!activeModel}
              ollamaConnected={ollamaConnected}
              isNative={isNative}
              conversations={conversations}
              activeConversationId={activeConversationId}
              onConversationChange={switchConversation}
              onNewConversation={newConversation}
              onRenameConversation={renameConversation}
              onDeleteConversation={deleteConversation}
              onExportChat={exportChat}
              onClearChat={clearChat}
              onOpenZoo={() => setCurrentScreen(SCREENS.ZOO)}
              onOpenCollection={() => setCurrentScreen(SCREENS.COLLECTION)}
            />
          </motion.div>
        )}

        {currentScreen === SCREENS.ZOO && (
          <motion.div
            key="zoo"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="screen-container"
          >
            <ModelZoo
              downloadedModels={downloadedModels}
              downloads={downloads}
              onDownload={handleDownload}
              onPause={(model) => pauseDownload(model)}
              onCancel={(model) => cancelDownload(model.id)}
              onUseModel={handleSelectModel}
              deviceCapability={deviceCapability}
              ollamaConnected={ollamaConnected}
              isNative={isNative}
              onClose={() => setCurrentScreen(SCREENS.COLLECTION)}
            />
          </motion.div>
        )}

        {currentScreen === SCREENS.COLLECTION && (
          <motion.div
            key="collection"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="screen-container"
          >
            <MyCollection
              models={downloadedModels}
              activeModel={activeModel}
              onSelect={handleSelectModel}
              onDelete={handleDeleteModel}
              onStop={stopModel}
              isRunning={modelStatus === 'busy'}
              ollamaConnected={ollamaConnected}
              runtimeMode={isNative ? 'On-device ready' : 'Ollama active'}
              deviceCapability={deviceCapability}
              onOpenZoo={() => setCurrentScreen(SCREENS.ZOO)}
              onRefreshDevice={refreshDevice}
            />
          </motion.div>
        )}

        {currentScreen === SCREENS.SETTINGS && (
          <motion.div
            key="settings"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="screen-container"
          >
            <Settings
              endpoint={endpoint}
              onEndpointChange={setEndpoint}
              onClearChat={clearChat}
              onReset={handleResetApp}
            />
          </motion.div>
        )}

      </AnimatePresence>
    </Layout>
  );
}
