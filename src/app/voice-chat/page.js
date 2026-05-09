'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { Bot, Volume2, Loader2, Phone, PhoneOff, Activity, X, Mic } from 'lucide-react';
import { tools } from '@/lib/agent-tools';
import ChatUploadModal from '@/components/ChatUploadModal';
import PromptModal from '@/components/prompt/PromptModal';

// Gemini Live API Configuration
// Using gemini-3.1-flash-live-preview for native audio support via WebSocket
const MODEL_NAME = 'gemini-3.1-flash-live-preview';
const WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

export default function VoiceChatPage() {
  const { user, isLoaded } = useUser();
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Idle');
  const [modelOutput, setModelOutput] = useState('');
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [uploadTarget, setUploadTarget] = useState(null); // For AI-requested uploads
  const [editTarget, setEditTarget] = useState(null); // For AI-requested edits
  
  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const micLevelRef = useRef(0);
  const micAnimationRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const intentionalCloseRef = useRef(false);
  const isExecutingToolRef = useRef(false);
  const messageQueueRef = useRef([]);
  const isProcessingQueueRef = useRef(false);

  // Audio configuration
  const INPUT_SAMPLE_RATE = 16000;
  const OUTPUT_SAMPLE_RATE = 24000;

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  const startSession = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      setStatus('Initializing...');

      // 1. Get API Key
      const configRes = await fetch('/api/agent/config');
      const configData = await configRes.json();
      
      if (!configRes.ok) {
        throw new Error(configData.error || 'Failed to get API key');
      }
      
      const apiKey = configData.apiKey;
      if (!apiKey) throw new Error('API key not configured');

      // 2. Setup Audio Context first (user gesture required)
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      setStatus('Connecting...');

      // 3. Connect WebSocket - model goes in config body, not URL
      const wsUrl = `${WS_URL}?key=${apiKey}`;
      socketRef.current = new WebSocket(wsUrl);
      socketRef.current.binaryType = 'arraybuffer';

      socketRef.current.onopen = () => {
        console.log('[Voice Chat] WebSocket connected - waiting 100ms before setup...');
        setStatus('Setting up...');
        
        // Small delay to ensure WebSocket is fully ready
        setTimeout(() => {
          console.log('[Voice Chat] Sending setup message now...');
          sendSetupMessage();
        }, 100);
        
        // Set timeout for setup response
        connectionTimeoutRef.current = setTimeout(() => {
          if (isConnecting) {
            console.error('[Voice Chat] Setup timeout - no setupComplete received');
            setError('Connection timeout: Server did not respond. Check console for server response.');
            setIsConnecting(false);
            setStatus('Timeout');
            stopSession();
          }
        }, 10000); // 10 second timeout
      };

      socketRef.current.onmessage = async (event) => {
        try {
          let text = "";
          if (event.data instanceof Blob) {
            text = await event.data.text();
          } else if (event.data instanceof ArrayBuffer) {
            const decoder = new TextDecoder('utf-8');
            text = decoder.decode(event.data);
          } else {
            text = event.data;
          }

          // Debug logging - log all messages during connection/setup
          console.log('[Voice Chat] Raw message:', text);

          let data;
          try {
            data = JSON.parse(text);
          } catch (parseErr) {
            console.error('[Voice Chat] JSON parse error:', parseErr);
            return;
          }
          
          // Check for errors
          if (data.error) {
            console.error('[Voice Chat] Server error:', data.error);
            setError(`Server error: ${data.error.message || data.error.code || JSON.stringify(data.error)}`);
            setIsConnecting(false);
            return;
          }
          
          // Handle setup complete - this is the successful connection signal
          // Server sends setupComplete as {} (truthy object) or true
          if (data.setupComplete) {
            console.log('[Voice Chat] Setup complete - connection established');
            // Clear timeout
            if (connectionTimeoutRef.current) {
              clearTimeout(connectionTimeoutRef.current);
              connectionTimeoutRef.current = null;
            }
            setIsConnecting(false);
            setIsActive(true);
            setStatus('In Call');
            
            // Start microphone after setup is confirmed
            await startMic();
            
            // Send initial greeting prompt
            setTimeout(() => {
              if (socketRef.current?.readyState === WebSocket.OPEN) {
                sendClientContent("Introduce yourself naturally as the XRPlot Voice Assistant. Be friendly and ask how you can help today.");
              }
            }, 800);
            return;
          }
          
          // Log other message types for debugging
          if (data.serverContent) {
            // Log transcription - this shows what the AI heard
            if (data.serverContent.inputTranscription) {
              console.log('[Voice Chat] 🎤 You said:', data.serverContent.inputTranscription.text);
            }
            if (data.serverContent.outputTranscription) {
              console.log('[Voice Chat] 🤖 AI said:', data.serverContent.outputTranscription.text);
            }
            if (data.serverContent.modelTurn) {
              console.log('[Voice Chat] Model turn received');
            }
          }
          
          // Handle other messages
          handleModelMessage(data);
          
        } catch (err) {
          console.error('[Voice Chat] Error parsing message:', err);
        }
      };

      socketRef.current.onerror = (e) => {
        console.error('[Voice Chat] WebSocket Error:', e);
        setError('Connection failed. Please check your API key and network connection.');
        setIsConnecting(false);
        setStatus('Connection Failed');
      };

      socketRef.current.onclose = (event) => {
        console.log(`[Voice Chat] Connection closed: Code=${event.code}, Reason=${event.reason || 'none'}, Intentional=${intentionalCloseRef.current}, ToolExecuting=${isExecutingToolRef.current}`);
        
        // Only show error if close was NOT intentional by user AND not during tool execution
        if (!intentionalCloseRef.current) {
          if (event.code === 1007) {
            // Protocol error - usually from sending invalid message format
            console.error('[Voice Chat] Protocol error 1007 - message format invalid');
            setError('Connection protocol error. The session has been reset. Please try again.');
          } else if (event.code === 1008 && isExecutingToolRef.current) {
            // 1008 during tool execution is a timeout from long-running operation
            console.log('[Voice Chat] Connection timed out during long operation - this is expected');
            setStatus('Operation in Progress...');
          } else if (event.code !== 1000 && event.code !== 1001) {
            setError(`Call ended unexpectedly (Code: ${event.code}). ${event.reason || 'Connection lost.'}`);
          }
        }
        
        // Reset flags
        intentionalCloseRef.current = false;
        isExecutingToolRef.current = false;
        
        if (isActive && event.code !== 1008) {
          setStatus('Call Ended');
        }
        cleanupSession();
      };

    } catch (err) {
      console.error('[Voice Chat] Session start error:', err);
      setError(err.message || 'Failed to start voice session');
      setIsConnecting(false);
      setStatus('Error');
      cleanupSession();
    }
  };

  const cleanupSession = () => {
    // Reset intentional close flag
    intentionalCloseRef.current = false;
    
    // Clear connection timeout
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    // Reset tool execution flag
    isExecutingToolRef.current = false;
    
    // Clear message queue
    messageQueueRef.current = [];
    isProcessingQueueRef.current = false;
    
    // Stop mic level animation
    if (micAnimationRef.current) {
      cancelAnimationFrame(micAnimationRef.current);
      micAnimationRef.current = null;
    }
    setMicLevel(0);
    micLevelRef.current = 0;

    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch (e) {}
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
  };

  const stopSession = () => {
    intentionalCloseRef.current = true; // Mark as intentional close
    
    setIsActive(false);
    setIsConnecting(false);
    setIsAgentSpeaking(false);
    setStatus('Idle');
    setModelOutput('');
    audioQueueRef.current = [];
    isPlayingRef.current = false;

    if (socketRef.current) {
      // Just close the WebSocket - no need to send endOfSession message
      if (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING) {
        socketRef.current.close(1000, 'User ended call');
      }
      socketRef.current = null;
    }

    cleanupSession();
  };

  const safeSend = (message, messageType = 'unknown') => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      console.warn(`[Voice Chat] Cannot send ${messageType}: WebSocket not open`);
      return false;
    }
    
    try {
      const jsonString = JSON.stringify(message);
      // Validate JSON before sending
      JSON.parse(jsonString); // This will throw if invalid
      
      // Log message size for debugging
      console.log(`[Voice Chat] Sending ${messageType}:`, jsonString.length, 'bytes');
      
      socketRef.current.send(jsonString);
      return true;
    } catch (err) {
      console.error(`[Voice Chat] Failed to send ${messageType}:`, err.message);
      return false;
    }
  };

  const sendSetupMessage = () => {
    // Using 'setup' (not 'config') as per working Google example
    const setupMessage = {
      setup: {
        model: `models/${MODEL_NAME}`,
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Kore"
              }
            }
          }
        },
        systemInstruction: {
          parts: [{
            text: "You are XRPlot Voice Assistant, a helpful AI that helps users navigate and manage their spatial worlds, nodes, and folders. You have full control over the application. You can: Create/Update/Delete worlds, folders, and nodes. List worlds (getWorlds), list folders (getFolders), and show world details (getWorld). Move worlds to folders (updateWorld with folderId) and nest folders (updateFolder with parentId). Trigger Decade 2.0 predictions. Be concise, friendly, and conversational."
          }]
        },
        // Enable tools so AI can actually perform actions
        tools: [{ functionDeclarations: tools }],
        // Enable transcription so we can see what the AI hears
        inputAudioTranscription: {}
      }
    };
    
    console.log('[Voice Chat] Sending setup with', tools.length, 'tools');
    console.log('[Voice Chat] Setup message:', JSON.stringify(setupMessage, null, 2));
    return safeSend(setupMessage, 'setup message');
  };

  const sendClientContent = (text) => {
    const message = {
      clientContent: {
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true
      }
    };
    
    return safeSend(message, 'client content');
  };

  const startMic = async () => {
    try {
      console.log('[Voice Chat] Requesting microphone access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      console.log('[Voice Chat] Microphone access granted');
      mediaStreamRef.current = stream;

      // Ensure audio context is running
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const source = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(512, 1, 1);

      let lastAudioSendTime = 0;
      const AUDIO_THROTTLE_MS = 50; // Send audio every 50ms (20 chunks per second)
      
      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Calculate microphone level for visualization
        let sum = 0;
        let hasSound = false;
        for (let i = 0; i < inputData.length; i++) {
          sum += Math.abs(inputData[i]);
          if (Math.abs(inputData[i]) > 0.01) hasSound = true;
        }
        const avg = sum / inputData.length;
        micLevelRef.current = Math.max(micLevelRef.current * 0.8, avg * 3); // Smooth decay
        
        // Throttle audio sending to prevent flooding
        const now = Date.now();
        if (now - lastAudioSendTime < AUDIO_THROTTLE_MS) return;
        lastAudioSendTime = now;
        
        // Convert Float32 to PCM16
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        
        try {
          // Convert to base64 using efficient method
          const uint8Array = new Uint8Array(pcmData.buffer);
          let binary = '';
          const len = uint8Array.length;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(uint8Array[i]);
          }
          const base64 = btoa(binary);
          
          // Send audio chunk using correct Gemini Live API format
          const message = {
            realtimeInput: {
              audio: {
                data: base64,
                mimeType: "audio/pcm"
              }
            }
          };
          
          safeSend(message, 'audio chunk');
          
          // Debug: log when audio is being sent
          if (hasSound && Math.random() < 0.02) {
            console.log('[Voice Chat] Sending audio chunk:', base64.length, 'chars, level:', avg.toFixed(3));
          }
        } catch (sendErr) {
          console.error('[Voice Chat] Error sending audio:', sendErr);
        }
      };

      // Start microphone level animation
      const updateMicLevel = () => {
        setMicLevel(micLevelRef.current);
        micAnimationRef.current = requestAnimationFrame(updateMicLevel);
      };
      micAnimationRef.current = requestAnimationFrame(updateMicLevel);

      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
      // Note: Connecting to destination is needed for the processor to work
      
      console.log('[Voice Chat] Microphone streaming started - speak now!');
    } catch (err) {
      console.error('[Voice Chat] Microphone error:', err);
      setError('Microphone access denied. Please allow microphone permissions and refresh.');
    }
  };

  const handleModelMessage = async (data) => {
    const serverContent = data.serverContent;
    const toolCall = data.toolCall;

    if (serverContent) {
      const modelTurn = serverContent.modelTurn;
      if (modelTurn && modelTurn.parts) {
        for (const part of modelTurn.parts) {
          if (part.text) {
            setModelOutput(prev => prev + ' ' + part.text);
          }
          const inlineData = part.inlineData;
          if (inlineData && inlineData.mimeType && inlineData.mimeType.startsWith('audio')) {
            playAudioChunk(inlineData.data);
          }
        }
      }
      
      if (serverContent.interrupted) {
        audioQueueRef.current = [];
        setIsAgentSpeaking(false);
        isPlayingRef.current = false;
      }
    }

    if (toolCall) {
      console.log('[Voice Chat] 🔧 Tool call received:', toolCall);
      setStatus('Agent Thinking...');
      isExecutingToolRef.current = true; // Mark that we're executing a tool
      const functionCalls = toolCall.functionCalls;
      const functionResponses = [];

      for (const call of functionCalls) {
        console.log('[Voice Chat] Executing tool:', call.name, 'with args:', call.args);
        try {
          const res = await fetch('/api/agent/tool', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ toolName: call.name, args: call.args || {} })
          });
          const result = await res.json();
          console.log('[Voice Chat] Tool result:', call.name, result);
          
          // Ensure result is an object for the response field
          const formattedResult = (typeof result === 'object' && result !== null) ? result : { result };
          
          functionResponses.push({ 
            id: call.id, 
            response: formattedResult 
          });
          
          // Check for specific tools that need UI popups
          if (call.name === 'requestImageUpload') {
            console.log('[Voice Chat] AI requested image upload for:', result);
            setUploadTarget({ worldId: result.worldId, nodeId: result.nodeId });
          }
          
          if (call.name === 'requestNodeEdit' || call.name === 'requestWorldEdit') {
            console.log('[Voice Chat] AI requested edit for:', result);
            setEditTarget({
              worldId: result.worldId,
              nodeId: result.nodeId,
              nodeData: result.nodeData,
              isWholeWorld: call.name === 'requestWorldEdit'
            });
          }
        } catch (err) {
          console.error('[Voice Chat] Tool error:', call.name, err.message);
          functionResponses.push({ id: call.id, response: { error: err.message } });
        }
      }

      const toolResponse = {
        tool_response: { function_responses: functionResponses }
      };
      console.log('[Voice Chat] Sending tool response:', toolResponse);
      safeSend(toolResponse, 'tool response');
      setStatus('In Call');
    }
  };

  const playAudioChunk = (base64) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    const pcm = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) {
      float32[i] = pcm[i] / 0x7FFF;
    }

    audioQueueRef.current.push(float32);
    if (!isPlayingRef.current) {
      playNextChunk();
    }
  };

  const playNextChunk = () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsAgentSpeaking(false);
      return;
    }

    isPlayingRef.current = true;
    setIsAgentSpeaking(true);
    const chunk = audioQueueRef.current.shift();
    const buffer = audioContextRef.current.createBuffer(1, chunk.length, OUTPUT_SAMPLE_RATE);
    buffer.getChannelData(0).set(chunk);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextRef.current.destination);
    source.onended = playNextChunk;
    source.start();
  };

  const handleUploadComplete = () => {
    // Called when ChatUploadModal finishes uploading node images
    setUploadTarget(null);
    
    // Tell the AI that upload is complete via voice
    const message = {
      clientContent: {
        turns: [{ 
          role: 'user', 
          parts: [{ text: "I have finished uploading the images." }] 
        }],
        turnComplete: true
      }
    };
    safeSend(message, 'upload completion');
    console.log('[Voice Chat] Upload completion sent to AI');
  };

  const handleEditComplete = () => {
    // Called when PromptModal finishes editing
    setEditTarget(null);
    
    // Tell the AI that edit is complete via voice
    const message = {
      clientContent: {
        turns: [{ 
          role: 'user', 
          parts: [{ text: "I have finished editing." }] 
        }],
          turnComplete: true
        }
      };
    safeSend(message, 'edit completion');
    console.log('[Voice Chat] Edit completion sent to AI');
  };

  if (!isLoaded) return null;

  return (
    <div className="voice-chat-container">
      <div className="voice-header">
        <div className="status-badge">
          <div className={`status-dot ${(isActive || isConnecting) ? 'pulse' : ''}`}></div>
          <span>{status}</span>
        </div>
        <h1>Agentic Voice</h1>
        <p className="subtitle">Live conversation with your assistant</p>
      </div>

      <div className="avatar-container">
        {/* AI Avatar / Voice Visualization */}
        <div className={`avatar-ring ${isActive ? 'active' : ''} ${isAgentSpeaking ? 'speaking' : ''}`}>
          <div className="avatar-inner">
            {isAgentSpeaking ? (
              <div className="sound-waves">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            ) : isActive ? (
              <div className="listening-indicator">
                <Activity size={28} className="pulse-icon" />
              </div>
            ) : (
              <Mic size={40} />
            )}
          </div>
        </div>
        
        {/* Status Text */}
        <div className="status-text">
          {isAgentSpeaking ? (
            <span className="speaking-text">
              <Volume2 size={16} />
              AI is speaking...
            </span>
          ) : isActive ? (
            <span className="listening-text">
              <span className="live-dot" />
              Listening
            </span>
          ) : (
            <span className="ready-text">Ready to talk</span>
          )}
        </div>
      </div>

      <div className="voice-controls">
        {!isActive && !isConnecting ? (
          <button className="voice-btn start-call" onClick={startSession}>
            <Phone size={24} />
            <span>Start Live Call</span>
          </button>
        ) : isConnecting ? (
          <button className="voice-btn loading" disabled>
            <Loader2 className="animate-spin" size={24} />
            <span>Connecting...</span>
          </button>
        ) : (
          <div className="call-controls">
            <button className="voice-btn stop-call" onClick={stopSession}>
              <PhoneOff size={24} />
              <span>End Call</span>
            </button>
          </div>
        )}
      </div>

      {/* AI-Requested Upload Modal (ChatUploadModal for node/world uploads) */}
      {uploadTarget && (
        <ChatUploadModal
          worldId={uploadTarget.worldId}
          nodeId={uploadTarget.nodeId}
          onClose={() => setUploadTarget(null)}
          onComplete={handleUploadComplete}
        />
      )}

      {/* AI-Requested Edit Modal (PromptModal for node/world editing) */}
      {editTarget && (
        <PromptModal
          worldId={editTarget.worldId}
          nodeId={editTarget.nodeId}
          nodeData={editTarget.nodeData}
          isWholeWorld={editTarget.isWholeWorld}
          onClose={() => setEditTarget(null)}
          onComplete={handleEditComplete}
        />
      )}

      {error && (
        <div className="error-container">
          <div className="error-box">
            <p>{error}</p>
            <button className="voice-btn dismiss-btn" onClick={() => setError(null)}>Dismiss</button>
          </div>
        </div>
      )}

      <div className="voice-feedback">
        {modelOutput && (
          <div className="output-box">
            <p className="transcript-text">{modelOutput}</p>
          </div>
        )}
      </div>

      <style jsx>{`
        .voice-chat-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: calc(100vh - 65px);
          padding: 2rem;
          background: var(--bg-primary);
          color: var(--text-primary);
        }

        @media (max-width: 768px) {
          .voice-chat-container {
            min-height: calc(100vh - 65px);
            padding: 1rem;
            justify-content: flex-start;
            padding-top: 3rem;
          }

          .voice-header {
            margin-bottom: 1.5rem;
          }

          .voice-header h1 {
            font-size: 1.5rem;
          }

          .avatar-container {
            margin-bottom: 2rem;
          }

          .avatar-ring {
            width: 120px;
            height: 120px;
          }

          .avatar-inner {
            width: 80px;
            height: 80px;
          }

          .voice-btn {
            padding: 12px 24px;
            font-size: 0.9rem;
          }

          .voice-btn span {
            display: none;
          }

          .output-box {
            max-width: 100%;
            margin: 0 1rem;
            padding: 1rem;
          }

          .error-container {
            top: 1rem;
            left: 1rem;
            right: 1rem;
            transform: none;
          }

          .error-box {
            padding: 1rem;
          }
        }

        @media (max-width: 480px) {
          .voice-chat-container {
            min-height: calc(100vh - 60px);
            padding: 0.75rem;
            padding-top: 2rem;
          }

          .voice-header h1 {
            font-size: 1.25rem;
          }

          .avatar-ring {
            width: 100px;
            height: 100px;
          }

          .avatar-inner {
            width: 70px;
            height: 70px;
          }

          .avatar-inner svg {
            width: 28px;
            height: 28px;
          }
        }

        .voice-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-secondary);
          padding: 8px 16px;
          border-radius: 30px;
          font-size: 0.85rem;
          margin-bottom: 1.5rem;
          width: fit-content;
          margin-left: auto;
          margin-right: auto;
          border: 1px solid var(--border-subtle);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #4ade80;
        }

        .status-dot.pulse {
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(74, 222, 128, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7); }
        }

        .avatar-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 3rem;
        }

        .avatar-ring {
          position: relative;
          width: 140px;
          height: 140px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .avatar-inner {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0047AB 0%, #0066CC 50%, #0055B8 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.2);
          z-index: 10;
          transition: all 0.3s ease;
        }

        .avatar-ring.speaking .avatar-inner {
          background: linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%);
          box-shadow: 
            0 0 40px rgba(16, 185, 129, 0.4),
            0 0 80px rgba(16, 185, 129, 0.2),
            inset 0 0 20px rgba(255, 255, 255, 0.2);
          animation: breathe 2s ease-in-out infinite;
        }

        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .ring {
          position: absolute;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          border: 2px solid rgba(0, 71, 171, 0.5);
          transition: transform 0.1s ease-out, opacity 0.1s ease-out;
          z-index: 1;
        }

        .avatar-ring.speaking .ring {
          border-color: rgba(16, 185, 129, 0.5);
        }

        .ring-1 { animation: ripple 2s ease-out infinite; }
        .ring-2 { animation: ripple 2s ease-out infinite 0.5s; }
        .ring-3 { animation: ripple 2s ease-out infinite 1s; }

        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }

        .sound-waves {
          display: flex;
          align-items: center;
          gap: 3px;
          height: 30px;
        }

        .wave-bar {
          width: 4px;
          height: 100%;
          background: white;
          border-radius: 2px;
          animation: wave 0.5s ease-in-out infinite alternate;
        }

        @keyframes wave {
          0% { transform: scaleY(0.3); }
          100% { transform: scaleY(1); }
        }

        .listening-indicator {
          animation: pulse-ring 1.5s ease-in-out infinite;
        }

        @keyframes pulse-ring {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.95); }
        }

        .pulse-icon {
          animation: pulse-bright 1.5s ease-in-out infinite;
        }

        @keyframes pulse-bright {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .status-text {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.95rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .speaking-text {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #10b981;
        }

        .listening-text {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .live-dot {
          width: 8px;
          height: 8px;
          background: #ef4444;
          border-radius: 50%;
          animation: live-pulse 1.5s infinite;
        }

        @keyframes live-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        .ready-text {
          color: var(--text-muted);
        }

        .voice-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 32px;
          border-radius: 50px;
          border: none;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .voice-btn.start-call {
          background: var(--violet);
          color: #ffffff;
          box-shadow: 0 4px 15px var(--violet-glow);
        }
        .voice-btn.start-call:hover {
          background: var(--violet-light);
          transform: scale(1.05);
        }

        .voice-btn.stop-call {
          background: #ef4444;
          color: white;
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
        }

        .voice-btn.stop-call:hover {
          background: #dc2626;
          transform: scale(1.05);
        }

        .call-controls {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .error-container {
          position: fixed;
          top: 2rem;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
        }

        .error-box {
          background: #fee2e2;
          color: #991b1b;
          padding: 1rem 2rem;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          border: 1px solid #fecaca;
        }

        :global([data-theme="dark"]) .error-box {
          background: #450a0a;
          color: #fecaca;
          border-color: #7f1d1d;
        }

        .output-box {
          max-width: 500px;
          padding: 1.5rem;
          border-radius: 20px;
          background: var(--bg-secondary);
          text-align: center;
          border: 1px solid var(--border-subtle);
        }

        .transcript-text {
          font-size: 1rem;
          line-height: 1.6;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
