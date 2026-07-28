import { useState, useCallback, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Layout, { SCREENS } from './components/Layout';
import ChatContainer from './components/ChatContainer';
import ModelZoo from './components/ModelZoo';
import MyCollection from './components/MyCollection';
import Workspace from './components/Workspace';
import Settings from './components/Settings';
import useModelCollection from './hooks/useModelCollection';
import useDeviceCapability from './hooks/useDeviceCapability';
import { haptics, isNative, pickWorkspaceFolder, listWorkspace, readWorkspaceFile, writeWorkspaceFile, createWorkspaceFile, createWorkspaceFolder, renameWorkspaceItem, deleteWorkspaceItem } from './nativeBridge';
import { createModelProvider } from './providers/modelProvider';
import { AgentCore } from './agent/core.js';
import { ToolRegistry } from './tools/toolRegistry.js';
import { ApprovalGate } from './tools/toolApproval.js';
import { fileSystem } from './nativeBridge.js';
import { buildFileIndex, searchFiles } from './utils/fileIndex.js';
import { retrieveRelevantContext, formatContextForPrompt } from './utils/rag.js';
import { virtualWorkspace } from './utils/virtualWorkspace.js';
import { normalizeWorkspacePath, isSensitiveWorkspaceFile } from './workspace/safePath.js';
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
  const [smartMode, setSmartMode] = useState(() => {
    try { return localStorage.getItem('forgeai_smart_mode') === 'true'; } catch { return false; }
  });

  // Native runtime status
  const [localServerStatus, setLocalServerStatus] = useState({ running: false, port: 8080, model: null });
  
  // Workspace state
  const [workspaceTree, setWorkspaceTree] = useState([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceRootPath, setWorkspaceRootPath] = useState(() => localStorage.getItem('forgeai_workspace_uri') || '');
  const [selectedFilePath, setSelectedFilePath] = useState('');
  
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
  } = useModelCollection({ endpoint });

  useEffect(() => { localStorage.setItem('forgeai_chat', JSON.stringify(messages)); }, [messages]);
  useEffect(() => {
    if (!activeConversationId) { const id = generateId(); setActiveConversationId(id); setConversations([{ id, title: defaultConversationTitle(), messages }]); }
  }, [activeConversationId, messages]);
  useEffect(() => { localStorage.setItem('forgeai_conversations', JSON.stringify(conversations)); localStorage.setItem('forgeai_active_conversation', activeConversationId); }, [conversations, activeConversationId]);
  useEffect(() => { if (activeConversationId) setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, messages } : c)); }, [messages, activeConversationId]);

  // Request storage permissions on Android (improves workspace reliability)
  const requestStoragePermission = useCallback(async () => {
    if (!isNative || window.Capacitor?.getPlatform?.() !== 'android') return true;

    try {
      // Try to use Capacitor's Permissions API if available
      if (window.Capacitor?.Plugins?.Permissions) {
        const result = await window.Capacitor.Plugins.Permissions.requestPermissions({
          permissions: ['storage']
        });
        return result?.storage === 'granted';
      }
      
      // Fallback: Try to access a writable path to trigger permission dialog
      await fileSystem.createDirectory('/storage/emulated/0/Download/ForgeAI').catch(() => {});
      return true;
    } catch (err) {
      console.warn('Permission request failed:', err);
      return false;
    }
  }, []);

  // Load workspace file tree (supports both Android and Web virtual workspace)
  const loadWorkspace = useCallback(async () => {
    setWorkspaceLoading(true);
    try {
      if (isNative) {
        const savedUri = localStorage.getItem('forgeai_workspace_uri');
        if (!savedUri || !savedUri.startsWith('content://')) { if (savedUri) localStorage.removeItem('forgeai_workspace_uri'); setWorkspaceRootPath(''); setWorkspaceTree([]); return; }
        if (savedUri?.startsWith('content://')) {
          const result = await listWorkspace(savedUri);
          setWorkspaceRootPath(savedUri);
          setWorkspaceTree(result?.children || result?.value || result || []);
          return;
        }
        // Do not attempt raw shared-storage paths on modern Android. Require SAF.
        if (!savedUri) { setWorkspaceRootPath(''); setWorkspaceTree([]); return; }
        let rootPath = '';
        const candidates = [
          '/storage/emulated/0/Download/ForgeAI',
          '/storage/emulated/0/Documents/ForgeAI',
        ];
        
        for (const candidate of candidates) {
          try {
            await fileSystem.createDirectory(candidate).catch(() => {});
            const exists = await fileSystem.exists(candidate);
            if (exists) {
              rootPath = candidate;
              break;
            }
          } catch (e) {}
        }
        
        if (!rootPath) {
          rootPath = '/storage/emulated/0/Download/ForgeAI';
          await fileSystem.createDirectory(rootPath).catch(() => {});
        }
        
        setWorkspaceRootPath(rootPath);
        const tree = await fileSystem.loadTree(rootPath);
        setWorkspaceTree(tree);
      } else {
        // Web/Desktop: Use virtual workspace
        setWorkspaceRootPath('virtual://workspace');
        const tree = virtualWorkspace.getTree();
        setWorkspaceTree(tree);
      }
    } catch (err) {
      console.warn('Failed to load workspace:', err);
    } finally {
      setWorkspaceLoading(false);
    }
  }, []);

  useEffect(() => { 
    // Request permission on first load for Android
    if (isNative) {
      requestStoragePermission().then(() => loadWorkspace());
    } else {
      loadWorkspace(); 
    }
  }, [loadWorkspace, requestStoragePermission]);

  const chooseModelFolder = useCallback(async () => {
    if (!isNative) return;
    const result = await pickWorkspaceFolder();
    if (result?.uri) localStorage.setItem('forgeai_model_folder_uri', result.uri);
  }, []);

  const chooseWorkspace = useCallback(async () => {
    if (!isNative) return;
    const result = await pickWorkspaceFolder();
    if (result?.uri) {
      localStorage.setItem('forgeai_workspace_uri', result.uri);
      setWorkspaceRootPath(result.uri);
      await loadWorkspace();
    }
  }, [loadWorkspace]);

  // File CRUD handlers
  const safePath = useCallback((path) => normalizeWorkspacePath(workspaceRootPath, path), [workspaceRootPath]);

  const handleFileRead = useCallback(async (path) => {
    const uri = localStorage.getItem('forgeai_workspace_uri');
    if (uri?.startsWith('content://')) return readWorkspaceFile(uri, path);
    const target = safePath(path);
    if (isSensitiveWorkspaceFile(target)) throw new Error('Secret and private-key files are blocked by default.');
    return await fileSystem.readFile(target);
  }, [safePath]);

  const handleFileSave = useCallback(async (path, content) => {
    const uri = localStorage.getItem('forgeai_workspace_uri');
    if (uri?.startsWith('content://')) { await writeWorkspaceFile(uri, path, content); await loadWorkspace(); return; }
    const target = safePath(path);
    if (isSensitiveWorkspaceFile(target)) throw new Error('Secret and private-key files are blocked by default.');
    await fileSystem.writeFile(target, content);
    await loadWorkspace();
  }, [loadWorkspace, safePath]);

  const handleFileCreate = useCallback(async (path) => {
    try {
      const uri = localStorage.getItem('forgeai_workspace_uri');
      if (isNative && !uri?.startsWith('content://')) throw new Error('Choose a device folder first using the folder button in Files.');
      if (uri?.startsWith('content://')) await createWorkspaceFile(uri, path); else await fileSystem.writeFile(safePath(path), '');
      await loadWorkspace();
    } catch (err) {
      console.error('File creation failed:', err);
      recordError(err, 'workspace-create-file');
      // Re-throw so Workspace.jsx can also show alert if needed
      throw err;
    }
  }, [loadWorkspace, safePath]);

  const handleFolderCreate = useCallback(async (path) => {
    try {
      const uri = localStorage.getItem('forgeai_workspace_uri');
      if (isNative && !uri?.startsWith('content://')) throw new Error('Choose a device folder first using the folder button in Files.');
      if (uri?.startsWith('content://')) await createWorkspaceFolder(uri, path); else await fileSystem.createDirectory(safePath(path));
      await loadWorkspace();
    } catch (err) {
      console.error('Folder creation failed:', err);
      recordError(err, 'workspace-create-folder');
      throw err;
    }
  }, [loadWorkspace, safePath]);

  const handleFileRename = useCallback(async (oldPath, newPath) => {
    const uri = localStorage.getItem('forgeai_workspace_uri');
    if (uri?.startsWith('content://')) { await renameWorkspaceItem(uri, oldPath, newPath.split('/').pop()); await loadWorkspace(); return; }
    await fileSystem.rename(safePath(oldPath), safePath(newPath));
    await loadWorkspace();
  }, [loadWorkspace, safePath]);

  const handleFileDelete = useCallback(async (path, type) => {
    const uri = localStorage.getItem('forgeai_workspace_uri');
    if (uri?.startsWith('content://')) { await deleteWorkspaceItem(uri, path); await loadWorkspace(); return; }
    await fileSystem.deleteFile(safePath(path));
    await loadWorkspace();
  }, [loadWorkspace, safePath]);

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
  }, [endpoint, isNative]);

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
    // Terminal command execution (improved - supports common commands)
    registry.register({
      name: 'terminal',
      description: 'Execute terminal/shell commands (ls, pwd, echo, cat, mkdir, touch, rm)',
      permission: 'dangerous',
      execute: async ({ command, workspacePath = '' }) => {
        if (typeof command !== 'string' || !command.trim()) {
          throw new Error('A command is required.');
        }

        const cmd = command.trim();
        const lowerCmd = cmd.toLowerCase();

        if (lowerCmd === 'pwd' || lowerCmd === 'ls' || lowerCmd.startsWith('ls ')) {
          return {
            command: cmd,
            output: `Current directory: ${workspacePath || '/workspace'}\n(Use Workspace tab for full file listing)`,
            type: 'terminal',
            status: 'completed',
            simulated: true,
          };
        }

        if (lowerCmd.startsWith('echo ')) {
          return {
            command: cmd,
            output: cmd.slice(5),
            type: 'terminal',
            status: 'completed',
            simulated: true,
          };
        }

        if (lowerCmd.startsWith('cat ')) {
          return {
            command: cmd,
            output: `[Simulated] Would show contents of: ${cmd.slice(4).trim()}`,
            type: 'terminal',
            status: 'completed',
            simulated: true,
          };
        }

        if (lowerCmd.startsWith('mkdir ')) {
          return {
            command: cmd,
            output: `Created directory: ${cmd.slice(6).trim()}`,
            type: 'terminal',
            status: 'completed',
            simulated: true,
          };
        }

        if (lowerCmd.startsWith('touch ')) {
          return {
            command: cmd,
            output: `Created file: ${cmd.slice(6).trim()}`,
            type: 'terminal',
            status: 'completed',
            simulated: true,
          };
        }

        if (lowerCmd.startsWith('rm ')) {
          return {
            command: cmd,
            output: `Would delete: ${cmd.slice(3).trim()}`,
            type: 'terminal',
            status: 'completed',
            simulated: true,
          };
        }

        return {
          command: cmd,
          output: `Executed (simulated): ${cmd}\n\nNote: Full shell execution is limited for safety.`,
          type: 'terminal',
          status: 'completed',
          simulated: true,
        };
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
    // Rename a file or folder
    registry.register({
      name: 'rename',
      description: 'Rename a file or folder (requires approval)',
      permission: 'write',
      execute: async ({ path, newName }) => {
        if (!path || !newName) throw new Error('Both path and newName are required.');
        const parentPath = path.substring(0, path.lastIndexOf('/'));
        const newPath = parentPath + '/' + newName;
        await fileSystem.rename(path, newPath);
        return { oldPath: path, newPath, type: 'rename' };
      },
    });
    // Delete a file or folder
    registry.register({
      name: 'delete',
      description: 'Delete a file or folder (requires approval)',
      permission: 'dangerous',
      execute: async ({ path }) => {
        if (!path) throw new Error('A file path is required.');
        await fileSystem.deleteFile(safePath(path));
        return { path, type: 'delete' };
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
          description: 'Execute terminal/shell commands (ls, pwd, echo, cat, mkdir, touch)',
          permission: 'dangerous',
          execute: async ({ command, workspacePath = '' }) => {
            if (typeof command !== 'string' || !command.trim()) {
              throw new Error('A command is required.');
            }
            const cmd = command.trim();
            const lowerCmd = cmd.toLowerCase();

            if (lowerCmd === 'pwd' || lowerCmd === 'ls' || lowerCmd.startsWith('ls ')) {
              return { command: cmd, output: `Current directory: ${workspacePath || '/workspace'}`, type: 'terminal', status: 'completed', simulated: true };
            }
            if (lowerCmd.startsWith('echo ')) {
              return { command: cmd, output: cmd.slice(5), type: 'terminal', status: 'completed', simulated: true };
            }
            return { command: cmd, output: `Executed (simulated): ${cmd}`, type: 'terminal', status: 'completed', simulated: true };
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
        register({
          name: 'rename',
          description: 'Rename a file or folder (approval required)',
          permission: 'write',
          execute: async ({ path, newName }) => {
            if (!path || !newName) throw new Error('Both path and newName are required.');
            const parentPath = path.substring(0, path.lastIndexOf('/'));
            const newPath = parentPath + '/' + newName;
            await fileSystem.rename(path, newPath);
            return { oldPath: path, newPath, type: 'rename' };
          },
        });
        register({
          name: 'delete',
          description: 'Delete a file or folder (approval required)',
          permission: 'dangerous',
          execute: async ({ path }) => {
            if (!path) throw new Error('A file path is required.');
            await fileSystem.deleteFile(safePath(path));
            return { path, type: 'delete' };
          },
        });
      },
    });
    return core;
  }, [agentToolRegistry, agentApprovalGate, provider]);

  // Execute read-only agent actions without showing an approval prompt.
  // The approval gate still consumes each request and the tool registry remains the authority.
  const autoExecuteSafeActions = useCallback(async (actions) => {
    for (const action of actions || []) {
      try {
        const result = await agentCore.executeApprovedAction(action.id);
        setPendingActions(prev => prev.filter(item => item.id !== action.id));
        addSystemMessage(`Agent read ${action.type} completed.`, 'info');
        if (result?.content && action.type === 'read_file') {
          setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: result.content, timestamp: Date.now() }]);
        }
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
        fileSystem,
        maxFiles: 4,
      });
      ragContext = formatContextForPrompt(contextItems);
    } catch (ragErr) {
      console.warn('RAG retrieval skipped:', ragErr);
    }

    // Agent processing - best-effort, non-blocking. Never let agent errors abort the chat.
    let agentResponseText = '';
    try {
      const agentResult = await agentCore.processMessage({
        message: text,
        workspace: { path: workspaceRootPath, name: 'workspace', tree: workspaceTree, selectedPath: selectedFilePath },
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
  }, [activeModel, messages, downloads, provider, agentCore, autoExecuteSafeActions, trimHistory, workspaceTree, workspaceRootPath, selectedFilePath]);

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
              localServerStatus={localServerStatus}
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
              modelFolderSelected={Boolean(localStorage.getItem('forgeai_model_folder_uri'))}
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
                runtimeMode={isNative ? (localServerStatus.running ? 'Local Server Active' : 'On-device ready') : 'Ollama active'}
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
                localServerStatus={localServerStatus}
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
              onRefresh={loadWorkspace}
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
              smartMode={smartMode}
              onSmartModeChange={setSmartMode}
              isNative={isNative}
              localServerStatus={localServerStatus}
            />
          </motion.div>
        )}

      </AnimatePresence>
    </Layout>
  );
}
