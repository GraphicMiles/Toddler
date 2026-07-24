import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Layout, { SCREENS } from './components/Layout';
import ChatContainer from './components/ChatContainer';
import ModelZoo from './components/ModelZoo';
import MyCollection from './components/MyCollection';
import Workspace from './components/Workspace';
import Settings from './components/Settings';
import useModelCollection from './hooks/useModelCollection';
import useDeviceCapability from './hooks/useDeviceCapability';
import { checkOllamaConnection, getOnDeviceRuntimeInfo, streamOllamaChat, runOnDeviceChat, loadOnDeviceModel, haptics, isNative } from './nativeBridge';
import './styles/index.css';

// Mock workspace data
const MOCK_WORKSPACE = {
  name: 'forgeai-mvp',
  path: '/Users/forgeai/Projects/forgeai-mvp',
  tree: [
    {
      name: 'src',
      type: 'folder',
      open: true,
      path: 'src',
      children: [
        { name: 'components', type: 'folder', open: true, path: 'src/components', children: [
          { name: 'Chat.jsx', type: 'file', path: 'src/components/Chat.jsx' },
          { name: 'Layout.jsx', type: 'file', path: 'src/components/Layout.jsx' },
          { name: 'Workspace.jsx', type: 'file', path: 'src/components/Workspace.jsx' },
        ]},
        { name: 'hooks', type: 'folder', open: false, path: 'src/hooks', children: [
          { name: 'useModelCollection.js', type: 'file', path: 'src/hooks/useModelCollection.js' },
        ]},
        { name: 'App.jsx', type: 'file', path: 'src/App.jsx' },
        { name: 'main.jsx', type: 'file', path: 'src/main.jsx' },
      ],
    },
    {
      name: 'package.json',
      type: 'file',
      path: 'package.json',
    },
    {
      name: 'README.md',
      type: 'file',
      path: 'README.md',
    },
  ],
};

// Screen types are imported from ./components/Layout (SCREENS)

