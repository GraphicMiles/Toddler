import { useState, useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from './components/Layout';
import { SCREENS } from './constants/screens.js';
import ChatContainer from './components/ChatContainer';
import ModelZoo from './components/ModelZoo';
import MyCollection from './components/MyCollection';
import Workspace from './components/Workspace';
import Settings from './components/Settings';
import useModelCollection from './hooks/useModelCollection';
import useDeviceCapability from './hooks/useDeviceCapability';
import { haptics, isNative, pickWorkspaceFolder } from './nativeBridge';
import { createModelProvider } from './providers/modelProvider';
import { AgentCore } from './agent/core.js';
import { ApprovalGate } from './tools/toolApproval.js';
import { createWorkspaceToolRegistry } from './tools/workspaceTools.js';
import { retrieveRelevantContext, formatContextForPrompt } from './utils/rag.js';
import { createSafWorkspaceProvider, createVirtualWorkspaceProvider } from './workspace/workspaceProvider.js';
import { recordError } from './utils/errorLog.js';
import './styles/index.css';

const defaultConversationTitle = () => `Chat ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
const generateId = () => Math.random().toString(36).substring(2, 15);
const SAFE_AUTO_APPROVE_TOOLS = ['read_file', 'search', 'index'];

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
  const [modelFolderUri, setModelFolderUri] = useState(() => localStorage.getItem('forgeai_model_folder_uri') || '');

  // Workspace state
  const [workspaceTree, setWorkspaceTree] = useState([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceRootPath, setWorkspaceRootPath] = useState(() => localStorage.getItem('forgeai_workspace_uri') || '');
  const [selectedFilePath, setSelectedFilePath] = useState('');
  const [lastWorkspaceBackup, setLastWorkspaceBackup] = useState(null);
  
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
    importModel,
    mountModel,
    unmountModel,
  } = useModelCollection({ endpoint });

  useEffect(() => { localStorage.setItem('forgeai_chat', JSON.stringify(messages)); }, [messages]);
  useEffect(() => {
    if (!activeConversationId) { const id = generateId(); setActiveConversationId(id); setConversations([{ id, title: defaultConversationTitle(), messages }]); }
  }, [activeConversationId, messages]);
  useEffect(() => { localStorage.setItem('forgeai_conversations', JSON.stringify(conversations)); localStorage.setItem('forgeai_active_conversation', activeConversationId); }, [conversations, activeConversationId]);
  useEffect(() => { if (activeConversationId) setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, messages } : c)); }, [messages, activeConversationId]);

  const workspaceProvider = useMemo(
    () => isNative
      ? createSafWorkspaceProvider(workspaceRootPath)
      : createVirtualWorkspaceProvider(),
    [workspaceRootPath],
  );

  const loadWorkspace = useCallback(async (providerOverride = workspaceProvider) => {
    setWorkspaceLoading(true);
    try {
      if (!providerOverride.available) {
        setWorkspaceTree([]);
        setLastWorkspaceBackup(null);
        return;
      }
      const tree = await providerOverride.list();
      setWorkspaceTree(tree);
      const backups = await providerOverride.listBackups().catch(() => []);
      setLastWorkspaceBackup(backups[0] || null);
    } catch (error) {
      console.warn('Failed to load workspace:', error);
      setWorkspaceTree([]);
      setLastWorkspaceBackup(null);
    } finally {
      setWorkspaceLoading(false);
    }
  }, [workspaceProvider]);

  useEffect(() => {
    if (isNative && workspaceRootPath && !workspaceRootPath.startsWith('content://')) {
      localStorage.removeItem('forgeai_workspace_uri');
      setWorkspaceRootPath('');
      setWorkspaceTree([]);
      return;
    }
    if (!isNative && workspaceRootPath !== 'virtual://workspace') {
      setWorkspaceRootPath('virtual://workspace');
    }
    setSelectedFilePath('');
    loadWorkspace();
  }, [loadWorkspace, workspaceRootPath]);

  const chooseModelFolder = useCallback(async () => {
    if (!isNative) return;
    const result = await pickWorkspaceFolder();
    if (result?.uri) {
      localStorage.setItem('forgeai_model_folder_uri', result.uri);
      setModelFolderUri(result.uri);
    }
  }, []);

  const chooseWorkspace = useCallback(async () => {
    if (!isNative) return;
    const result = await pickWorkspaceFolder();
    if (!result?.uri) return;
    localStorage.setItem('forgeai_workspace_uri', result.uri);
    setWorkspaceRootPath(result.uri);
    setSelectedFilePath('');
    await loadWorkspace(createSafWorkspaceProvider(result.uri));
  }, [loadWorkspace]);

  // All UI workspace operations use the same scoped provider as RAG and agent tools.
  const handleFileRead = useCallback(
    path => workspaceProvider.readText(path),
    [workspaceProvider],
  );

  const handleFileSave = useCallback(async (path, content) => {
    const result = await workspaceProvider.writeText(path, content);
    if (result?.backupId) setLastWorkspaceBackup({ id: result.backupId, path, createdAt: Date.now() });
    await loadWorkspace();
  }, [loadWorkspace, workspaceProvider]);

  const handleWorkspaceUndo = useCallback(async () => {
    if (!lastWorkspaceBackup?.id) return;
    try {
      const restored = await workspaceProvider.restoreBackup(lastWorkspaceBackup.id);
      setLastWorkspaceBackup(null);
      await loadWorkspace();
      addSystemMessage(`Restored ${restored.path} from its last backup.`, 'info');
    } catch (error) {
      recordError(error, 'workspace-restore');
      addSystemMessage(`Workspace restore failed: ${error.message}`, 'error');
    }
  }, [lastWorkspaceBackup, loadWorkspace, workspaceProvider]);

  const handleFileCreate = useCallback(async (path) => {
    try {
      await workspaceProvider.createFile(path);
      await loadWorkspace();
    } catch (error) {
      recordError(error, 'workspace-create-file');
      throw error;
    }
  }, [loadWorkspace, workspaceProvider]);

  const handleFolderCreate = useCallback(async (path) => {
    try {
      await workspaceProvider.createFolder(path);
      await loadWorkspace();
    } catch (error) {
      recordError(error, 'workspace-create-folder');
      throw error;
    }
  }, [loadWorkspace, workspaceProvider]);

  const handleFileRename = useCallback(async (oldPath, newPath) => {
    const newName = newPath.split('/').pop();
    await workspaceProvider.rename(oldPath, newName);
    await loadWorkspace();
  }, [loadWorkspace, workspaceProvider]);

  const handleFileDelete = useCallback(async (path) => {
    await workspaceProvider.delete(path);
    await loadWorkspace();
  }, [loadWorkspace, workspaceProvider]);

  const handleFilePick = useCallback((path, node) => {
    const name = path.split('/').pop();
    const type = node?.type === 'folder' ? 'folder' : 'file';
    setSelectedFilePath(path);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(path).catch(() => {});
    }
    addSystemMessage(`Selected ${type}: ${name} (path copied)`, 'info');
    setCurrentScreen(SCREENS.CHAT);
  }, []);

  // Token windowing: trim conversation history to fit within context window
  const trimHistory = useCallback((msgs, maxTokens = 2500) => {
    const userAssistant = msgs.filter(m => m.role === 'user' || m.role === 'assistant');
    if (userAssistant.length <= 2) return userAssistant.map(({ role, content }) => ({ role, content }));
    // Rough estimate: ~4 chars per token
    let total = 0;
    const trimmed = [];
    for (let i = userAssistant.length - 1; i >= 0; i--) {
      const tokens = Math.ceil((userAssistant[i].content?.length || 0) / 4);
      if (total + tokens > maxTokens && trimmed.length >= 2) break;
      total += tokens;
      trimmed.unshift(userAssistant[i]);
    }
    return trimmed.map(({ role, content }) => ({ role, content }));
  }, []);

  const { deviceCapability, refresh: refreshDevice } = useDeviceCapability();
  const provider = useMemo(() => {
    // Android uses direct llama.cpp JNI; the browser keeps Ollama as a development preview.

    if (isNative) return createModelProvider({ mode: 'on-device', endpoint });
    return createModelProvider({ mode: 'ollama', endpoint });
  }, [endpoint]);

  // One registry executes tools through the same scoped provider used by the UI.
  const agentToolRegistry = useMemo(
    () => createWorkspaceToolRegistry(workspaceProvider),
    [workspaceProvider],
  );

  const agentApprovalGate = useMemo(() => new ApprovalGate(), []);
  useEffect(() => {
    agentApprovalGate.clear();
    setPendingActions([]);
  }, [agentApprovalGate, workspaceProvider.id]);

  const agentCore = useMemo(() => new AgentCore({
    toolRegistry: agentToolRegistry,
    approvalGate: agentApprovalGate,
    provider,
  }), [agentToolRegistry, agentApprovalGate, provider]);

  // Execute read-only agent actions without showing an approval prompt.
  // The approval gate still consumes each request and the tool registry remains the authority.
  const autoExecuteSafeActions = useCallback(async (actions) => {
    for (const action of actions || []) {
      try {
        await agentCore.executeApprovedAction(action.id);
        setPendingActions(prev => prev.filter(item => item.id !== action.id));
        addSystemMessage(`Agent ${action.type} completed inside the selected workspace.`, 'info');
      } catch (error) {
        console.warn('Safe agent action failed:', error);
        setPendingActions(prev => prev.filter(item => item.id !== action.id));
      }
    }
  }, [agentCore]);

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
    const activeDownload = downloads[activeModel.id];
    if (activeDownload && (activeDownload.status === 'downloading' || activeDownload.status === 'paused')) {
      recordError(new Error('Wait for the model download to finish before chatting.'), 'model-generation');
      return;
    }

    const userMessage = { id: generateId(), role: 'user', content: text, timestamp: Date.now() };
    const assistantId = generateId();

    // === RAG: Retrieve relevant file context (safe & bounded) ===
    let ragContext = '';
    try {
      const contextItems = await retrieveRelevantContext({
        query: text,
        workspaceTree,
        selectedPath: selectedFilePath,
        workspaceProvider,
        maxFiles: 4,
      });
      if (contextItems.length > 0) {
        const destination = isNative ? 'the on-device model' : `the configured model endpoint (${endpoint})`;
        const approved = window.confirm(
          `Include these workspace files in the prompt sent to ${destination}?\n\n${contextItems.map(item => `• ${item.path}`).join('\n')}\n\nCancel to continue without workspace context.`,
        );
        if (approved) ragContext = formatContextForPrompt(contextItems);
      }
    } catch (ragErr) {
      console.warn('RAG retrieval skipped:', ragErr);
    }

    // Agent processing - best-effort, non-blocking. Never let agent errors abort the chat.
    let agentResponseText = '';
    try {
      const agentResult = await agentCore.processMessage({
        message: text,
        workspace: { path: '', rootId: workspaceProvider.id, name: 'workspace', tree: workspaceTree, selectedPath: selectedFilePath },
      });
      // Only keep tool-based proposed actions (those that have a gate entry).
      // agent_review / plan_task items are informational and have no gate entry,
      // so they must NOT show Approve/Discard buttons.
      const toolActions = (agentResult.proposedActions || []).filter(a => a.type !== 'agent_review');
      
      // Auto-execute safe read-only tools for smoother experience
      if (toolActions.length > 0) {
        const hasWriteActions = toolActions.some(a => !SAFE_AUTO_APPROVE_TOOLS.includes(a.type));
        
        if (!hasWriteActions) {
          // All safe → auto-execute
          setTimeout(() => autoExecuteSafeActions(toolActions), 300);
        } else {
          // Has write actions → keep manual approval for those
          setPendingActions(prev => [...prev, ...toolActions]);
        }
      }
      
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
      const history = trimHistory([...messages, userMessage]);
      
      // Inject RAG context into the first user message for the model
      const messagesWithContext = [...history];
      if (ragContext && messagesWithContext.length > 0) {
        const lastUserIndex = messagesWithContext.length - 1;
        if (messagesWithContext[lastUserIndex].role === 'user') {
          messagesWithContext[lastUserIndex] = {
            ...messagesWithContext[lastUserIndex],
            content: ragContext + messagesWithContext[lastUserIndex].content,
          };
        }
      }

      const modelIdForProvider = isNative 
        ? (activeModel.localPath || activeModel.downloadedPath || activeModel.file || activeModel.ollamaName || activeModel.id)
        : (activeModel.ollamaName || activeModel.id);
      
      if (!modelIdForProvider) {
        throw new Error('No valid model identifier found. Please re-download the model.');
      }
      
      await provider.loadModel?.(modelIdForProvider);
      await provider.stream({ model: modelIdForProvider, messages: messagesWithContext, signal: controller.signal,
        onToken: (token) => setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: m.content + token } : m)),
      });
      if (isNative) await haptics.success();
    } catch (error) {
      if (error.name !== 'AbortError') {
        recordError(error, 'model-generation');
        const friendly = error.message?.includes('loaded safely')
          ? 'Model could not be loaded. It may still be downloading, or the file may be corrupted - try re-downloading from Model Zoo.'
          : `Something went wrong: ${error.message}`;
        setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, role: 'system', content: friendly, level: 'error' } : m));
      }
    } finally { setIsTyping(false); setModelStatus('idle'); setAbortController(null); }
  }, [activeModel, messages, downloads, endpoint, provider, agentCore, autoExecuteSafeActions, trimHistory, workspaceTree, selectedFilePath, workspaceProvider]);

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
      if (['write_file', 'rename', 'delete'].includes(action.type)) await loadWorkspace();
      addSystemMessage(`Agent executed: ${action.type} -> ${JSON.stringify(result)}`, 'info');
      addMessage('assistant', `Done! Executed ${action.type} with result: ${JSON.stringify(result)}`);
    } catch (execError) {
      addSystemMessage(`Agent execution failed: ${execError.message}`, 'error');
    }

    if (isNative) await haptics.success();
  }, [pendingActions, agentCore, loadWorkspace]);

  // Handle action discard
  const handleDiscardAction = useCallback((actionId) => {
    agentCore.discardAction(actionId);
    setPendingActions(prev => prev.filter(a => a.id !== actionId));
    addSystemMessage('Action cancelled.', 'warn');
  }, [agentCore]);

  // Handle model download
  const handleDownload = useCallback(async (model, onProgress) => {
    const result = await downloadModel(model, onProgress);
    if (result.success) {
      void 0;
      if (isNative) {
        await haptics.success();
      }
    } else if (result.error) {
      recordError(new Error(result.error), 'model-download');
    }
  }, [downloadModel]);

  // Handle model selection
  const handleSelectModel = useCallback((model) => {
    setActiveModel(model);
    setModelStatus('idle');
    void 0;
    if (isNative) {
      haptics.medium();
    }
    setTimeout(() => setCurrentScreen(SCREENS.CHAT), 500);
  }, [setActiveModel]);

  // Handle model deletion
  const handleDeleteModel = useCallback(async (model) => {
    if (!window.confirm(`Delete ${model.name} permanently?`)) return;
    const result = await deleteModel(model.id);
    if (result?.success) addSystemMessage(result.warning || `${model.name} deleted from collection`, result.warning ? 'warn' : 'info');
    else addSystemMessage(`Could not delete ${model.name}: ${result?.error || 'unknown error'}`, 'error');
  }, [deleteModel]);

  const newConversation = useCallback(() => { const id = generateId(); setConversations(prev => [...prev, { id, title: defaultConversationTitle(), messages: [] }]); setActiveConversationId(id); setMessages([]); }, []);
  const switchConversation = useCallback((id) => { const target = conversations.find(c => c.id === id); if (target) { setActiveConversationId(id); setMessages(target.messages || []); } }, [conversations]);
  const renameConversation = useCallback(() => { const current = conversations.find(c => c.id === activeConversationId); if (!current) return; const title = window.prompt('Conversation name', current.title); if (title?.trim()) setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, title: title.trim() } : c)); }, [conversations, activeConversationId]);
  const deleteConversation = useCallback(() => { if (conversations.length <= 1 || !window.confirm('Delete this conversation?')) return; const next = conversations.filter(c => c.id !== activeConversationId); setConversations(next); setActiveConversationId(next[0].id); setMessages(next[0].messages || []); }, [conversations, activeConversationId]);
  const exportChat = useCallback(() => { const blob = new Blob([messages.map(m => `${m.role.toUpperCase()}\n${m.content}`).join('\n\n')], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'forgeai-chat.txt'; a.click(); URL.revokeObjectURL(a.href); }, [messages]);
  const clearChat = useCallback(() => { if (window.confirm('Clear this conversation?')) setMessages([]); }, []);

  const handleResetApp = useCallback(() => {
    if (!window.confirm('Reset conversations, model metadata, and settings? Downloaded source files and workspace backups are not deleted.')) return;
    localStorage.clear();
    setMessages([]);
    setConversations([]);
    setActiveConversationId('');
    setModelFolderUri('');
    setWorkspaceRootPath(isNative ? '' : 'virtual://workspace');
    setWorkspaceTree([]);
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
              onChooseModelFolder={chooseModelFolder}
              modelFolderSelected={modelFolderUri.startsWith('content://')}
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
                runtimeMode={isNative ? 'On-device runtime' : 'Ollama preview'}
                deviceCapability={deviceCapability}
                onOpenZoo={() => setCurrentScreen(SCREENS.ZOO)}
                onImportModel={async () => { try { await importModel(); } catch (error) { recordError(error, 'model-import'); } }}
                onRefreshDevice={refreshDevice}
                onMountModel={async (model) => {
                  const result = await mountModel(model);
                  if (result.success) {
                    void 0;
                  } else {
                    recordError(new Error(result.error), 'model-mount');
                  }
                }}
                onUnmountModel={async () => {
                  const result = await unmountModel();
                  if (result.success) {
                    void 0;
                  }
                }}
                isNative={isNative}
              />
          </motion.div>
        )}

        {currentScreen === SCREENS.WORKSPACE && (
          <motion.div
            key="workspace"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="screen-container"
          >
            <Workspace
              workspace={{ name: 'Device Storage', path: workspaceRootPath, tree: workspaceTree }}
              workspaceLoading={workspaceLoading}
              onFileSelect={() => {}}
              onFilePick={handleFilePick}
              onFileRead={handleFileRead}
              onFileSave={handleFileSave}
              onFileCreate={handleFileCreate}
              onFolderCreate={handleFolderCreate}
              onFileRename={handleFileRename}
              onFileDelete={handleFileDelete}
              onUndo={handleWorkspaceUndo}
              undoPath={lastWorkspaceBackup?.path || ''}
              onRefresh={() => loadWorkspace()}
              onChooseWorkspace={chooseWorkspace}
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
              isNative={isNative}
            />
          </motion.div>
        )}

      </AnimatePresence>
    </Layout>
  );
}
