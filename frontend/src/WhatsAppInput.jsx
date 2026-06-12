import React, { useState, useRef, useEffect } from 'react';
import { Smile, Paperclip, Mic, Send, StopCircle, X, FileText, Image, Music, Video } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

export default function WhatsAppInput({
  value, onChange, onSend, onSendMedia,
  placeholder = "Type a message",
  disabled = false,
  showSendButton = true
}) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [attachedFile, setAttachedFile] = useState(null);
  const [sending, setSending] = useState(false);

  const emojiRef = useRef(null);
  const attachMenuRef = useRef(null);
  const docInputRef = useRef(null);
  const mediaInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Close popups on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false);
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target)) setShowAttachMenu(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const onEmojiClick = (emojiObject) => {
    onChange({ target: { value: value + emojiObject.emoji } });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- File selection ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAttachedFile(file);
    setShowAttachMenu(false);
    e.target.value = '';
  };

  const removeAttachment = () => setAttachedFile(null);

  const getFileIcon = (file) => {
    if (!file) return <FileText size={16} />;
    if (file.type.startsWith('image/')) return <Image size={16} color="#00a884" />;
    if (file.type.startsWith('video/')) return <Video size={16} color="#8b5cf6" />;
    if (file.type.startsWith('audio/')) return <Music size={16} color="#f59e0b" />;
    return <FileText size={16} color="#3b82f6" />;
  };

  // --- Voice Recording ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      alert('Microphone access denied. Please allow mic permissions in your browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) mediaRecorderRef.current.stop();
    setIsRecording(false);
    setAudioBlob(null);
    clearInterval(timerRef.current);
    setRecordingTime(0);
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // --- Main Send ---
  const handleSend = async () => {
    // Send audio voice note
    if (audioBlob && onSendMedia) {
      const file = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
      setSending(true);
      await onSendMedia(file, '');
      setSending(false);
      setAudioBlob(null);
      setRecordingTime(0);
      return;
    }
    // Send file attachment
    if (attachedFile && onSendMedia) {
      setSending(true);
      await onSendMedia(attachedFile, value);
      setSending(false);
      setAttachedFile(null);
      onChange({ target: { value: '' } });
      return;
    }
    // Send text
    if (onSend && value.trim()) onSend();
  };

  const hasText = value.trim().length > 0;
  const hasMedia = !!attachedFile || !!audioBlob;
  const showSend = hasText || hasMedia;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Hidden file inputs */}
      <input ref={docInputRef} type="file"
        accept=".pdf,.doc,.docx,.xlsx,.xls,.txt,.zip,.rar,.csv"
        style={{ display: 'none' }} onChange={handleFileChange} />
      <input ref={mediaInputRef} type="file"
        accept="image/*,video/*,audio/*"
        style={{ display: 'none' }} onChange={handleFileChange} />

      {/* Emoji Picker */}
      {showEmoji && (
        <div ref={emojiRef} style={{ position: 'absolute', bottom: '110%', left: 0, zIndex: 100, marginBottom: '0.5rem' }}>
          <EmojiPicker onEmojiClick={onEmojiClick} theme="dark" />
        </div>
      )}

      {/* Attachment Menu — WhatsApp style */}
      {showAttachMenu && (
        <div ref={attachMenuRef} style={{
          position: 'absolute', bottom: '110%', left: '2rem', zIndex: 100,
          background: '#233138', borderRadius: '12px', overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)', minWidth: '180px'
        }}>
          <button type="button" onClick={() => docInputRef.current.click()} style={{
            width: '100%', background: 'none', border: 'none', color: '#d1d7db',
            display: 'flex', alignItems: 'center', gap: '0.85rem',
            padding: '0.85rem 1.2rem', cursor: 'pointer', fontSize: '0.95rem',
            borderBottom: '1px solid rgba(255,255,255,0.06)'
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#2a3942'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <div style={{ background: '#3b82f6', borderRadius: '50%', padding: '0.4rem', display: 'flex' }}>
              <FileText size={18} color="#fff" />
            </div>
            Document
          </button>
          <button type="button" onClick={() => mediaInputRef.current.click()} style={{
            width: '100%', background: 'none', border: 'none', color: '#d1d7db',
            display: 'flex', alignItems: 'center', gap: '0.85rem',
            padding: '0.85rem 1.2rem', cursor: 'pointer', fontSize: '0.95rem'
          }}
            onMouseEnter={e => e.currentTarget.style.background = '#2a3942'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <div style={{ background: '#8b5cf6', borderRadius: '50%', padding: '0.4rem', display: 'flex' }}>
              <Image size={18} color="#fff" />
            </div>
            Photos & Videos
          </button>
        </div>
      )}

      {/* Attachment Preview */}
      {attachedFile && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          background: '#2a3942', borderRadius: '8px', padding: '0.5rem 0.85rem',
          marginBottom: '0.4rem', fontSize: '0.85rem', color: '#d1d7db'
        }}>
          {getFileIcon(attachedFile)}
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {attachedFile.name}
          </span>
          <span style={{ color: '#8696a0', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
            {(attachedFile.size / 1024).toFixed(1)} KB
          </span>
          <button type="button" onClick={removeAttachment}
            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex' }}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* Audio preview after recording stops */}
      {audioBlob && !isRecording && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: '#2a3942', borderRadius: '8px', padding: '0.5rem 0.85rem', marginBottom: '0.4rem'
        }}>
          <Music size={18} color="#00a884" />
          <audio controls src={URL.createObjectURL(audioBlob)} style={{ flex: 1, height: '32px' }} />
          <button type="button" onClick={() => setAudioBlob(null)}
            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* Main Input Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        background: '#202c33', padding: '0.5rem 1rem', borderRadius: '12px'
      }}>
        {isRecording ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1s infinite' }} />
              <span style={{ color: '#d1d7db' }}>Recording... {formatTime(recordingTime)}</span>
            </div>
            <button type="button" onClick={cancelRecording}
              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex' }}>
              <X size={22} />
            </button>
            <button type="button" onClick={stopRecording}
              style={{ background: '#00a884', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '40px', minHeight: '40px' }}>
              <StopCircle size={20} />
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => { setShowEmoji(!showEmoji); setShowAttachMenu(false); }}
              style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: '0.2rem', display: 'flex' }}>
              <Smile size={24} />
            </button>

            <button type="button" onClick={() => { setShowAttachMenu(!showAttachMenu); setShowEmoji(false); }} disabled={disabled}
              style={{ background: 'none', border: 'none', color: attachedFile ? '#00a884' : '#8696a0', cursor: disabled ? 'not-allowed' : 'pointer', padding: '0.2rem', display: 'flex' }}>
              <Paperclip size={22} />
            </button>

            <textarea
              value={value}
              onChange={onChange}
              onKeyDown={handleKeyDown}
              placeholder={attachedFile ? 'Add a caption (optional)...' : placeholder}
              disabled={disabled || sending}
              rows="1"
              style={{
                flex: 1, background: '#2a3942', border: 'none', color: '#d1d7db',
                padding: '0.6rem 1rem', borderRadius: '8px', outline: 'none',
                resize: 'none', fontFamily: 'inherit', fontSize: '1rem',
                maxHeight: '100px', overflowY: 'auto'
              }}
            />

            {!showSend && !audioBlob && (
              <button type="button" onClick={startRecording} disabled={disabled}
                style={{ background: 'none', border: 'none', color: '#8696a0', cursor: disabled ? 'not-allowed' : 'pointer', padding: '0.2rem', display: 'flex' }}>
                <Mic size={24} />
              </button>
            )}

            {(showSend || audioBlob) && (
              <button type="button" onClick={handleSend} disabled={disabled || sending}
                style={{
                  background: sending ? '#1a5c49' : '#00a884', border: 'none', color: '#fff',
                  cursor: sending ? 'not-allowed' : 'pointer', padding: '0.5rem', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '40px', minHeight: '40px',
                  transition: 'background 0.2s'
                }}>
                {sending ? <div style={{ width: 18, height: 18, border: '2px solid #fff', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : <Send size={20} style={{ marginLeft: '2px' }} />}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
