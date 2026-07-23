import { useState, useCallback, useEffect } from 'react';
import Layout from './components/Layout';
import ChatContainer from './components/ChatContainer';
import FilePanel from './components/FilePanel';
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
        { name: 'nativeBridge.js', type: 'file', path: 'src/nativeBridge.js' },
      ],
    },
    {
      name: 'public',
      type: 'folder',
      open: false,
      path: 'public',
      children: [
        { name: 'favicon.svg', type: 'file', path: 'public/favicon.svg' },
      ],
    },
    {
      name: 'package.json',
      type: 'file',
      path: 'package.json',
    },
    {
      name: 'vite.config.js',
      type: 'file',
      path: 'vite.config.js',
    },
    {
      name: 'README.md',
      type: 'file',
      path: 'README.md',
    },
    {
      name: '.env.example',
      type: 'file',
      path: '.env.example',
    },
  ],
};

export default function App() {
  const [filePanelOpen, setFilePanelOpen] = useState(false);
  const [workspace, setWorkspace] = useState(MOCK_WORKSPACE);
  const [selectedModel, setSelectedModel] = useState('llama3.1');
  const [modelStatus, setModelStatus] = useState('off');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [pendingActions, setPendingActions] = useState([]);

  // Check Ollama connection on mount
  useEffect(() => {
    checkOllama();
    const interval = setInterval(checkOllama, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const checkOllama = async () => {
    const result = await checkOllamaConnection();
    setModelStatus(result.connected ? 'idle' : 'off');
  };

  // Generate unique ID
  const generateId = () => {
    return Math.random().toString(36).substring(2, 15);
  };

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
    const sessionId = generateId();
    
    // Add user message
    addMessage('user', text);
    setIsTyping(true);
    setModelStatus('busy');
    
    // Haptic feedback on mobile
    if (isNative) {
      await haptics.light();
    }

    try {
      // Check if Ollama is connected
      const ollamaStatus = await checkOllamaConnection();
      
      if (!ollamaStatus.connected) {
        // Show offline message
        setTimeout(() => {
          addMessage('system', '⚠️ Ollama not connected. Please start Ollama locally:\n\n```\nollama serve\n```');
          addMessage('assistant', 'I\'m ready to help once Ollama is running. You can also try commands like "read @filename" or "create a new component".');
          setIsTyping(false);
          setModelStatus('off');
        }, 500);
        return;
      }

      // Simulate agent thinking and response
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

      const lowerText = text.toLowerCase();

      // Handle different commands
      if (lowerText.includes('read') || lowerText.includes('@')) {
        // Extract file reference
        const fileMatch = text.match(/@([\w./-]+)/);
        if (fileMatch) {
          const filename = fileMatch[1];
          addMessage('assistant', `I'll read the file @${filename}:\n\n\`\`\`\n// File contents would appear here\n// Using native file system access\n\`\`\`\n\nThis file contains the implementation. What would you like me to explain or modify?`);
        } else {
          addMessage('assistant', 'Which file would you like me to read? Use @filename to reference it.');
        }
      } else if (lowerText.includes('write') || lowerText.includes('create') || lowerText.includes('add')) {
        // Show pending action for file write
        const action = {
          id: generateId(),
          type: 'write_file',
          path: 'src/new-component.jsx',
          content: `import { useState } from 'react';

export default function NewComponent() {
  const [count, setCount] = useState(0);
  
  return (
    <div className="new-component">
      <h2>New Component</h2>
      <p>Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>
        Increment
      </button>
    </div>
  );
}
`,
          description: 'I\'ll create a new React component. Review the code below before I write it.',
        };
        setPendingActions(prev => [...prev, action]);
      } else if (lowerText.includes('help') || lowerText.includes('what can')) {
        addMessage('assistant', 'I can help you with:\n\n📁 **File Operations**\n- Read files: "read @filename"\n- Create files: "create a new component"\n- Edit files: "update the styling"\n\n💻 **Code Help**\n- Explain code: "explain this function"\n- Write tests: "add tests for this"\n- Debug: "fix this error"\n\n🔧 **Terminal**\n- Run commands: "install npm packages"\n\n🔀 **Git**\n- Commit: "commit these changes"\n\nJust ask naturally or use @filename to reference specific files.');
      } else if (lowerText.includes('hello') || lowerText.includes('hi')) {
        addMessage('assistant', 'Hey! 👋 I\'m ForgeAI, your local AI coding assistant.\n\nI\'m connected to your workspace and ready to help. Try:\n- "read @package.json" to see your dependencies\n- "create a new hook" to add a React hook\n- "help" to see all my capabilities\n\nWhat would you like to work on?');
      } else {
        // General response
        const responses = [
          'Got it! I can help you with that. Would you like me to read the relevant files first?',
          'I understand. Let me know which files you\'d like me to look at.',
          'I\'m ready to help. Just mention a file with @filename if you want me to reference specific code.',
          'Makes sense. What aspect would you like me to focus on?',
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
  }, []);

  // Handle action approval
  const handleApproveAction = useCallback(async (actionId) => {
    const action = pendingActions.find(a => a.id === actionId);
    if (!action) return;

    setPendingActions(prev => prev.filter(a => a.id !== actionId));
    
    if (isNative) {
      await haptics.medium();
    }

    // Simulate file write
    await new Promise(resolve => setTimeout(resolve, 500));
    
    addMessage('system', `✅ File written: ${action.path}`);
    addMessage('assistant', `Done! I've created ${action.path}. You can now import and use it in your project.`);
    
    if (isNative) {
      await haptics.success();
    }
  }, [pendingActions]);

  // Handle action discard
  const handleDiscardAction = useCallback((actionId) => {
    setPendingActions(prev => prev.filter(a => a.id !== actionId));
    addMessage('system', 'Action cancelled.');
  }, []);

  const toggleFilePanel = useCallback(() => {
    setFilePanelOpen(prev => !prev);
    if (isNative) {
      haptics.selection();
    }
  }, []);

  const handleFileSelect = useCallback((path) => {
    // When a file is selected, we could insert @path into the chat input
    console.log('File selected:', path);
  }, []);

  const handleWorkspaceChange = useCallback((newWorkspace) => {
    console.log('Workspace changed:', newWorkspace);
  }, []);

  const handleModelChange = useCallback((model) => {
    setSelectedModel(model);
    checkOllama();
  }, []);

  return (
    <Layout
      workspace={workspace.name}
      model={selectedModel}
      status={modelStatus}
      filePanelOpen={filePanelOpen}
      onToggleFilePanel={toggleFilePanel}
      onWorkspaceChange={handleWorkspaceChange}
      onModelChange={handleModelChange}
    >
      <FilePanel
        isOpen={filePanelOpen}
        onClose={() => setFilePanelOpen(false)}
        workspace={workspace}
        onFileSelect={handleFileSelect}
        onWorkspaceChange={handleWorkspaceChange}
      />

      <ChatContainer
        messages={messages}
        isTyping={isTyping}
        pendingActions={pendingActions}
        onSendMessage={handleSendMessage}
        onApproveAction={handleApproveAction}
        onDiscardAction={handleDiscardAction}
      />
    </Layout>
  );
}
