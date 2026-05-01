
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import JSON5 from 'json5';
import { v4 as uuidv4 } from 'uuid';
import { Loader2, Trash2 } from 'lucide-react';
import { ChatMessage, ConnectionState, UserProfile, ConsultationSession, LogEntry } from '../types';
import AgentAvatar from './AgentAvatar';
import { API_KEY } from '../constants';
import {
  createChatSession,
  getChatSessions,
  getChatSession,
  streamChatMessage,
  endChatSession,
  deleteChatSession,
  type BackendChatSession,
  type BackendSessionDetail,
} from '../services/api';

interface ConsultantScreenProps {
  userProfile: UserProfile;
  connectionState: ConnectionState;
  onConnect: () => void;
  onDisconnect: (transcript?: {role: string, text: string}[]) => Promise<{summary?: string, advice?: string} | void> | void;
  videoFeedNode: React.ReactNode; 
  agentVolume?: number;
  consultationHistory: ConsultationSession[];
  onSaveSession: (session: ConsultationSession) => void;
  missionLogs: LogEntry[]; // Received from App
  onFlipCamera: () => void;
  onToggleFlash: () => void;
  transcript?: { text: string, isUser: boolean } | null;
  onAddXp: (amount: number) => void;
  onToggleFullScreen?: (isFull: boolean) => void;
  onToggleMute?: (isMuted: boolean) => void; // New Prop
}

// --- RELIABLE INTERNAL USER AVATAR ---
const UserDefaultAvatar = ({ gender, className }: { gender: 'male' | 'female', className?: string }) => (
  <div className={`flex items-center justify-center w-full h-full ${gender === 'female' ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-500 dark:text-pink-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-300'} ${className}`}>
    <svg className="w-3/5 h-3/5" fill="currentColor" viewBox="0 0 24 24">
        {gender === 'female' ? (
            <path d="M12 2C9.243 2 7 4.243 7 7C7 9.757 9.243 12 12 12C14.757 12 17 9.757 17 7C17 4.243 14.757 2 12 2ZM12 10C10.346 10 9 8.654 9 7C9 5.346 10.346 4 12 4C13.654 4 15 5.346 15 7C15 8.654 13.654 10 12 10ZM4 20V22H20V20C20 15.686 16.411 14 12 14C7.589 14 4 15.686 4 20ZM6.18 20C6.586 18.57 9.07 16 12 16C14.93 16 17.414 18.57 17.82 20H6.18Z" />
        ) : (
            <path d="M12 14C7.589 14 4 16.686 4 20V22H20V20C20 16.686 16.411 14 12 14ZM6.223 20C6.671 18.553 9.109 16 12 16C14.891 16 17.329 18.553 17.777 20H6.223ZM12 2C9.243 2 7 4.243 7 7C7 9.757 9.243 12 12 12C14.757 12 17 9.757 17 7C17 4.243 14.757 2 12 2ZM12 10C10.346 10 9 8.654 9 7C9 5.346 10.346 4 12 4C13.654 4 15 5.346 15 7C15 8.654 13.654 10 12 10Z" />
        )}
    </svg>
  </div>
);

