import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from './components/Layout';
import ChatContainer from './components/ChatContainer';
import FilePanel from './components/FilePanel';
import ModelZoo from './components/ModelZoo';
import MyCollection from './components/MyCollection';
import useModelCollection from './hooks/useModelCollection';
import { checkOllamaConnection, haptics, isNative } from './nativeBridge';
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
          { name: 'FilePanel.jsx', type: 'file', path: 'src/components/FilePanel.jsx' },
        ]},
        { name: 'hooks', type: 'folder', open: false, path: 'src/hooks', children: [
          { name: 'useChat.js', type: 'file', path: 'src/hooks/useChat.js' },
          { name: 'useOllama.js', type: 'file', path: 'src/hooks/useOllama.js' },
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

// Screen types
const SCREENS = {
  CHAT: 'chat',
  ZOO: 'zoo',
  COLLECTION: 'collection',
};

export default function App() {
  // Screen state
  const [currentScreen, setCurrentScreen] = useState(SCREENS.CHAT);
  
  // UI state
  const [filePanelOpen, setFilePanelOpen] = useState(false);
  const [workspace] = useState(MOCK_WORKSPACE);
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [pendingActions, setPendingActions] = useState([]);
  
  // Ollama state
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [modelStatus, setModelStatus] = useState('off');
  
  // Model collection
  const {
    models: downloadedModels,
    activeModel,
    downloadModel,
    deleteModel,
    setActiveModel,
    stopModel,
    isDownloaded,
    getDeviceCapability,
  } = useModelCollection();

  // Device capability
  const [deviceCapability] = useState(getDeviceCapability);

  // Check Ollama connection
  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
    const result = await checkOllamaConnection();
    setOllamaConnected(result.connected);
    if (!result.connected && !activeModel) {
      setModelStatus('off');
    }
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

  // Handle sending message
  const handleSendMessage = useCallback(async (text) => {
    if (!activeModel) {
      addMessage('system', 'Please select a model from My Collection first.');
      return;
    }

    addMessage('user', text);
    setIsTyping(true);
    setModelStatus('busy');

    if (isNative) {
      await haptics.light();
    }

    try {
      // Simulate AI response
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));

      const lowerText = text.toLowerCase();

      if (lowerText.includes('help') || lowerText.includes('what can')) {
        addMessage('assistant', `I'm running **${activeModel.name}**!\n\nI can help you with:\n\n📁 **File Operations**\n- Read files: "read @filename"\n- Create files: "create a new component"\n\n💻 **Code Help**\n- Explain code\n- Write tests\n- Debug errors\n\nJust ask naturally!`);
      } else if (lowerText.includes('hello') || lowerText.includes('hi')) {
        addMessage('assistant', `Hey! 👋 I'm ForgeAI, powered by **${activeModel.name}**.\n\nI'm ready to help with your coding. What would you like to work on?`);
      } else if (lowerText.includes('write') || lowerText.includes('create')) {
        const action = {
          id: generateId(),
          type: 'write_file',
          path: 'src/new-file.jsx',
          content: `// Created by ForgeAI\n\nconst NewComponent = () => {\n  return (\n    <div className="new-component">\n      <h2>Hello from ${activeModel.name}!</h2>\n    </div>\n  );\n};\n\nexport default NewComponent;`,
          description: 'I\'ll create this file for you. Review before writing.',
        };
        setPendingActions(prev => [...prev, action]);
      } else {
        const responses = [
          `I understand. Let me help you with that using ${activeModel.name}.`,
          'Got it! I can work on that for you.',
          `That's a great task for ${activeModel.name}. Let me take a look.`,
          'I\'m here to help. What specific aspect would you like me to focus on?',
        ];
        addMessage('assistant', responses[Math.floor(Math.random() * responses.length)]);
      }

      if (isNative) {
        await haptics.success();
      }
    } catch (error) {
      console.error('Chat error:', error);
      addMessage('system', 'Something went wrong. Please try again.');
      if (isNative) {
        await haptics.error();
      }
    } finally {
      setIsTyping(false);
      setModelStatus('idle');
    }
  }, [activeModel, isNative]);

  // Handle action approval
  const handleApproveAction = useCallback(async (actionId) => {
    const action = pendingActions.find(a => a.id === actionId);
    if (!action) return;

    setPendingActions(prev => prev.filter(a => a.id !== actionId));
    if (isNative) {
      await haptics.medium();
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    addMessage('system', `✅ File written: ${action.path}`);
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
  const handleDownload = useCallback(async (model) => {
    const result = await downloadModel(model);
    if (result.success) {
      addMessage('system', `✅ ${model.name} downloaded successfully!`);
      if (isNative) {
        await haptics.success();
      }
    }
  }, [downloadModel, isNative]);

  // Handle model selection
  const handleSelectModel = useCallback((model) => {
    setActiveModel(model);
    setModelStatus('idle');
    addMessage('system', `🔄 Switched to **${model.name}**`);
    if (isNative) {
      haptics.medium();
    }
    // Auto-switch to chat
    setTimeout(() => setCurrentScreen(SCREENS.CHAT), 500);
  }, [setActiveModel, isNative]);

  // Handle model deletion
  const handleDeleteModel = useCallback((model) => {
    deleteModel(model.id);
    addMessage('system', `🗑️ **${model.name}** deleted from collection`);
  }, [deleteModel]);

  // Screen switching
  const screenVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <Layout
      workspace={workspace.name}
      model={activeModel?.name || 'No model'}
      status={modelStatus}
      filePanelOpen={filePanelOpen}
      onToggleFilePanel={() => setFilePanelOpen(prev => !prev)}
      onScreenChange={setCurrentScreen}
      currentScreen={currentScreen}
      modelCount={downloadedModels.length}
    >
      {/* File Panel */}
      <AnimatePresence>
        {filePanelOpen && (
          <FilePanel
            isOpen={filePanelOpen}
            onClose={() => setFilePanelOpen(false)}
            workspace={workspace}
          />
        )}
      </AnimatePresence>

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
              onApproveAction={handleApproveAction}
              onDiscardAction={handleDiscardAction}
              noModelSelected={!activeModel}
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
              onOpenZoo={() => setCurrentScreen(SCREENS.ZOO)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
