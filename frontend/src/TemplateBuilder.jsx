import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Save, Image as ImageIcon, Video, FileText, Smartphone, ArrowLeft, Zap, CheckCircle2, ChevronRight, Atom, ChevronDown } from 'lucide-react';
import axios from 'axios';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const api = axios.create({ baseURL: API_URL });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function TemplateBuilder({ setActiveTab }) {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // View state: 'list', 'setup', 'edit'
    const [view, setView] = useState('list'); 
    
    // Form State
    const [currentId, setCurrentId] = useState(null);
    const [name, setName] = useState('');
    const [category, setCategory] = useState('Marketing');
    const [language, setLanguage] = useState('en');
    
    // Components State
    const [headerType, setHeaderType] = useState('NONE'); // NONE, TEXT, IMAGE, VIDEO, DOCUMENT
    const [headerText, setHeaderText] = useState('');
    const [headerMediaUrl, setHeaderMediaUrl] = useState('');
    const [bodyText, setBodyText] = useState('');
    const [footerText, setFooterText] = useState('');
    
    // Buttons State
    const [buttons, setButtons] = useState([]);
    
    // File input ref for resetting after error
    const fileInputRef = useRef(null); 

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await api.get('/api/templates');
            setTemplates(res.data);
        } catch (err) {
            console.error('Error fetching templates:', err);
        }
    };

    const handleCreateNew = () => {
        setCurrentId(null);
        setName('');
        setCategory('Marketing');
        setLanguage('en');
        setHeaderType('NONE');
        setHeaderText('');
        setHeaderMediaUrl('');
        setBodyText('');
        setFooterText('');
        setButtons([]);
        setView('setup'); // Go to Step 1
    };

    const handleEdit = (tpl) => {
        setCurrentId(tpl.id);
        setName(tpl.name);
        setCategory(tpl.category);
        setLanguage(tpl.language);
        
        const comps = tpl.components || {};
        setHeaderType(comps.header?.type || 'NONE');
        setHeaderText(comps.header?.text || '');
        setHeaderMediaUrl(comps.header?.mediaUrl || '');
        setBodyText(comps.body || '');
        setFooterText(comps.footer || '');
        setButtons(comps.buttons || []);
        
        setView('edit'); // Skip to Step 2 for editing
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this template?')) return;
        try {
            await api.delete(`/api/templates/${id}`);
            fetchTemplates();
        } catch (err) {
            alert('Failed to delete template');
        }
    };

    const handleSave = async () => {
        if (!name.trim()) return alert('Template name is required');
        if (!bodyText.trim()) return alert('Template body is required');

        const components = {
            header: {
                type: headerType,
                text: headerType === 'TEXT' ? headerText : undefined,
                mediaUrl: ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) ? headerMediaUrl : undefined
            },
            body: bodyText,
            footer: footerText,
            buttons: buttons.filter(b => b.text.trim() !== '')
        };

        const payload = { name, category, language, components };
        setLoading(true);

        try {
            if (currentId) {
                await api.put(`/api/templates/${currentId}`, payload);
            } else {
                await api.post('/api/templates', payload);
            }
            await fetchTemplates();
            setView('list');
        } catch (err) {
            alert('Failed to save template');
        } finally {
            setLoading(false);
        }
    };

    const insertVariable = () => {
        const varNum = (bodyText.match(/{{/g) || []).length + 1;
        setBodyText(prev => prev + `{{${varNum}}}`);
    };

    const addButton = () => {
        if (buttons.length >= 3) return alert('Maximum 3 buttons allowed');
        setButtons([...buttons, { type: 'QUICK_REPLY', text: '', url: '', phone: '' }]);
    };

    const removeButton = (idx) => {
        setButtons(buttons.filter((_, i) => i !== idx));
    };

    const updateButton = (idx, field, val) => {
        const newBtn = [...buttons];
        newBtn[idx][field] = val;
        setButtons(newBtn);
    };

    const stripHtml = (html) => {
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        let text = tmp.textContent || tmp.innerText || "";
        return text;
    };

    // Replace Meta specific colors with the App's global CSS variables
    const themeBlue = 'var(--accent, #6366f1)';
    const themeBg = 'var(--bg-deep, #0f172a)';
    const themeCardBg = 'var(--bg-card, #1e293b)';
    const themeText = 'var(--text-primary, #f8fafc)';
    const themeTextMuted = 'var(--text-secondary, #94a3b8)';
    const themeBorder = 'var(--border-color, rgba(255,255,255,0.1))';
    const themeInputBg = 'var(--bg-primary, #0f172a)';

    // RENDER LIST VIEW (Step 0)
    if (view === 'list') {
        return (
            <div style={{ width: '100%', height: '100%' }}>
                <div className="page-header">
                    <div className="page-title-area">
                        <div className="welcome-chip"><Zap size={14} style={{ marginRight: '4px' }} /> WhatsApp Template Studio</div>
                        <h1>Message Templates</h1>
                        <p>Build and save interactive templates for bulk sending</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button 
                            onClick={() => setActiveTab && setActiveTab('rules')}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.4rem 0.8rem', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s' }}
                            title="Keyword Rules"
                        >
                            <Atom size={18} />
                        </button>
                        <button className="btn-premium primary" onClick={handleCreateNew} style={{ width: 'auto', padding: '0 1.5rem' }}>
                            Create Template
                        </button>
                    </div>
                </div>

                <div className="bento-grid">
                    {templates.map(tpl => (
                        <div key={tpl.id} className="bento-card">
                            <div className="card-top">
                                <div>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{tpl.name}</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
                                        {tpl.category} • {tpl.language.toUpperCase()}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => handleEdit(tpl)} style={{ background: 'rgba(99,102,241,0.1)', border: 'none', padding: '0.5rem', borderRadius: '8px', color: '#6366f1', cursor: 'pointer' }}>
                                        Edit
                                    </button>
                                    <button onClick={() => handleDelete(tpl.id)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', padding: '0.5rem', borderRadius: '8px', color: '#ef4444', cursor: 'pointer' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                {stripHtml(tpl.components?.body || '').substring(0, 100)}...
                            </div>
                        </div>
                    ))}
                    {templates.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-xl)' }}>
                            <FileText size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                            <h3>No templates found</h3>
                            <p style={{ color: 'var(--text-muted)' }}>Create your first template to get started</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // STEPS NAVIGATION COMPONENT (Modified based on feedback)
    const Stepper = ({ currentStep }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: `1px solid ${themeBorder}`, paddingBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: themeText, margin: 0, marginRight: '1rem' }}>Create template</h2>
            
            <div 
                onClick={() => setView('setup')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: currentStep === 1 ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s' }}
            >
                {currentStep > 1 ? <CheckCircle2 size={18} color={themeBlue} /> : <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${themeBlue}`, borderLeftColor: 'transparent', transform: 'rotate(-45deg)' }} />}
                <span style={{ color: currentStep === 1 ? themeBlue : themeText, fontWeight: 'bold', fontSize: '0.95rem' }}>Set up template</span>
            </div>
            
            <span style={{ color: themeTextMuted }}>•••</span>
            
            <div 
                onClick={() => setView('edit')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: currentStep === 2 ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s' }}
            >
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${currentStep === 2 ? themeBlue : themeTextMuted}` }} />
                <span style={{ color: currentStep === 2 ? themeBlue : themeTextMuted, fontWeight: currentStep === 2 ? 'bold' : 'normal', fontSize: '0.95rem' }}>Edit template</span>
            </div>
        </div>
    );

    // RENDER STEP 1 (Set up template)
    if (view === 'setup') {
        const handleNextStep = () => {
            if (!name.trim()) {
                document.getElementById('setup-name-error').style.display = 'block';
                document.getElementById('setup-name-error').textContent = 'Template name is required.';
                return;
            }
            // Duplicate name check (exclude current template if editing)
            const isDuplicate = templates.some(t => 
                t.name.toLowerCase() === name.trim().toLowerCase() && t.id !== currentId
            );
            if (isDuplicate) {
                document.getElementById('setup-name-error').style.display = 'block';
                document.getElementById('setup-name-error').textContent = `A template named "${name}" already exists. Please choose a different name.`;
                return;
            }
            if (!category) {
                document.getElementById('setup-cat-error').style.display = 'block';
                return;
            }
            document.getElementById('setup-name-error').style.display = 'none';
            document.getElementById('setup-cat-error').style.display = 'none';
            setView('edit');
        };

        return (
            <div style={{ minHeight: '80vh', padding: '2rem', borderRadius: '12px', fontFamily: 'Segoe UI, Helvetica, Arial, sans-serif' }}>
                <Stepper currentStep={1} />
                
                <div style={{ background: themeCardBg, borderRadius: '8px', border: `1px solid ${themeBorder}`, padding: '2rem', maxWidth: '1000px', margin: '0 auto', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                    <h3 style={{ fontSize: '1.2rem', color: themeText, marginBottom: '0.5rem' }}>Set up your template</h3>
                    <p style={{ color: themeTextMuted, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                        Choose the category that best describes your message template. Then select the type of message you want to send.
                    </p>
                    
                    {/* Template name and language */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1.1rem', color: themeText, marginBottom: '1rem' }}>Template name and language</h3>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 2 }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: themeTextMuted, marginBottom: '0.5rem' }}>Name your template</label>
                                <input 
                                    type="text" 
                                    value={name} 
                                    onChange={e => {
                                        setName(e.target.value.replace(/\s+/g, '_'));
                                        const err = document.getElementById('setup-name-error');
                                        if (err) err.style.display = 'none';
                                    }} 
                                    placeholder="Enter a template name (e.g. Order_Alert)" 
                                    style={{ width: '100%', padding: '0.8rem', border: `1px solid ${themeBorder}`, background: themeInputBg, borderRadius: '6px', fontSize: '0.95rem', color: themeText, outline: 'none' }} 
                                />
                                <span id="setup-name-error" style={{ display: 'none', color: '#ef4444', fontSize: '0.82rem', marginTop: '0.4rem', display: 'none' }}>Template name is required.</span>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', color: themeTextMuted, marginBottom: '0.5rem' }}>Select language</label>
                                <select value={language} onChange={e => setLanguage(e.target.value)} style={{ width: '100%', padding: '0.8rem', border: `1px solid ${themeBorder}`, background: themeInputBg, borderRadius: '6px', fontSize: '0.95rem', color: themeText, outline: 'none' }}>
                                    <option value="en">English</option>
                                    <option value="ur">Urdu</option>
                                    <option value="ar">Arabic</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Category Tabs */}
                    <h3 style={{ fontSize: '1.1rem', color: themeText, marginBottom: '1rem' }}>Template Category</h3>
                    <div style={{ display: 'flex', border: `1px solid ${themeBorder}`, borderRadius: '6px', overflow: 'hidden' }}>
                        {['Marketing', 'Utility', 'Authentication'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategory(cat)}
                                style={{
                                    flex: 1, padding: '1rem', background: category === cat ? 'rgba(255,255,255,0.05)' : 'transparent',
                                    border: 'none', borderRight: cat !== 'Authentication' ? `1px solid ${themeBorder}` : 'none',
                                    cursor: 'pointer', fontWeight: category === cat ? 'bold' : 'normal',
                                    color: category === cat ? themeBlue : themeText, fontSize: '0.95rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {cat === 'Marketing' && <Zap size={16} />}
                                {cat === 'Utility' && <FileText size={16} />}
                                {cat === 'Authentication' && <CheckCircle2 size={16} />}
                                {cat}
                            </button>
                        ))}
                    </div>
                    <span id="setup-cat-error" style={{ display: 'none', color: '#ef4444', fontSize: '0.82rem', marginTop: '0.5rem' }}>Please select a category.</span>
                </div>
                
                <div style={{ maxWidth: '1000px', margin: '1rem auto', display: 'flex', justifyContent: 'space-between' }}>
                    <button 
                        onClick={() => setView('list')}
                        style={{ background: 'rgba(255,255,255,0.05)', color: themeText, border: `1px solid ${themeBorder}`, padding: '0.6rem 2rem', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', transition: 'background 0.2s' }}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleNextStep}
                        className="btn-premium primary"
                        style={{ padding: '0.6rem 2rem', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer' }}
                    >
                        Next
                    </button>
                </div>
            </div>
        );
    }

    // RENDER STEP 2 (Edit template)
    if (view === 'edit') {
        const inputStyle = { width: '100%', padding: '0.8rem', border: `1px solid ${themeBorder}`, background: themeInputBg, borderRadius: '6px', fontSize: '0.95rem', color: themeText, outline: 'none' };
        
        return (
            <div style={{ minHeight: '80vh', padding: '2rem', borderRadius: '12px', fontFamily: 'Segoe UI, Helvetica, Arial, sans-serif' }}>
                <Stepper currentStep={2} />
                
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                    
                    {/* LEFT PANEL: CONTENT EDITOR */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        
                        {/* Content block */}
                        <div style={{ background: themeCardBg, padding: '1.5rem', borderRadius: '8px', border: `1px solid ${themeBorder}` }}>
                            <h3 style={{ fontSize: '1.1rem', color: themeText, marginBottom: '0.5rem' }}>Content</h3>
                            <p style={{ color: themeTextMuted, fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                                Design your message structure by adding a header, body text with dynamic variables `{"{{1}}"}`. These templates will be saved locally for rapid bulk broadcasting.
                            </p>

                            {/* Header */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 'bold', color: themeText, marginBottom: '0.5rem' }}>Header <span style={{ color: themeTextMuted, fontWeight: 'normal' }}>- Optional</span></label>
                                <select value={headerType} onChange={e => setHeaderType(e.target.value)} style={{ ...inputStyle, width: '200px', marginBottom: '0.5rem' }}>
                                    <option value="NONE">None</option>
                                    <option value="TEXT">Text</option>
                                    <option value="IMAGE">Image</option>
                                    <option value="DOCUMENT">Document</option>
                                    <option value="VIDEO">Video</option>
                                </select>
                                
                                {headerType === 'TEXT' && (
                                    <input type="text" value={headerText} onChange={e => setHeaderText(e.target.value)} placeholder="Add a short line of text to the header of your message" style={inputStyle} maxLength={60} />
                                )}
                                {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && (
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <input 
                                            type="file" 
                                            ref={fileInputRef}
                                            onChange={async (e) => {
                                                const file = e.target.files[0];
                                                if (!file) return;
                                                const formData = new FormData();
                                                formData.append('file', file);
                                                try {
                                                    setLoading(true);
                                                    const res = await api.post('/api/upload', formData, {
                                                        headers: { 'Content-Type': 'multipart/form-data' },
                                                        timeout: 120000
                                                    });
                                                    setHeaderMediaUrl(res.data.url);
                                                } catch (err) {
                                                    const msg = err.response?.data?.error || err.message || 'Upload failed. Please try again.';
                                                    alert(`Upload Error: ${msg}`);
                                                    // Auto-clear file input after error
                                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                            accept={headerType === 'IMAGE' ? 'image/*' : headerType === 'VIDEO' ? 'video/*' : '*'}
                                            style={{ ...inputStyle, padding: '0.6rem' }} 
                                            key={headerMediaUrl || 'empty'}
                                        />
                                        {headerMediaUrl && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ color: '#00a884', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>Uploaded ✓</span>
                                                <button onClick={() => setHeaderMediaUrl('')} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.4rem', borderRadius: '4px' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Body */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <label style={{ fontSize: '0.95rem', fontWeight: 'bold', color: themeText }}>Body</label>
                                    <button 
                                        onClick={insertVariable} 
                                        style={{ 
                                            background: 'rgba(99,102,241,0.12)', 
                                            border: `1px solid rgba(99,102,241,0.3)`, 
                                            color: themeBlue, 
                                            fontWeight: '600', 
                                            fontSize: '0.82rem', 
                                            cursor: 'pointer',
                                            padding: '0.3rem 0.8rem',
                                            borderRadius: '20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.3rem',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <span style={{ fontSize: '1rem', lineHeight: 1 }}>+</span> Add variable
                                    </button>
                                </div>
                                <div style={{ border: `1px solid ${themeBorder}`, borderRadius: '6px', overflow: 'hidden' }}>
                                    <style>{`
                                        .ql-editor { word-break: break-word !important; overflow-wrap: break-word !important; white-space: pre-wrap !important; min-height: 130px; }
                                        .ql-container { font-family: inherit !important; border: none !important; }
                                        .ql-toolbar { background: rgba(255,255,255,0.03) !important; border: none !important; border-bottom: 1px solid ${themeBorder} !important; padding: 6px 10px !important; }
                                        .ql-toolbar button { color: #94a3b8 !important; }
                                        .ql-toolbar button:hover, .ql-toolbar button.ql-active { color: #6366f1 !important; }
                                        .ql-toolbar .ql-stroke { stroke: currentColor !important; }
                                        .ql-toolbar .ql-fill { fill: currentColor !important; }
                                    `}</style>
                                    <ReactQuill 
                                        theme="snow" 
                                        value={bodyText} 
                                        onChange={setBodyText} 
                                        style={{ background: themeInputBg, color: themeText, wordBreak: 'break-word', overflowWrap: 'break-word' }}
                                        modules={{ toolbar: [['bold', 'italic', 'strike']] }}
                                    />
                                </div>
                            </div>

                            {/* Footer */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 'bold', color: themeText, marginBottom: '0.5rem' }}>Footer <span style={{ color: themeTextMuted, fontWeight: 'normal' }}>- Optional</span></label>
                                <input type="text" value={footerText} onChange={e => setFooterText(e.target.value)} placeholder="Add a short line of text to the bottom of your message" style={inputStyle} maxLength={60} />
                            </div>

                            {/* Buttons */}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 'bold', color: themeText, marginBottom: '0.5rem' }}>Buttons <span style={{ color: themeTextMuted, fontWeight: 'normal' }}>- Optional</span></label>
                                <p style={{ color: themeTextMuted, fontSize: '0.85rem', marginBottom: '1rem' }}>Create buttons that let customers respond to your message or take action.</p>
                                
                                <button onClick={addButton} style={{ background: 'transparent', border: `1px solid ${themeBorder}`, padding: '0.5rem 1rem', borderRadius: '6px', color: themeText, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    + Add button
                                </button>

                                {buttons.length > 0 && (
                                    <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                        {buttons.map((btn, idx) => (
                                            <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <select value={btn.type} onChange={e => updateButton(idx, 'type', e.target.value)} style={{ ...inputStyle, width: '150px' }}>
                                                    <option value="QUICK_REPLY">Quick Reply</option>
                                                    <option value="URL">Visit Website</option>
                                                    <option value="PHONE">Call Phone</option>
                                                </select>
                                                <input type="text" placeholder="Button text" value={btn.text} onChange={e => updateButton(idx, 'text', e.target.value)} style={inputStyle} />
                                                {btn.type === 'URL' && <input type="url" placeholder="https://" value={btn.url} onChange={e => updateButton(idx, 'url', e.target.value)} style={inputStyle} />}
                                                {btn.type === 'PHONE' && <input type="tel" placeholder="+123456789" value={btn.phone} onChange={e => updateButton(idx, 'phone', e.target.value)} style={inputStyle} />}
                                                <button onClick={() => removeButton(idx)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={18} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* RIGHT PANEL: PREVIEW */}
                    <div style={{ width: '380px', flexShrink: 0, position: 'sticky', top: '2rem' }}>
                        <div style={{ background: themeCardBg, borderRadius: '8px', border: `1px solid ${themeBorder}`, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                            <div style={{ padding: '1rem', borderBottom: `1px solid ${themeBorder}`, background: 'rgba(0,0,0,0.2)' }}>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', color: themeText }}>Template preview</h4>
                            </div>
                            
                            {/* Dark Mode WhatsApp Preview Style */}
                            <div style={{ background: '#0b141a', backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: 'contain', backgroundBlendMode: 'overlay', opacity: 0.9, padding: '1.5rem', minHeight: '400px' }}>
                                <div style={{ background: '#202c33', borderRadius: '8px', borderTopLeftRadius: '0', padding: '0.5rem', width: '90%', boxShadow: '0 1px 0.5px rgba(11,20,26,.13)' }}>
                                    
                                    {/* Header Preview */}
                                    {headerType === 'TEXT' && headerText && (
                                        <div style={{ padding: '0.5rem', paddingBottom: '0', color: '#e9edef', fontWeight: 'bold', fontSize: '1rem' }}>{headerText}</div>
                                    )}
                                    {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType) && (
                                        headerType === 'DOCUMENT' ? (
                                            // WhatsApp-style Document Preview Card
                                            <div style={{ background: '#1f2c34', borderRadius: '8px', marginBottom: '0.5rem', overflow: 'hidden' }}>
                                                {headerMediaUrl ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem' }}>
                                                        <div style={{ width: '44px', height: '44px', borderRadius: '8px', background: 'linear-gradient(135deg, #00a884, #007a63)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            <FileText size={22} color="white" />
                                                        </div>
                                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                                            <div style={{ color: '#e9edef', fontSize: '0.85rem', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {headerMediaUrl.split('/').pop()}
                                                            </div>
                                                            <div style={{ color: '#8696a0', fontSize: '0.75rem', marginTop: '2px' }}>
                                                                {headerMediaUrl.split('.').pop().toUpperCase()} · Document
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#8696a0' }}>
                                                        <FileText size={28} />
                                                        <span style={{ fontSize: '0.85rem' }}>No document selected</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            // Image / Video preview
                                            <div style={{ height: '140px', background: '#111b21', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8696a0', marginBottom: '0.5rem', overflow: 'hidden', position: 'relative' }}>
                                                {headerMediaUrl ? (
                                                    <>
                                                        {headerType === 'IMAGE' && <img src={headerMediaUrl} alt="Header preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                                        {headerType === 'VIDEO' && <video src={headerMediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />}
                                                    </>
                                                ) : (
                                                    <>
                                                        {headerType === 'IMAGE' && <ImageIcon size={32} />}
                                                        {headerType === 'VIDEO' && <Video size={32} />}
                                                    </>
                                                )}
                                            </div>
                                        )
                                    )}

                                    {/* Body Preview */}
                                    {bodyText ? (
                                        <div 
                                            style={{ padding: '0.5rem', color: '#e9edef', fontSize: '0.9rem', lineHeight: '1.6', wordBreak: 'break-word', overflowWrap: 'break-word' }}
                                            dangerouslySetInnerHTML={{ __html: bodyText }}
                                        />
                                    ) : (
                                        <div style={{ padding: '0.5rem', color: '#8696a0', fontStyle: 'italic', fontSize: '0.9rem' }}>Body text will appear here...</div>
                                    )}

                                    {/* Footer Preview */}
                                    {footerText && (
                                        <div style={{ padding: '0 0.5rem 0.5rem', color: '#8696a0', fontSize: '0.75rem' }}>{footerText}</div>
                                    )}
                                </div>

                                {/* Buttons Preview */}
                                {buttons.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '90%', marginTop: '2px' }}>
                                        {buttons.map((btn, idx) => (
                                            <div key={idx} style={{ background: '#202c33', color: '#00a884', padding: '0.6rem', textAlign: 'center', borderRadius: '8px', fontSize: '0.9rem', boxShadow: '0 1px 0.5px rgba(11,20,26,.13)' }}>
                                                {btn.text || 'Button'}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* BOTTOM ACTION BAR */}
                <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: `1px solid ${themeBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button 
                        onClick={() => setView('setup')}
                        style={{ background: 'rgba(255,255,255,0.05)', color: themeText, border: `1px solid ${themeBorder}`, padding: '0.6rem 1.5rem', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.95rem', cursor: 'pointer', transition: 'background 0.2s' }}
                    >
                        Previous
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={loading}
                        className="btn-premium primary"
                        style={{ padding: '0.6rem 2rem', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer' }}
                    >
                        {loading ? 'Saving...' : 'Save template'}
                    </button>
                </div>
            </div>
        );
    }
}