const ConsultantScreen: React.FC<ConsultantScreenProps> = ({ 
  userProfile, 
  connectionState, 
  onConnect, 
  onDisconnect, 
  videoFeedNode,
  agentVolume = 0,
  consultationHistory,
  onSaveSession,
  missionLogs,
  onFlipCamera,
  onToggleFlash,
  transcript,
  onAddXp,
  onToggleFullScreen,
  onToggleMute
}) => {
  const [mode, setMode] = useState<'selection' | 'chat' | 'video' | 'history' | 'clinical'>('selection');
  
  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([{
      id: 'welcome',
      role: 'model',
      text: `Hello ${userProfile.name}! 👋 I'm Dr. Moriesly, your personal health consultant. \n\nI'm here to listen. Do you have any questions about your diet or health today?`,
      timestamp: new Date()
  }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSaving, setIsSaving] = useState(false); 
  const [attachedImage, setAttachedImage] = useState<string | null>(null);

  // ── Backend session state ────────────────────────────────────────────────────
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [backendSessions, setBackendSessions] = useState<BackendChatSession[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isResumingSession, setIsResumingSession] = useState(false);
  const [selectedBackendSession, setSelectedBackendSession] = useState<BackendSessionDetail | null>(null);
  const [isDeletingSession, setIsDeletingSession] = useState<string | null>(null);
  
  // Clinical Decode State
  const [clinicalDoc, setClinicalDoc] = useState<{data: string, mimeType: string, name: string} | null>(null);
  const [clinicalReport, setClinicalReport] = useState<{ summary: string, details: string[] } | null>(null);
  const [analyzingDoc, setAnalyzingDoc] = useState(false);

  // Video Call State
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscriptDrawer, setShowTranscriptDrawer] = useState(false);
  const [viewFocus, setViewFocus] = useState<'ai' | 'user'>('ai');

  const drawerEndRef = useRef<HTMLDivElement>(null);
  const missionLogsRef = useRef(missionLogs);
  
  // Custom User Photo State
  const [customUserPhoto, setCustomUserPhoto] = useState<string | null>(null);
  
  // History Playback
  const [selectedSession, setSelectedSession] = useState<ConsultationSession | null>(null);
  
  // Session Timing
  const sessionStartTime = useRef<number>(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); 
  const profileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null); 

  // Use the realistic avatar URL for chat icon too
  const aiAvatarUrl = `https://images.unsplash.com/photo-1559839734-2b71ea86b48e?q=80&w=200&auto=format&fit=crop`;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, mode, selectedSession]);

  // Keep ref updated for closure-safe access in handleEndCall
  useEffect(() => {
      missionLogsRef.current = missionLogs;
  }, [missionLogs]);

  // Auto-scroll the transcript drawer
  useEffect(() => {
    if (showTranscriptDrawer) {
        drawerEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [missionLogs, showTranscriptDrawer]);

  useEffect(() => {
      if (connectionState === ConnectionState.CONNECTED) {
          sessionStartTime.current = Date.now();
      }
  }, [connectionState]);

  // Handle Full Screen & Auto-Connect logic
  useEffect(() => {
      if (mode === 'video') {
          onToggleFullScreen?.(true);
      } else {
          onToggleFullScreen?.(false);
      }
  }, [mode]);

  // On entering chat mode: resume the most-recent active session, or create a new one.
  useEffect(() => {
      if (mode !== 'chat') return;
      // If we already have a session loaded (e.g. resumed from history view), skip.
      if (currentSessionId) return;
      let cancelled = false;

      const initChatSession = async () => {
          setIsResumingSession(true);
          try {
              const sessions = await getChatSessions(10);
              const active   = sessions.find(s => s.status === 'active');

              if (active) {
                  // Resume: restore previous messages from backend
                  const detail = await getChatSession(active.id);
                  if (!cancelled) {
                      setCurrentSessionId(active.id);
                      if (detail.messages.length > 0) {
                          setMessages(
                              detail.messages.map(m => ({
                                  id:        m.id,
                                  role:      m.role as 'user' | 'model',
                                  text:      m.text,
                                  timestamp: new Date(m.timestamp),
                              }))
                          );
                      }
                  }
              } else {
                  // No active session — start fresh
                  const session = await createChatSession('chat');
                  if (!cancelled) {
                      setCurrentSessionId(session.id);
                      setMessages([{
                          id:        'welcome',
                          role:      'model',
                          text:      `Hello ${userProfile.name}! 👋 I'm Dr. Moriesly, your personal health consultant.\n\nI'm here to listen. Do you have any questions about your diet or health today?`,
                          timestamp: new Date(),
                      }]);
                  }
              }
          } catch (err) {
              console.error('[ConsultantScreen] Failed to init chat session:', err);
          } finally {
              if (!cancelled) setIsResumingSession(false);
          }
      };

      initChatSession();
      return () => { cancelled = true; };
  }, [mode === 'chat' ? 'chat' : null]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load archives from backend when user enters history mode
  const loadBackendSessions = useCallback(async () => {
      setIsLoadingHistory(true);
      try {
          const sessions = await getChatSessions(30);
          setBackendSessions(sessions);
      } catch (err) {
          console.error('[ConsultantScreen] Failed to load chat sessions:', err);
      } finally {
          setIsLoadingHistory(false);
      }
  }, []);

  useEffect(() => {
      if (mode === 'history') loadBackendSessions();
  }, [mode, loadBackendSessions]);

  const handleProfileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              setCustomUserPhoto(base64);
          };
          reader.readAsDataURL(file);
      }
  };

  // ... (Clinical Decode Logic - unchanged) ...
  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const result = reader.result as string;
              const base64 = result.split(',')[1];
              const mimeType = result.substring(result.indexOf(':') + 1, result.indexOf(';'));
              setClinicalDoc({ data: base64, mimeType: mimeType, name: file.name });
              setClinicalReport(null);
          };
          reader.readAsDataURL(file);
      }
  };

  const analyzeClinicalDoc = async () => {
      if (!clinicalDoc || analyzingDoc) return;
      setAnalyzingDoc(true);
      try {
          const apiKey = API_KEY || process.env.API_KEY;
          if (!apiKey && (window as any).aistudio) {
               const hasKey = await (window as any).aistudio.hasSelectedApiKey();
               if (!hasKey) await (window as any).aistudio.openSelectKey();
          }
          const ai = new GoogleGenAI({ apiKey: apiKey! });
          const prompt = `
            You are "Moriesly AI - Clinical Division", utilizing the advanced reasoning capabilities of the **Med-Gemma architecture**.
            **MISSION:** Perform a deep-dive forensic analysis of the uploaded medical document (Lab Results, Clinical Notes, or Metabolic Panel).
            **ANALYSIS PROTOCOL (Chain-of-Thought):**
            1. **Scanning**: Extract high-priority biomarkers (e.g., HbA1c, Fasting Glucose, Triglycerides, Cortisol, Insulin).
            2. **Correlation**: Cross-reference these values against optimal metabolic ranges, NOT just "normal" ranges.
            3. **Metabolic Impact**: specifically trace the impact of **Sugar/Carbohydrate intake** on these specific markers.
            4. **Tactical Directives**: Provide actionable, science-backed lifestyle corrections.
            **OUTPUT FORMAT (Strict JSON):**
            {
              "summary": "A precise, high-level executive summary of the biological state detected.",
              "details": [
                "**Biomarker**: Value detected. Clinical significance.",
                "**Sugar Link**: How sugar/insulin resistance directly affects this marker.",
                "**Protocol**: Specific adjustment to fix this."
              ]
            }
            **SAFETY OVERRIDE:** This analysis is for educational and tactical health optimization only. It does NOT constitute a medical diagnosis. Always consult a human physician.
          `;
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash', 
              contents: [{ role: 'user', parts: [{ inlineData: { mimeType: clinicalDoc.mimeType, data: clinicalDoc.data } }, { text: prompt }] }],
              config: { responseMimeType: "application/json" }
          });
          if (response.text) {
              try {
                  const data = JSON5.parse(response.text.replace(/```json/g,'').replace(/```/g,'').trim());
                  setClinicalReport(data);
                  onAddXp(150); 
                  const session: ConsultationSession = {
                      id: uuidv4(),
                      date: new Date(),
                      sessionType: 'clinical',
                      summary: "Clinical Analysis: " + (clinicalDoc.name.length > 20 ? clinicalDoc.name.substring(0,20)+'...' : clinicalDoc.name),
                      advice: data.summary,
                      transcript: [{ id: uuidv4(), role: 'model', text: `**EXECUTIVE SUMMARY**\n${data.summary}\n\n**DETAILED FORENSICS**\n${data.details.join('\n\n')}`, timestamp: new Date() }],
                      userImages: [clinicalDoc.data],
                      durationSeconds: 0
                  };
                  onSaveSession(session);
              } catch (err) {
                  console.error("Failed to parse clinical report:", err);
                  alert("Received invalid data from the server. Please try again.");
              }
          }
      } catch (e) {
          console.error("Clinical analysis failed", e);
          alert("Analysis failed. Please try a clearer document.");
      } finally {
          setAnalyzingDoc(false);
      }
  };

  const generateSessionReport = async (transcript: { role: string, text: string }[]): Promise<{summary: string, advice: string}> => {
      const transcriptText = transcript.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');
      try {
          const apiKey = API_KEY || process.env.API_KEY;
          if (!apiKey) throw new Error("No API Key");
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `
            Analyze this consultation transcript between a User and a friendly Doctor (Dr. Moriesly).
            1. Create a "Summary" of the friendly discussion (max 20 words).
            2. Create a "Gentle Suggestion" or "Advice" based on the conversation.
            Return strictly JSON: { "summary": "...", "advice": "..." }
            TRANSCRIPT: ${transcriptText}
          `;
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              config: { responseMimeType: "application/json" }
          });
          if (response.text) {
              try {
                  const data = JSON5.parse(response.text.replace(/```json/g,'').replace(/```/g,'').trim());
                  return { summary: data.summary || "Session Completed", advice: data.advice || "Keep up the good work!" };
              } catch (err) {
                  console.error("Failed to parse session summary:", err);
                  return { summary: "Session Ended", advice: "Review transcript for details." };
              }
          }
      } catch (e: any) {
          return { summary: "Session Ended", advice: "Review transcript for details." };
      }
      return { summary: "Session Ended", advice: "Review transcript for details." };
  };

  const handleEndCall = async () => {
      setShowTranscriptDrawer(false); 
      onToggleFullScreen?.(false);
      const duration = (Date.now() - sessionStartTime.current) / 1000;
      if (duration < 3) { 
          onDisconnect();
          setMode('selection'); 
          return; 
      }
      setIsSaving(true);
      await new Promise(r => setTimeout(r, 100));
      const logsToSave = missionLogsRef.current.filter(log => new Date(log.timestamp).getTime() >= sessionStartTime.current);
      const formattedTranscript = logsToSave.map(log => ({ id: log.id, role: log.sender === 'user' ? 'user' : 'model', text: log.text, timestamp: log.timestamp })) as ChatMessage[];
      
      const simpleTranscript = formattedTranscript.map(t => ({ role: t.role, text: t.text }));
      const disconnectResult = await onDisconnect(simpleTranscript);
      
      let summary = disconnectResult?.summary;
      let advice = disconnectResult?.advice;
      
      if (!summary || !advice) {
          const report = await generateSessionReport(simpleTranscript);
          summary = report.summary;
          advice = report.advice;
      }
      
      const sessionId = (disconnectResult as any)?.sessionId || uuidv4();
      const session: ConsultationSession = { id: sessionId, date: new Date(), sessionType: 'video', summary: summary || '', advice: advice || '', transcript: formattedTranscript, userImages: [], durationSeconds: Math.round(duration) };
      onSaveSession(session);
      onAddXp(50);
      setIsSaving(false);
      setMode('history');
  };

  const handleEndChat = async () => {
      if (messages.length <= 1) { setMode('selection'); return; }
      setIsSaving(true);

      const transcript = messages.filter(m => m.id !== 'welcome').map(m => ({ role: m.role, text: m.text }));

      if (currentSessionId) {
          // ── Backend path: persist summary via API ────────────────────────────
          try {
              const { summary, advice } = await endChatSession(currentSessionId, transcript);
              const userImages = messages.filter(m => m.role === 'user' && m.image).map(m => m.image as string);
              const session: ConsultationSession = {
                  id: currentSessionId,
                  date: new Date(),
                  sessionType: 'chat',
                  summary,
                  advice,
                  transcript: [...messages],
                  userImages,
                  durationSeconds: 0,
              };
              onSaveSession(session);
              onAddXp(30);
          } catch (err) {
              console.error('[ConsultantScreen] endChatSession failed:', err);
          }
      } else {
          // ── Fallback: local Gemini summary (no backend session) ──────────────
          const { summary, advice } = await generateSessionReport(transcript);
          const userImages = messages.filter(m => m.role === 'user' && m.image).map(m => m.image as string);
          const session: ConsultationSession = {
              id: uuidv4(), date: new Date(), sessionType: 'chat',
              summary, advice, transcript: [...messages], userImages, durationSeconds: 0,
          };
          onSaveSession(session);
          onAddXp(30);
      }

      setIsSaving(false);
      setCurrentSessionId(null);
      setMessages([{ id: 'welcome', role: 'model', text: `Hi again, ${userProfile.name}! Ready to chat about your health?`, timestamp: new Date() }]);
      setMode('history');
  };

  const handleSendMessage = async () => {
    if ((!input.trim() && !attachedImage) || isTyping) return;

    const msgText = input;
    const imgData = attachedImage;
    const userMsg: ChatMessage = { id: uuidv4(), role: 'user', text: msgText, image: imgData || undefined, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachedImage(null);
    setIsTyping(true);

    // Build a streaming placeholder for the model reply
    const modelMsgId = uuidv4();
    setMessages(prev => [...prev, { id: modelMsgId, role: 'model', text: '', timestamp: new Date() }]);

    try {
        if (currentSessionId) {
            // ── Backend path: SSE streaming via MasterAPI → Gemini ──────────────
            const history = messages
                .filter(m => m.id !== 'welcome')
                .map(m => ({ role: m.role as 'user' | 'model', text: m.text }));

            await streamChatMessage(
                currentSessionId,
                {
                    message:     msgText,
                    history,
                    userProfile: {
                        name:   userProfile.name,
                        age:    userProfile.age    ?? 25,
                        weight: userProfile.weight ?? 70,
                    },
                    imageBase64: imgData ?? undefined,
                },
                (token) => {
                    // Append each token to the placeholder message
                    setMessages(prev => prev.map(m =>
                        m.id === modelMsgId ? { ...m, text: m.text + token } : m,
                    ));
                },
            );
        } else {
            // ── Fallback: direct Gemini call (no active backend session) ────────
            const apiKey = API_KEY || process.env.API_KEY;
            const ai = new GoogleGenAI({ apiKey: apiKey! });
            const historyPayload = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
            const currentParts: any[] = imgData
                ? [{ inlineData: { mimeType: 'image/jpeg', data: imgData } }, { text: msgText }]
                : [{ text: msgText }];
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [...historyPayload, { role: 'user', parts: currentParts }],
                config: {
                    systemInstruction: `You are "Dr. Moriesly", a gentle health consultant. USER: ${userProfile.name}, ${userProfile.age}yo, ${userProfile.weight}kg.`,
                    temperature: 0.7,
                },
            });
            const replyText = response.text || "Hmm, signal got a bit static there. Mind repeating? 🤔";
            setMessages(prev => prev.map(m => m.id === modelMsgId ? { ...m, text: replyText } : m));
        }
    } catch (e: any) {
        console.error('[ConsultantScreen] handleSendMessage error:', e);
        setMessages(prev => prev.map(m =>
            m.id === modelMsgId ? { ...m, text: "Connection compromised. Try sending that again? 🥺" } : m,
        ));
    } finally {
        setIsTyping(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              setAttachedImage(base64);
          };
          reader.readAsDataURL(file);
      }
  };

  // --- RENDER ---

  if (mode === 'selection') {
    return (
      <div className="h-full flex flex-col p-6 space-y-8 animate-in fade-in zoom-in-95 duration-300 min-h-[500px]">
        {/* Header */}
        <div className="text-center mb-4">
           <h2 className="text-3xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">Consultation Hub</h2>
           <p className="text-zinc-500 text-sm font-medium">Select your intelligence channel.</p>
        </div>

        {/* SECTION 1: AGENT MORIESLY (Live Ops) */}
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500 border border-brand-500/30">
                    <span className="animate-pulse">●</span>
                </div>
                <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Dr. Moriesly</h3>
                    <div className="text-[10px] text-zinc-500 font-mono">24/7 METABOLIC SPECIALIST</div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {/* Instant Chat */}
                <button 
                  onClick={() => setMode('chat')}
                  className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-brand-500/50 rounded-2xl p-4 text-left transition-all group flex flex-col justify-between h-32 relative overflow-hidden"
                >
                   <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                       <svg className="w-16 h-16 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                   </div>
                   <div className="bg-brand-500/10 w-8 h-8 rounded-lg flex items-center justify-center text-brand-500 mb-2">💬</div>
                   <div>
                       <div className="font-bold text-white text-sm">Secure Chat</div>
                       <div className="text-[9px] text-zinc-500">Instant Advice</div>
                   </div>
                </button>

                {/* Video Coach */}
                <button 
                  onClick={() => {
                      setMode('video');
                      if (connectionState === ConnectionState.DISCONNECTED) {
                          onConnect();
                      }
                  }}
                  className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-rose-500/50 rounded-2xl p-4 text-left transition-all group flex flex-col justify-between h-32 relative overflow-hidden"
                >
                   <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                       <svg className="w-16 h-16 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                   </div>
                   <div className="bg-rose-500/10 w-8 h-8 rounded-lg flex items-center justify-center text-rose-500 mb-2">📹</div>
                   <div>
                       <div className="font-bold text-white text-sm">Live Call</div>
                       <div className="text-[9px] text-zinc-500">Face-to-Face Consult</div>
                   </div>
                </button>
            </div>
        </div>

        {/* SECTION 2: MEDICAL INTELLIGENCE (Med-Gemma) */}
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-500 border border-brand-500/30">
                    <span className="text-xs">🧬</span>
                </div>
                <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Medical Intelligence</h3>
                    <div className="text-[10px] text-zinc-500 font-mono">LAB DECRYPTION UNIT</div>
                </div>
            </div>

            {/* Clinical Decode Card */}
            <button 
              onClick={() => setMode('clinical')}
              className="w-full bg-gradient-to-br from-zinc-900 to-black hover:from-zinc-800 hover:to-zinc-900 border border-zinc-800 hover:border-brand-500/50 rounded-2xl p-5 text-left transition-all group relative overflow-hidden shadow-lg"
            >
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
                <div className="absolute top-4 right-4 bg-brand-500/10 text-brand-400 text-[8px] font-black uppercase px-2 py-1 rounded border border-brand-500/20 tracking-wider">
                    Powered by Med-Gemma
                </div>
                <div className="relative z-10 flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-500/20 rounded-xl flex items-center justify-center text-2xl text-brand-400 border border-brand-500/20 group-hover:scale-110 transition-transform duration-500">
                        ⚕️
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white mb-1">Clinical Decode</h3>
                        <p className="text-xs text-zinc-400 leading-tight max-w-[200px]">Upload Lab Results & Medical Docs for Deep Forensic Analysis.</p>
                    </div>
                </div>
            </button>
        </div>

        <button 
          onClick={() => setMode('history')}
          className="mt-auto w-full py-3 border border-dashed border-zinc-800 rounded-xl text-zinc-500 hover:text-white hover:border-zinc-600 text-xs font-bold uppercase tracking-widest transition-colors"
        >
            History
        </button>
      </div>
    );
  }

  // --- CLINICAL DECODE MODE ---
  if (mode === 'clinical') {
      return (
          <div className="flex flex-col h-full min-h-[500px] p-4 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-brand-500/20 text-brand-400 rounded-xl border border-brand-500/30">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <div>
                          <h2 className="text-xl font-black text-white uppercase tracking-tight">Clinical Decode</h2>
                          <div className="text-[10px] text-zinc-500 font-medium">Powered by Med-Gemma Logic</div>
                      </div>
                  </div>
                  <button onClick={() => setMode('selection')} className="text-zinc-500 hover:text-white">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-6">
                  <div className="bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded-r-xl">
                      <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase mb-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                          Safety Disclaimer
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                          This tool is for <strong>educational purposes only</strong>. It analyzes data patterns to explain metabolic impact. It does <strong>not</strong> provide medical diagnoses, treatment, or professional advice. Consult a doctor for any health concerns.
                      </p>
                  </div>
                  {!clinicalReport && (
                      <div className="border-2 border-dashed border-zinc-700 rounded-3xl p-8 flex flex-col items-center justify-center text-center hover:border-brand-500 hover:bg-brand-900/10 transition-all cursor-pointer relative group" onClick={() => docInputRef.current?.click()}>
                          <input type="file" ref={docInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleDocUpload} />
                          {clinicalDoc ? (
                              <div className="relative w-full h-48 rounded-xl overflow-hidden mb-4 bg-zinc-800 flex items-center justify-center">
                                  {clinicalDoc.mimeType.startsWith('image/') ? (
                                      <img src={`data:${clinicalDoc.mimeType};base64,${clinicalDoc.data}`} className="w-full h-full object-contain opacity-50 group-hover:opacity-80 transition-opacity" />
                                  ) : (
                                      <div className="flex flex-col items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                                          <span className="text-4xl">📄</span>
                                          <span className="text-xs text-zinc-300 font-mono truncate max-w-[200px]">{clinicalDoc.name}</span>
                                          <span className="text-[9px] bg-zinc-700 px-2 py-1 rounded text-zinc-400 uppercase">{clinicalDoc.mimeType.split('/')[1]}</span>
                                      </div>
                                  )}
                                  <div className="absolute inset-0 flex items-center justify-center">
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); analyzeClinicalDoc(); }}
                                        disabled={analyzingDoc}
                                        className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest shadow-lg flex items-center gap-2 z-10"
                                      >
                                          {analyzingDoc ? ( <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Med-Gemma Reasoning...</> ) : ( <>Run Analysis</> )}
                                      </button>
                                  </div>
                              </div>
                          ) : (
                              <>
                                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-3xl group-hover:scale-110 transition-transform">📄</div>
                                  <h3 className="text-white font-bold mb-2">Upload Medical Document (PDF/Image)</h3>
                                  <p className="text-zinc-500 text-sm max-w-xs">Lab results, blood work, or nutrition labels. We'll decode the sugar impact.</p>
                              </>
                          )}
                      </div>
                  )}
                  {clinicalReport && (
                      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl">
                              <div className="text-[10px] font-bold text-brand-400 uppercase tracking-widest mb-2">Executive Summary</div>
                              <p className="text-sm font-medium text-white leading-relaxed">{clinicalReport.summary}</p>
                          </div>
                          <div className="space-y-3">
                              <div className="text-xs font-bold text-zinc-500 uppercase ml-1">Detailed Findings</div>
                              {clinicalReport.details.map((detail, i) => (
                                  <div key={i} className="bg-black/20 border border-zinc-800 p-4 rounded-xl text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                      <div className="flex gap-3">
                                          <div className="mt-1.5 w-1.5 h-1.5 bg-brand-500 rounded-full shrink-0"></div>
                                          <div>{detail}</div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                          <button 
                            onClick={() => { setClinicalReport(null); setClinicalDoc(null); }}
                            className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-bold uppercase text-xs rounded-xl transition-colors"
                          >
                              Scan Another Document
                          </button>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // --- VIDEO & HISTORY MODES (Pass-through) ---
  if (mode === 'video') {
      const toggleView = () => setViewFocus(prev => prev === 'ai' ? 'user' : 'ai');
      const fullScreenClass = "absolute inset-0 flex items-center justify-center bg-zinc-900 z-0";
      const floatingClass = "absolute bottom-24 right-4 w-32 h-48 md:w-48 md:h-64 bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 z-30 transition-all hover:scale-105 cursor-pointer";

      return (
          <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col overflow-hidden animate-in fade-in duration-500">
              <div 
                className={viewFocus === 'ai' ? fullScreenClass : floatingClass}
                onClick={viewFocus === 'user' ? toggleView : undefined}
              >
                  {viewFocus === 'ai' ? (
                      // Clean container for hyper-realistic avatar - Removed heavy overlays
                      <div className="absolute inset-0 flex items-center justify-center bg-black">
                          <AgentAvatar volume={agentVolume || 0} isActive={true} />
                      </div>
                  ) : (
                      <div className="w-full h-full bg-zinc-800 flex items-center justify-center relative">
                          <AgentAvatar volume={agentVolume || 0} isActive={true} />
                          <div className="absolute bottom-0 left-0 right-0 text-center text-[8px] font-bold text-white uppercase tracking-wider bg-black/60 backdrop-blur-sm py-1">
                              Dr. Moriesly
                          </div>
                      </div>
                  )}
              </div>

              <div 
                className={viewFocus === 'user' ? fullScreenClass : floatingClass}
                onClick={viewFocus === 'ai' ? toggleView : undefined}
              >
                  <div className="w-full h-full relative">
                      {videoFeedNode}
                      <button 
                        onClick={(e) => { e.stopPropagation(); onFlipCamera(); }}
                        className="absolute bottom-2 right-2 bg-black/50 text-white p-1.5 rounded-full backdrop-blur-sm hover:bg-black/70 z-40"
                      >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      </button>
                  </div>
              </div>

              <div className="absolute top-0 left-0 right-0 p-4 pt-12 z-40 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start pointer-events-none">
                  <div className="flex items-center gap-3 pointer-events-auto">
                      <button 
                        onClick={() => { onDisconnect(); setMode('selection'); }}
                        className="bg-black/40 backdrop-blur-md p-2 rounded-full text-white border border-white/10 hover:bg-white/10 shadow-lg"
                      >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <div className="flex flex-col">
                          <h3 className="text-white font-bold text-lg drop-shadow-md leading-none">Dr. Moriesly</h3>
                          <div className="flex items-center gap-2 mt-1">
                              <span className={`w-2 h-2 rounded-full ${connectionState === ConnectionState.CONNECTED ? 'bg-brand-500 animate-pulse' : 'bg-yellow-500'}`}></span>
                              <span className="text-white/80 text-xs font-medium shadow-black drop-shadow-md">
                                  {connectionState === ConnectionState.CONNECTED ? 'Live Connection' : 'Connecting...'}
                              </span>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-6 pb-8 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-40 flex justify-center items-center gap-6 pointer-events-auto">
                  <button 
                    onClick={() => { const newState = !isMuted; setIsMuted(newState); onToggleMute?.(newState); }}
                    className={`p-4 rounded-full backdrop-blur-md text-white border border-white/10 transition-all active:scale-95 ${isMuted ? 'bg-zinc-700 text-zinc-400' : 'bg-zinc-800/80 hover:bg-zinc-700'}`}
                  >
                      {isMuted ? <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth={2} /></svg> : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}
                  </button>
                  <button 
                    onClick={handleEndCall}
                    className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 flex items-center justify-center text-white shadow-2xl shadow-rose-900/50 transform transition-transform hover:scale-110 active:scale-95"
                  >
                      <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 0 1 0-1.41C2.86 9.3 7.29 7.5 12 7.5c4.71 0 9.14 1.8 11.71 4.17.39.39.39 1.03 0 1.41l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.66-1.85.995.995 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                  </button>
                  <button 
                    onClick={() => setShowTranscriptDrawer(!showTranscriptDrawer)}
                    className={`p-4 rounded-full backdrop-blur-md text-white border border-white/10 transition-all active:scale-95 ${showTranscriptDrawer ? 'bg-brand-600 border-brand-500 shadow-brand-500/20' : 'bg-zinc-800/80 hover:bg-zinc-700'}`}
                  >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                  </button>
              </div>

              {transcript && !showTranscriptDrawer && (
                  <div className="absolute bottom-40 left-4 right-4 flex justify-center z-30 pointer-events-none">
                      <div className={`max-w-md px-6 py-3 rounded-2xl backdrop-blur-lg border border-white/10 text-sm font-medium animate-in fade-in slide-in-from-bottom-2 shadow-xl ${transcript.isUser ? 'bg-black/70 text-white/90 text-right ml-auto' : 'bg-brand-900/80 text-brand-50 mr-auto'}`}>
                          {transcript.text}
                      </div>
                  </div>
              )}

              {showTranscriptDrawer && (
                  <div className="absolute inset-x-0 bottom-0 z-50 bg-zinc-950/95 border-t border-zinc-800 rounded-t-3xl h-[60vh] flex flex-col animate-in slide-in-from-bottom-full duration-300 shadow-2xl">
                      <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50 rounded-t-3xl">
                          <div className="flex items-center gap-2">
                              <span className="text-brand-500 animate-pulse">●</span>
                              <h3 className="text-white font-bold uppercase text-sm tracking-wider">Live Transcript</h3>
                          </div>
                          <button onClick={() => setShowTranscriptDrawer(false)} className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                          {missionLogs.length === 0 ? <div className="text-zinc-500 text-center text-xs italic mt-10">Conversation is starting...</div> : missionLogs.map((log) => (
                              <div key={log.id} className={`flex gap-3 ${log.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${log.sender === 'user' ? 'bg-zinc-800 text-white rounded-br-none' : 'bg-brand-900/20 text-brand-100 border border-brand-500/20 rounded-bl-none'}`}>
                                      <div className="text-[10px] opacity-50 mb-1 uppercase font-bold tracking-wider">{log.sender === 'user' ? 'You' : 'Moriesly AI'}</div>
                                      <div className="whitespace-pre-wrap leading-relaxed">{log.text}</div>
                                  </div>
                              </div>
                          ))}
                          <div ref={drawerEndRef} />
                      </div>
                  </div>
              )}

              {isSaving && (
                  <div className="absolute inset-0 z-[70] bg-black/90 flex flex-col items-center justify-center animate-in fade-in duration-300">
                      <div className="relative w-20 h-20 mb-6"><div className="absolute inset-0 border-t-4 border-brand-500 rounded-full animate-spin"></div><div className="absolute inset-0 flex items-center justify-center text-3xl">💾</div></div>
                      <h3 className="text-lg font-bold text-white uppercase tracking-widest animate-pulse">Saving Session...</h3>
                  </div>
              )}
          </div>
      );
  }

  // ── Session detail: load from backend or from in-memory consultationHistory ──
  const selectedInMemory = selectedSession;

  // --- HISTORY MODE ---
  if (mode === 'history') {

      // ── Backend session detail view ───────────────────────────────────────────
      if (selectedBackendSession) {
          const { session: bSession, messages: bMessages } = selectedBackendSession;
          return (
              <div className="h-full min-h-[500px] bg-zinc-50 dark:bg-black rounded-3xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300 shadow-xl mb-24">
                  <div className="bg-zinc-100 dark:bg-zinc-900 p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <button onClick={() => setSelectedBackendSession(null)} className="text-zinc-500 hover:text-brand-500">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                          </button>
                          <div>
                              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Wellness Report</h3>
                              <div className="text-[10px] text-zinc-500">
                                  {new Date(bSession.createdAt).toLocaleString()} · {bSession.sessionType.toUpperCase()} · {bSession.messageCount} msgs
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 space-y-6">
                      {bSession.summary && (
                          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm">
                              <div className="flex items-center gap-2 mb-2">
                                  <div className="p-1.5 bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 rounded-lg">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                  </div>
                                  <h4 className="text-xs font-bold uppercase text-zinc-500">Summary</h4>
                              </div>
                              <p className="text-sm font-medium text-zinc-900 dark:text-white leading-relaxed">{bSession.summary}</p>
                          </div>
                      )}
                      {bSession.advice && (
                          <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 p-4 rounded-2xl shadow-sm">
                              <div className="flex items-center gap-2 mb-2">
                                  <div className="p-1.5 bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 rounded-lg">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                  </div>
                                  <h4 className="text-xs font-bold uppercase text-brand-600 dark:text-brand-400">Kindly Suggests</h4>
                              </div>
                              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{bSession.advice}</p>
                          </div>
                      )}
                      <div>
                          <h4 className="text-xs font-bold uppercase text-zinc-500 mb-3 pl-1">Chat History</h4>
                          <div className="space-y-3 border-l-2 border-zinc-200 dark:border-zinc-800 pl-4 py-2">
                              {bMessages.map((msg) => (
                                  <div key={msg.id} className="text-sm">
                                      <div className={`text-[10px] font-bold uppercase mb-0.5 ${msg.role === 'user' ? 'text-zinc-400' : 'text-brand-500'}`}>
                                          {msg.role === 'user' ? userProfile.name : 'Dr. Moriesly'}
                                      </div>
                                      <div className={`leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-800 dark:text-zinc-200'}`}>
                                          {msg.text}
                                      </div>
                                      <div className="text-[9px] text-zinc-400 mt-0.5">
                                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          );
      }

      // ── In-memory session detail (video / clinical) ───────────────────────────
      if (selectedInMemory) {
          return (
              <div className="h-full min-h-[500px] bg-zinc-50 dark:bg-black rounded-3xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300 shadow-xl mb-24">
                  <div className="bg-zinc-100 dark:bg-zinc-900 p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <button onClick={() => setSelectedSession(null)} className="text-zinc-500 hover:text-brand-500">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                          </button>
                          <div>
                              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Wellness Report</h3>
                              <div className="text-[10px] text-zinc-500">{selectedInMemory.date.toLocaleString()} • {selectedInMemory.sessionType.toUpperCase()}</div>
                          </div>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 space-y-6">
                      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm">
                          <h4 className="text-xs font-bold uppercase text-zinc-500 mb-2">Summary</h4>
                          <p className="text-sm font-medium text-zinc-900 dark:text-white leading-relaxed">{selectedInMemory.summary}</p>
                      </div>
                      <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 p-4 rounded-2xl shadow-sm">
                          <h4 className="text-xs font-bold uppercase text-brand-600 dark:text-brand-400 mb-2">Kindly Suggests</h4>
                          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{selectedInMemory.advice}</p>
                      </div>
                      <div>
                          <h4 className="text-xs font-bold uppercase text-zinc-500 mb-3 pl-1">
                              {selectedInMemory.sessionType === 'video' ? 'Conversation Log' : 'Forensic Analysis'}
                          </h4>
                          <div className="space-y-3 border-l-2 border-zinc-200 dark:border-zinc-800 pl-4 py-2">
                              {selectedInMemory.transcript.map((msg) => (
                                  <div key={msg.id} className="text-sm">
                                      <div className={`text-[10px] font-bold uppercase mb-0.5 ${msg.role === 'user' ? 'text-zinc-400' : 'text-brand-500'}`}>{msg.role === 'user' ? userProfile.name : 'Dr. Moriesly'}</div>
                                      <div className={`leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-800 dark:text-zinc-200'}`}>{msg.text}</div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          );
      }

      // ── Archive list (backend chat sessions + in-memory video/clinical) ────────
      const sessionTypeIcon = (type: string) => {
          if (type === 'video')    return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
          if (type === 'clinical') return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
          return <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>;
      };

      const handleOpenBackendSession = async (session: BackendChatSession) => {
          try {
              const detail = await getChatSession(session.id);
              if (session.status === 'active') {
                  // Resume: load messages and switch to chat mode
                  setCurrentSessionId(session.id);
                  if (detail.messages.length > 0) {
                      setMessages(
                          detail.messages.map(m => ({
                              id:        m.id,
                              role:      m.role as 'user' | 'model',
                              text:      m.text,
                              timestamp: new Date(m.timestamp),
                          }))
                      );
                  }
                  setMode('chat');
              } else {
                  // Ended: show read-only archive
                  setSelectedBackendSession(detail);
              }
          } catch (err) {
              console.error('[ConsultantScreen] getChatSession failed:', err);
          }
      };

      const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
          e.stopPropagation();
          setIsDeletingSession(sessionId);
          try {
              await deleteChatSession(sessionId);
              setBackendSessions(prev => prev.filter(s => s.id !== sessionId));
          } catch (err) {
              console.error('[ConsultantScreen] deleteChatSession failed:', err);
          } finally {
              setIsDeletingSession(null);
          }
      };

      const hasAnySessions = backendSessions.length > 0 || consultationHistory.length > 0;

      return (
          <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300 mb-20">
              <div className="flex justify-between items-center mb-6">
                  <div>
                      <h2 className="text-2xl font-black text-white uppercase tracking-tight">Your Journey</h2>
                      <p className="text-[10px] text-zinc-500 font-mono uppercase mt-0.5">
                          {backendSessions.length} chat{backendSessions.length !== 1 ? 's' : ''} · {consultationHistory.length} other sessions
                      </p>
                  </div>
                  <button onClick={() => setMode('selection')} className="text-zinc-400 hover:text-white text-sm">Back</button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                  {isLoadingHistory ? (
                      <div className="flex items-center justify-center py-16 gap-3 text-zinc-400">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-sm">Loading archives...</span>
                      </div>
                  ) : !hasAnySessions ? (
                      <div className="text-center text-zinc-500 py-10">No sessions yet. Let's start one!</div>
                  ) : (
                      <>
                          {/* Backend chat sessions */}
                          {backendSessions.map(session => (
                              <button
                                  key={session.id}
                                  onClick={() => handleOpenBackendSession(session)}
                                  className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between hover:border-brand-500 transition-colors group text-left"
                              >
                                  <div className="flex items-center gap-4 min-w-0 flex-1">
                                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-brand-500/20 text-brand-400 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                                          {sessionTypeIcon(session.sessionType)}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                          <div className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                                              <span>{new Date(session.createdAt).toLocaleDateString()}</span>
                                              {session.status === 'active' ? (
                                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-brand-500/20 text-brand-400 border border-brand-500/30 animate-pulse">
                                                      ● Active
                                                  </span>
                                              ) : (
                                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-zinc-800 text-zinc-500">
                                                      ended
                                                  </span>
                                              )}
                                              <span>· {session.messageCount} msgs</span>
                                          </div>
                                          <div className="font-bold text-white text-sm truncate">
                                              {session.summary || 'Chat session'}
                                          </div>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 ml-2">
                                      <button
                                          onClick={(e) => handleDeleteSession(e, session.id)}
                                          disabled={isDeletingSession === session.id}
                                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
                                          title="Delete session"
                                      >
                                          {isDeletingSession === session.id
                                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                              : <Trash2 className="w-3.5 h-3.5" />
                                          }
                                      </button>
                                      <span className="text-zinc-500 group-hover:text-white">→</span>
                                  </div>
                              </button>
                          ))}

                          {/* In-memory video/clinical sessions */}
                          {consultationHistory.filter(s => s.sessionType !== 'chat').map(session => (
                              <button
                                  key={session.id}
                                  onClick={() => setSelectedSession(session)}
                                  className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between hover:border-brand-500 transition-colors group"
                              >
                                  <div className="flex items-center gap-4 text-left">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0 ${session.sessionType === 'video' ? 'bg-rose-500/20 text-rose-400 group-hover:bg-rose-500 group-hover:text-white' : 'bg-brand-500/20 text-brand-400 group-hover:bg-brand-500 group-hover:text-white'}`}>
                                          {sessionTypeIcon(session.sessionType)}
                                      </div>
                                      <div className="min-w-0">
                                          <div className="text-xs font-bold text-zinc-500 uppercase flex gap-2">
                                              <span>{session.date.toLocaleDateString()}</span>
                                              {session.sessionType === 'video' && <span>• {session.durationSeconds}s</span>}
                                          </div>
                                          <div className="font-bold text-white text-sm line-clamp-1">{session.summary}</div>
                                      </div>
                                  </div>
                                  <div className="text-zinc-500 group-hover:text-white">→</div>
                              </button>
                          ))}
                      </>
                  )}
              </div>
          </div>
      );
  }

  // --- CHAT MODE ---
  if (mode === 'chat') {
      return (
          <div className="flex flex-col h-[calc(100dvh-130px)] md:h-[750px] bg-zinc-50 dark:bg-black rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in slide-in-from-right-4 duration-300 relative z-10 shadow-xl mx-[-10px] md:mx-0 mb-24">
              <div className="bg-zinc-100 dark:bg-zinc-900 p-3 md:p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between flex-shrink-0 z-30 relative">
                  <div className="flex items-center gap-3">
                      <button onClick={() => setMode('selection')} className="text-zinc-500 hover:text-brand-500">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 overflow-hidden border-2 border-white dark:border-zinc-700 shadow-md">
                              <img src={aiAvatarUrl} alt="Moriesly AI" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex flex-col">
                              <span className="text-sm font-bold text-zinc-900 dark:text-white">Dr. Moriesly</span>
                              <span className="text-[10px] text-brand-500 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse"></span> Caring for you</span>
                          </div>
                      </div>
                  </div>
                  <button onClick={handleEndChat} disabled={isSaving || messages.length <= 1} className="bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-600 dark:text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed">
                      {isSaving ? ( <>Wrap up...</> ) : ( <> <span className="hidden sm:inline">Finish</span> <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> </> )}
                  </button>
              </div>
              {/* Loading overlay while checking / restoring active session */}
              {isResumingSession && (
                  <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
                      <p className="text-sm text-zinc-300 font-medium">Loading your session…</p>
                  </div>
              )}

              <div className="flex-1 overflow-y-auto p-3 md:p-5 space-y-6 pb-20 scroll-smooth">
                  {messages.map((msg) => (
                      <div key={msg.id} className={`flex items-end gap-2 md:gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className="relative group flex-shrink-0">
                              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-sm bg-zinc-100 dark:bg-zinc-800 cursor-pointer">
                                  {msg.role === 'user' ? ( customUserPhoto ? ( <img src={`data:image/jpeg;base64,${customUserPhoto}`} alt={msg.role} className="w-full h-full object-cover" onClick={() => profileInputRef.current?.click()} /> ) : ( <div onClick={() => profileInputRef.current?.click()} className="w-full h-full"> <UserDefaultAvatar gender={userProfile.gender} /> </div> ) ) : ( <img src={aiAvatarUrl} alt="Moriesly AI" className="w-full h-full object-cover" /> )}
                              </div>
                              {msg.role === 'user' && ( <button className="absolute -bottom-1 -right-1 bg-zinc-800 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => profileInputRef.current?.click()} title="Change Photo"> <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg> </button> )}
                          </div>
                          <div className={`max-w-[85%] md:max-w-[80%] rounded-2xl p-3 md:p-4 shadow-sm text-sm md:text-base ${msg.role === 'user' ? 'bg-brand-600 text-white rounded-br-none' : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-bl-none border border-zinc-200 dark:border-zinc-700'}`}>
                              {msg.image && ( <div className="mb-2 rounded-lg overflow-hidden border border-white/20"> <img src={`data:image/jpeg;base64,${msg.image}`} alt="User upload" className="max-w-full h-auto" /> </div> )}
                              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                              <div className={`text-[9px] mt-1 opacity-50 ${msg.role === 'user' ? 'text-brand-200' : 'text-zinc-400'}`}>{msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                          </div>
                      </div>
                  ))}
                  {isTyping && (
                      <div className="flex items-end gap-2 md:gap-3">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden flex-shrink-0 border border-zinc-200 dark:border-zinc-700 shadow-sm bg-zinc-100 dark:bg-zinc-800">
                              <img src={aiAvatarUrl} alt="Thinking" className="w-full h-full object-cover" />
                          </div>
                          <div className="bg-white dark:bg-zinc-800 rounded-2xl rounded-bl-none p-4 border border-zinc-200 dark:border-zinc-700">
                              <div className="flex gap-1"> <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce"></span> <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span> <span className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span> </div>
                          </div>
                      </div>
                  )}
                  <div ref={messagesEndRef} />
              </div>
              <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageUpload} />
              <input type="file" ref={profileInputRef} accept="image/*" className="hidden" onChange={handleProfileUpload} />
              <div className="bg-white dark:bg-zinc-900 p-3 md:p-4 border-t border-zinc-200 dark:border-zinc-800 flex-shrink-0 z-30">
                  {attachedImage && ( <div className="flex items-center gap-2 mb-2 bg-zinc-100 dark:bg-zinc-800 p-2 rounded-lg w-fit"> <span className="text-xs text-zinc-500">Image attached</span> <button onClick={() => setAttachedImage(null)} className="text-zinc-400 hover:text-zinc-600">×</button> </div> )}
                  <div className="flex items-end gap-2">
                      <button onClick={() => fileInputRef.current?.click()} className="p-3 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-xl"> <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg> </button>
                      <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center px-4 py-2 border border-transparent focus-within:border-brand-500 transition-colors"> <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Tell me what's on your mind..." className="w-full bg-transparent border-none outline-none text-sm text-zinc-900 dark:text-white placeholder-zinc-500 max-h-20" /> </div>
                      <button onClick={handleSendMessage} disabled={!input.trim() && !attachedImage} className="p-3 bg-brand-500 hover:bg-brand-400 text-white rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"> <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> </button>
                  </div>
              </div>
          </div>
      );
  }

  return null;
};

export default ConsultantScreen;
