import { useState, useCallback, useRef } from 'react';

// Simple UUID generator without external dependency
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function useChat() {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [pendingActions, setPendingActions] = useState([]);
  const [status, setStatus] = useState('idle');
  const sessionIdRef = useRef(generateId());

  // Add a message to the chat
  const addMessage = useCallback((role, content, metadata = {}) => {
    const message = {
      id: generateId(),
      role,
      content,
      timestamp: Date.now(),
      ...metadata,
    };
    
    setMessages(prev => [...prev, message]);
    return message;
  }, []);

  // Send a message and get response
  const sendMessage = useCallback(async (text) => {
    const sessionId = sessionIdRef.current;
    
    // Add user message
    addMessage('user', text);
    setIsTyping(true);
    setStatus('busy');

    try {
      // Simulate agent response (will be replaced with real Ollama/web-llm)
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));

      // Example: Check if message suggests an action
      const lowerText = text.toLowerCase();
      
      if (lowerText.includes('write') || lowerText.includes('create') || lowerText.includes('add')) {
        // Simulate pending action
        const action = {
          id: generateId(),
          type: 'write_file',
          path: 'src/example.js',
          content: `// New file created by ForgeAI\n\nexport function hello() {\n  console.log('Hello from ForgeAI!');\n}\n`,
          description: 'I can create this file for you. Review the contents below.',
        };
        
        setPendingActions(prev => [...prev, action]);
        setIsTyping(false);
        setStatus('idle');
        return;
      }

      // Simulate regular response
      const responses = [
        "I've analyzed your workspace. What would you like me to help with?",
        "I can help you read, edit, or create files. Just let me know what you need.",
        "I'm ready to assist with your coding tasks. What should we work on?",
        "Your workspace looks good. What changes would you like to make?",
      ];
      
      const response = responses[Math.floor(Math.random() * responses.length)];
      addMessage('assistant', response);
      setIsTyping(false);
      setStatus('idle');

    } catch (error) {
      console.error('Chat error:', error);
      addMessage('system', 'Failed to get response. Please try again.');
      setIsTyping(false);
      setStatus('off');
    }
  }, [addMessage]);

  // Approve an action
  const approveAction = useCallback(async (actionId) => {
    const action = pendingActions.find(a => a.id === actionId);
    if (!action) return;

    // Remove from pending
    setPendingActions(prev => prev.filter(a => a.id !== actionId));

    // Execute the action (simulated - will be real file system ops)
    setIsTyping(true);
    setStatus('busy');

    await new Promise(resolve => setTimeout(resolve, 500));

    addMessage('system', `✅ File written: ${action.path}`);
    addMessage('assistant', `I've written the file to ${action.path}. You can now view and edit it.`);
    
    setIsTyping(false);
    setStatus('idle');
  }, [pendingActions, addMessage]);

  // Discard an action
  const discardAction = useCallback((actionId) => {
    setPendingActions(prev => prev.filter(a => a.id !== actionId));
    addMessage('system', 'Action cancelled.');
  }, [addMessage]);

  // Clear chat
  const clearChat = useCallback(() => {
    setMessages([]);
    setPendingActions([]);
    setStatus('idle');
  }, []);

  return {
    messages,
    isTyping,
    status,
    pendingActions,
    sendMessage,
    approveAction,
    discardAction,
    clearChat,
  };
}
