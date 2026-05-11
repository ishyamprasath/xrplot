'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, MessageSquare, Send, Trash2, Bot, User, Upload, ArrowLeft, Menu, X } from 'lucide-react';
import Link from 'next/link';
import ChatUploadModal from '@/components/ChatUploadModal';
import PromptModal from '@/components/prompt/PromptModal';

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialChatId = searchParams.get('id');

  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(initialChatId || null);
// ... rest of the state and functions ...
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingChats, setFetchingChats] = useState(true);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const fetchChats = useCallback(async () => {
    try {
      const res = await fetch('/api/chat');
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    } catch (err) {
      console.error('Failed to fetch chats:', err);
    } finally {
      setFetchingChats(false);
    }
  }, []);

  const fetchMessages = useCallback(async (chatId) => {
    if (!chatId) return;
    try {
      const res = await fetch(`/api/chat/${chatId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  useEffect(() => {
    if (activeChatId) {
      fetchMessages(activeChatId);
    } else {
      setMessages([]);
    }
  }, [activeChatId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createNewChat = async () => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      });
      if (res.ok) {
        const chat = await res.json();
        setChats(prev => [chat, ...prev]);
        setActiveChatId(chat._id);
      }
    } catch (err) {
      console.error('Failed to create chat:', err);
    }
  };

  const deleteChat = async (e, chatId) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;
    try {
      const res = await fetch(`/api/chat/${chatId}`, { method: 'DELETE' });
      if (res.ok) {
        setChats(prev => prev.filter(c => c._id !== chatId));
        if (activeChatId === chatId) {
          setActiveChatId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text.trim() || loading) return;

    // Handle cancel command
    if (text.toLowerCase() === 'cancel') {
      setUploadTarget(null);
      setEditTarget(null);
      setMessages(prev => [...prev, { role: 'user', content: text, timestamp: new Date().toISOString() }, { role: 'model', content: 'Operation cancelled.', timestamp: new Date().toISOString() }]);
      setInput('');
      return;
    }

    setLoading(true);
    setInput('');

    // Optimistically add user message
    const tempUserMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await fetch(`/api/chat/${activeChatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => {
          // Replace temp user message with actual if needed, then add assistant
          const withoutTemp = prev.filter(m => m !== tempUserMsg);
          return [...withoutTemp, { role: 'user', content: text, timestamp: new Date().toISOString() }, data.message];
        });

        // Update chat title in sidebar if changed
        if (data.chat?.title) {
          setChats(prev => prev.map(c => c._id === activeChatId ? { ...c, title: data.chat.title, updatedAt: data.chat.updatedAt } : c));
        }

        // Check if agent requested image upload
        if (data.message.functionName === 'requestImageUpload') {
          const args = data.message.functionArgs || {};
          setUploadTarget({ worldId: args.worldId, nodeId: args.nodeId });
        }

        // Check if agent requested node or world edit
        if (data.message.functionName === 'requestNodeEdit' || data.message.functionName === 'requestWorldEdit') {
          const res = data.message.functionResponse || {};
          setEditTarget({ 
            worldId: res.worldId, 
            nodeId: res.nodeId, 
            nodeData: res.nodeData,
            isWholeWorld: !!res.isWholeWorld
          });
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error || `Error ${res.status}: Something went wrong.`;
        setMessages(prev => [...prev, { role: 'model', content: `⚠️ ${errMsg}`, timestamp: new Date().toISOString() }]);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => [...prev, { role: 'model', content: `⚠️ ${err.message || 'Network error. Please try again.'}`, timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderMessageContent = (msg) => {
    if (!msg.content) return null;
    if (msg.role === 'user') return msg.content;
    // Parse markdown-like links for assistant
    const parts = msg.content.split(/(\[.*?\]\(.*?\))/g);
    return parts.map((part, i) => {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        return <a key={i} href={match[2]} target="_blank" rel="noreferrer">{match[1]}</a>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const handleUploadComplete = () => {
    const worldId = uploadTarget?.worldId;
    setUploadTarget(null);
    if (worldId) {
      // Simulate user saying they finished uploading
      setInput('I have finished uploading the images.');
    }
  };

  const handleEditComplete = async () => {
    const target = editTarget;
    const worldId = target?.worldId;
    const isWholeWorld = target?.isWholeWorld;
    const nodeId = target?.nodeId;
    const nodeLabel = target?.nodeData?.label;

    setEditTarget(null);
    
    if (worldId) {
      if (isWholeWorld) {
        setInput(`I have finished editing the whole world. Provide the build and preview link for world ${worldId}.`);
      } else {
        setInput(`I have finished editing the node ${nodeLabel || nodeId}. Provide the preview link for node ${nodeId} in world ${worldId}.`);
      }
    }
  };

  useEffect(() => {
    if (input.startsWith('I have finished uploading') || input.startsWith('I have finished editing')) {
      sendMessage();
    }
  }, [input]);

  return (
    <div className="chat-layout">
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Chat Sidebar */}
      <div className={`chat-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="chat-sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
            <ArrowLeft size={18} />
            <span>Back</span>
          </Link>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Conversations</h3>
          <button className="new-chat-btn" onClick={createNewChat} title="New Chat" style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'var(--violet)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginLeft: 'auto' }}>
            <Plus size={18} />
          </button>
        </div>

        <div className="chat-list">
          {fetchingChats ? (
            <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading...</div>
          ) : chats.length === 0 ? (
            <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No conversations yet</div>
          ) : (
            chats.map(chat => (
              <button
                key={chat._id}
                className={`chat-list-item ${activeChatId === chat._id ? 'active' : ''}`}
                onClick={() => { setActiveChatId(chat._id); setSidebarOpen(false); }}
              >
                <MessageSquare size={16} />
                <span className="chat-title">{chat.title || 'New Chat'}</span>
                <span
                  onClick={(e) => deleteChat(e, chat._id)}
                  style={{ opacity: 0.5, cursor: 'pointer', transition: 'opacity 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
                >
                  <Trash2 size={14} />
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Main */}
      <div className="chat-main">
        {activeChatId ? (
          <>
            <div className="chat-header">
              <h2><Bot size={18} style={{ marginRight: 8, verticalAlign: 'middle', color: 'var(--violet-light)' }} /> XRPlot Agent</h2>
            </div>

            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="empty-chat-state">
                  <Bot size={48} style={{ color: 'var(--violet-light)', opacity: 0.5 }} />
                  <h3>How can I help you today?</h3>
                  <p>I can create worlds, nodes, connections, folders, and predictions for you.<br/>Just ask me anything!</p>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div key={idx} className={`chat-message ${msg.role}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: '0.75rem', fontWeight: 600, opacity: 0.7 }}>
                    {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                    {msg.role === 'user' ? 'You' : 'Agent'}
                  </div>
                  <div>{renderMessageContent(msg)}</div>
                </div>
              ))}

              {loading && (
                <div className="chat-message assistant" style={{ opacity: 0.7 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Bot size={14} />
                    <div className="spinner" style={{ width: 16, height: 16 }} />
                    <span style={{ fontSize: '0.85rem' }}>Thinking...</span>
                  </div>
                </div>
              )}

              {/* Upload prompt if agent requested it */}
              {uploadTarget && (
                <div className="chat-upload-prompt">
                  <p>Upload images for this node?</p>
                  <button className="upload-trigger-btn" onClick={() => setUploadTarget({ ...uploadTarget, open: true })}>
                    <Upload size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                    Open Upload
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
              <textarea
                className="chat-input"
                rows={1}
                placeholder="Ask the agent to create worlds, nodes, folders..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button className="chat-send-btn" onClick={sendMessage} disabled={loading || !input.trim()}>
                <Send size={20} />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="chat-header">
              <button 
                className="chat-menu-btn"
                onClick={() => setSidebarOpen(true)}
                title="Open conversations"
              >
                <Menu size={20} />
              </button>
              <h2>Chat Interface</h2>
            </div>
            <div className="empty-chat-state">
              <MessageSquare size={48} style={{ opacity: 0.3 }} />
              <h3>Select or start a conversation</h3>
              <p>Choose a chat from the sidebar or click the + button to begin.</p>
              <button 
                className="btn btn-primary" 
                onClick={() => setSidebarOpen(true)}
                style={{ marginTop: '16px' }}
              >
                <Menu size={16} style={{ marginRight: 8 }} /> Open Conversations
              </button>
            </div>
          </>
        )}
      </div>

      {uploadTarget?.open && (
        <ChatUploadModal
          worldId={uploadTarget.worldId}
          nodeId={uploadTarget.nodeId}
          onClose={() => setUploadTarget(null)}
          onComplete={handleUploadComplete}
        />
      )}

      {editTarget && (
        <PromptModal
          worldId={editTarget.worldId}
          nodeData={editTarget.nodeData}
          onClose={() => setEditTarget(null)}
          onComplete={handleEditComplete}
        />
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="chat-layout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