export default function App() {
  // Screen state
  const [currentScreen, setCurrentScreen] = useState(SCREENS.CHAT);
  
  // UI state
  const [workspace] = useState(MOCK_WORKSPACE);
  
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
  
  // Model collection
  const {
    models: downloadedModels,
    activeModel,
    downloadModel,
    pauseDownload,
    deleteModel,
    setActiveModel,
    stopModel,
  } = useModelCollection({ endpoint });

  useEffect(() => {
    localStorage.setItem('forgeai_chat', JSON.stringify(messages));
    if (!activeConversationId) { const id = generateId(); setActiveConversationId(id); setConversations([{ id, title: 'New conversation', messages }]); }
  }, []);
  useEffect(() => { localStorage.setItem('forgeai_conversations', JSON.stringify(conversations)); localStorage.setItem('forgeai_active_conversation', activeConversationId); }, [conversations, activeConversationId]);
  useEffect(() => { if (activeConversationId) setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, messages } : c)); }, [messages, activeConversationId]);

  const deviceCapability = useDeviceCapability();

  // Check Ollama connection
  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    if (isNative) {
      const runtime = await getOnDeviceRuntimeInfo();
      setOllamaConnected(Boolean(runtime.available));
      if (!runtime.available && !activeModel) setModelStatus('off');
      return;
    }
    const result = await checkOllamaConnection(endpoint);
    setOllamaConnected(result.connected);
    if (!result.connected && !activeModel) setModelStatus('off');
  };

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substring(2, 15);

  // Add message to chat
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

  // Send a real streaming request to Ollama. The assistant placeholder is updated per token.
  const handleSendMessage = useCallback(async (text) => {
    if (!activeModel) { addMessage('system', 'Please select a model from My Collection first.'); return; }
    const userMessage = { id: generateId(), role: 'user', content: text, timestamp: Date.now() };
    const assistantId = generateId();
    setMessages(prev => [...prev, userMessage, { id: assistantId, role: 'assistant', content: '', timestamp: Date.now() }]);
    setIsTyping(true); setModelStatus('busy');
    const controller = new AbortController(); setAbortController(controller);
    if (isNative) await haptics.light();
    try {
      const history = [...messages, userMessage].filter(m => m.role === 'user' || m.role === 'assistant').map(({ role, content }) => ({ role, content }));
      if (isNative) {
        if (!activeModel.localPath) throw new Error('Download a compatible offline model from Model Zoo first.');
        await loadOnDeviceModel(activeModel.localPath);
        await runOnDeviceChat({ messages: history, signal: controller.signal, onToken: (token) => setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: m.content + token } : m)) });
      } else {
        await streamOllamaChat({ url: endpoint, model: activeModel.ollamaName || activeModel.id, messages: history, signal: controller.signal,
          onToken: (token) => setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: m.content + token } : m)),
        });
      }
      if (isNative) await haptics.success();
    } catch (error) {
      if (error.name !== 'AbortError') setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, role: 'system', content: `Runtime error: ${error.message}` } : m));
    } finally { setIsTyping(false); setModelStatus('idle'); setAbortController(null); }
  }, [activeModel, endpoint, messages, isNative]);

  const handleStopGeneration = useCallback(() => { abortController?.abort(); }, [abortController]);

  // Handle action approval
  const handleApproveAction = useCallback(async (actionId) => {
    const action = pendingActions.find(a => a.id === actionId);
    if (!action) return;

    setPendingActions(prev => prev.filter(a => a.id !== actionId));
    if (isNative) {
      await haptics.medium();
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    addMessage('system', `File written: ${action.path}`);
    addMessage('assistant', `Done! I've created ${action.path}.`);
    
    if (isNative) {
      await haptics.success();
    }
  }, [pendingActions]);

  // Handle action discard
  const handleDiscardAction = useCallback((actionId) => {
    setPendingActions(prev => prev.filter(a => a.id !== actionId));
    addMessage('system', 'Action cancelled.');
  }, []);

  // Handle model download
  const handleDownload = useCallback(async (model, onProgress) => {
    const result = await downloadModel(model, onProgress);
    if (result.success) {
      addMessage('system', `${model.name} downloaded successfully.`);
      if (isNative) await haptics.success();
    } else if (!result.paused) {
      addMessage('system', `${model.name} download failed: ${result.error || 'unknown error'}`);
      if (isNative) await haptics.error();
    }
    return result;
  }, [downloadModel, isNative]);

  const handlePauseDownload = useCallback((model) => pauseDownload(model), [pauseDownload]);

  // Handle model selection
  const handleSelectModel = useCallback((model) => {
    setActiveModel(model);
    setModelStatus('idle');
    addMessage('system', `Switched to **${model.name}**`);
    if (isNative) {
      haptics.medium();
    }
    // Auto-switch to chat
    setTimeout(() => setCurrentScreen(SCREENS.CHAT), 500);
  }, [setActiveModel, isNative]);

  // Handle model deletion
  const handleDeleteModel = useCallback((model) => {
    deleteModel(model.id);
    addMessage('system', `**${model.name}** deleted from collection`);
  }, [deleteModel]);

  const newConversation = useCallback(() => { const id = generateId(); setConversations(prev => [...prev, { id, title: 'New conversation', messages: [] }]); setActiveConversationId(id); setMessages([]); }, []);
  const switchConversation = useCallback((id) => { const target = conversations.find(c => c.id === id); if (target) { setActiveConversationId(id); setMessages(target.messages || []); } }, [conversations]);
  const renameConversation = useCallback(() => { const current = conversations.find(c => c.id === activeConversationId); if (!current) return; const title = window.prompt('Conversation name', current.title); if (title?.trim()) setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, title: title.trim() } : c)); }, [conversations, activeConversationId]);
  const deleteConversation = useCallback(() => { if (conversations.length <= 1 || !window.confirm('Delete this conversation?')) return; const next = conversations.filter(c => c.id !== activeConversationId); setConversations(next); setActiveConversationId(next[0].id); setMessages(next[0].messages || []); }, [conversations, activeConversationId]);
  const exportChat = useCallback(() => { const blob = new Blob([messages.map(m => `${m.role.toUpperCase()}\n${m.content}`).join('\n\n')], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'forgeai-chat.txt'; a.click(); URL.revokeObjectURL(a.href); }, [messages]);
  const clearChat = useCallback(() => { if (window.confirm('Clear this conversation?')) setMessages([]); }, []);

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
              conversations={conversations}
              activeConversationId={activeConversationId}
              onConversationChange={switchConversation}
              onNewConversation={newConversation}
              onRenameConversation={renameConversation}
              onDeleteConversation={deleteConversation}
              onExportChat={exportChat}
              onClearChat={clearChat}
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
              onDownload={handleDownload}
              onPause={handlePauseDownload}
              deviceCapability={deviceCapability}
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
              deviceCapability={deviceCapability}
              onOpenZoo={() => setCurrentScreen(SCREENS.ZOO)}
            />
          </motion.div>
        )}

        {currentScreen === SCREENS.WORKSPACE && (
          <motion.div key="workspace" variants={screenVariants} initial="initial" animate="animate" exit="exit" className="screen-container">
            <Workspace workspace={workspace} onFileSelect={() => {}} />
          </motion.div>
        )}
        {currentScreen === SCREENS.SETTINGS && (
          <motion.div key="settings" variants={screenVariants} initial="initial" animate="animate" exit="exit" className="screen-container">
            <Settings endpoint={endpoint} onEndpointChange={setEndpoint} onClearChat={() => setMessages([])} onReset={() => { localStorage.clear(); window.location.reload(); }} />
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
