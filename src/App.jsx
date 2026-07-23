import { useState, useCallback } from 'react';
import Layout from './components/Layout';
import ChatContainer from './components/ChatContainer';
import FilePanel from './components/FilePanel';
import useChat from './hooks/useChat';
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
        ]},
        { name: 'App.jsx', type: 'file', path: 'src/App.jsx' },
        { name: 'main.jsx', type: 'file', path: 'src/main.jsx' },
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

  const {
    messages,
    isTyping,
    status,
    pendingActions,
    sendMessage,
    approveAction,
    discardAction,
  } = useChat();

  const toggleFilePanel = useCallback(() => {
    setFilePanelOpen(prev => !prev);
  }, []);

  const handleFileSelect = useCallback((path) => {
    // When a file is selected, we could insert @path into the chat input
    console.log('File selected:', path);
  }, []);

  const handleWorkspaceChange = useCallback((newWorkspace) => {
    // In a real app, this would load a different workspace
    console.log('Workspace changed:', newWorkspace);
  }, []);

  const handleModelChange = useCallback((model) => {
    setSelectedModel(model);
  }, []);

  return (
    <Layout
      workspace={workspace.name}
      model={selectedModel}
      status={status}
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
        onSendMessage={sendMessage}
        onApproveAction={approveAction}
        onDiscardAction={discardAction}
      />
    </Layout>
  );
}
