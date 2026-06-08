import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, Sparkles, FileText, BookOpen, BrainCircuit, GitBranch, StickyNote, MessageSquare, Loader2, CheckCircle, Award, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../components/shared/Navbar';
import api from '../utils/api';
import styles from './PDFWorkspace.module.css';

// ✅ ADDED CHATBOT TO FEATURES CONFIGURATION
const FEATURES = [
  { key: 'summary', label: 'Summary', icon: <BookOpen size={20} />, desc: 'Concise overview of key concepts', color: '#a78bfa' },
  { key: 'mcq', label: 'MCQ Quiz', icon: <BrainCircuit size={20} />, desc: 'Test your understanding with questions', color: '#34d399' },
  { key: 'flowchart', label: 'Flow Diagram', icon: <GitBranch size={20} />, desc: 'Visual process & concept map', color: '#fbbf24' },
  { key: 'short_notes', label: 'Short Notes', icon: <StickyNote size={20} />, desc: 'Bullet-point revision notes', color: '#f87171' },
  { key: 'chatbot', label: 'Document Chat', icon: <MessageSquare size={20} />, desc: 'Ask any questions about this PPT/PDF', color: '#60a5fa' },
];

export default function PDFWorkspace() {
  const { pdfId } = useParams();
  const navigate = useNavigate();
  const [pdf, setPdf] = useState(null);
  const [results, setResults] = useState({});
  const [activeFeature, setActiveFeature] = useState(null);
  const [generating, setGenerating] = useState({});
  const [loading, setLoading] = useState(true);

  // ✅ Chatbot UI Context states
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/pdf/my-pdfs'),
      api.get(`/pdf/${pdfId}/results`),
    ]).then(([pdfsRes, resultsRes]) => {
      const found = pdfsRes.data.find(p => p.id === pdfId);
      setPdf(found);
      const map = {};
      resultsRes.data.forEach(r => { map[r.feature] = r; });
      setResults(map);
    }).catch(() => toast.error('Failed to load workspace'))
      .finally(() => setLoading(false));
  }, [pdfId]);

  const generate = async (feature) => {
    if (generating[feature]) return;
    setGenerating(g => ({ ...g, [feature]: true }));
    setActiveFeature(feature);
    try {
      const res = await api.post('/pdf/generate', { pdfId, feature });
      setResults(r => ({ ...r, [feature]: res.data }));
      toast.success(`${FEATURES.find(f => f.key === feature)?.label} generated!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Generation failed');
    } finally {
      setGenerating(g => ({ ...g, [feature]: false }));
    }
  };

  // ✅ NEW CUSTOM HANDLER FOR ASKING CHAT QUESTIONS
  const handleAskChatbot = async (e) => {
    e.preventDefault();
    if (!query.trim() || chatLoading) return;

    const userQuestion = query.trim();
    setQuery('');
    setChatLoading(true);

    // Immediately push user question into conversation layout view
    setChatHistory(prev => [...prev, { role: 'user', text: userQuestion }]);

    try {
      // Backend integration endpoint: sends question and pdf context tracker
      const res = await api.post('/pdf/generate', { pdfId, feature: 'chatbot', question: userQuestion });

      setChatHistory(prev => [...prev, { role: 'bot', text: res.data.result }]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not fetch answer');
      setChatHistory(prev => [...prev, { role: 'bot', text: "❌ Failed to retrieve answers. Please check server connection." }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="spinner" style={{ width: 40, height: 40 }} />
    </div>
  );

  const activeResult = activeFeature && results[activeFeature];
  const activeFeat = FEATURES.find(f => f.key === activeFeature);

  return (
    <div className={styles.page}>
      <Navbar />
      <div className={styles.workspace}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')} style={{ marginBottom: 24 }}>
            <ArrowLeft size={16} /> Back
          </button>

          {pdf && (
            <div className={styles.pdfInfo}>
              <div className={styles.pdfIcon}><FileText size={20} /></div>
              <div>
                <div className={styles.pdfName}>{pdf.originalName}</div>
                <div className={styles.pdfMeta}>
                  {new Date(pdf.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>
          )}

          <div className={styles.divider} />

          <p className={styles.sidebarLabel}>AI Features</p>
          <div className={styles.featureList}>
            {FEATURES.map(feat => {
              const done = !!results[feat.key];
              const isGenerating = generating[feat.key];
              const isActive = activeFeature === feat.key;

              return (
                <button
                  key={feat.key}
                  className={`${styles.featureBtn} ${isActive ? styles.active : ''}`}
                  onClick={() => {
                    setActiveFeature(feat.key);
                    if (!done && feat.key !== 'chatbot') generate(feat.key);
                  }}
                  style={{ '--feat-color': feat.color }}
                >
                  <div className={styles.featIcon} style={{ color: feat.color }}>
                    {isGenerating ? <Loader2 size={20} className={styles.spin} /> : feat.icon}
                  </div>
                  <div className={styles.featText}>
                    <div className={styles.featLabel}>
                      {feat.label}
                      {done && feat.key !== 'chatbot' && <CheckCircle size={13} style={{ color: '#34d399' }} />}
                    </div>
                    <div className={styles.featDesc}>{feat.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main content */}
        <main className={styles.content}>
          {!activeFeature ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}><Sparkles size={48} /></div>
              <h2>Choose an AI Feature</h2>
              <p>Select a feature from the sidebar to generate AI-powered content from your PDF.</p>
              <div className={styles.featureCards}>
                <div className={styles.featureCards}>
                  {FEATURES.map(feat => (
                    <button key={feat.key} className={styles.featureCard}
                      onClick={() => {
                        setActiveFeature(feat.key);
                        // ✅ ADDED CHATBOT EXCLUSION HERE TO PREVENT BROKEN OVER-THE-AIR RE-GENERATION MANDATES
                        if (!results[feat.key] && feat.key !== 'chatbot') generate(feat.key);
                      }}>
                      <div style={{ color: feat.color, marginBottom: 10 }}>{feat.icon}</div>
                      <div className={styles.featCardLabel}>{feat.label}</div>
                      <div className={styles.featCardDesc}>{feat.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.resultArea} key={activeFeature}>
              <div className={styles.resultHeader}>
                <div className={styles.resultTitle} style={{ color: activeFeat?.color }}>
                  {activeFeat?.icon}
                  <span>{activeFeat?.label}</span>
                </div>
                {results[activeFeature] && activeFeature !== 'chatbot' && (
                  <button className="btn btn-ghost" onClick={() => generate(activeFeature)} disabled={generating[activeFeature]}>
                    {generating[activeFeature] ? <Loader2 size={16} className={styles.spin} /> : <><Sparkles size={16} /> Regenerate</>}
                  </button>
                )}
              </div>

              {/* RENDER CHATBOT COMPONENT INTERFACE EXCLUSIVELY */}
              {activeFeature === 'chatbot' ? (
                <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b' }}>

                  {/* Chat logs scroll container */}
                  <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {chatHistory.length === 0 && (
                      <div style={{ textAlign: 'center', color: '#64748b', marginTop: '40px' }}>
                        <MessageSquare size={32} style={{ margin: '0 auto 12px auto', display: 'block' }} />
                        <p style={{ fontWeight: 600, margin: 0 }}>Ask anything about this document!</p>
                        <p style={{ fontSize: '0.85rem' }}>Example: "What is the key algorithm explained on page 3?"</p>
                      </div>
                    )}

                    {chatHistory.map((msg, index) => (
                      <div key={index} style={{
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '75%',
                        background: msg.role === 'user' ? '#3b82f6' : '#1e293b',
                        color: '#f8fafc',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        border: msg.role === 'user' ? 'none' : '1px solid #334155',
                      }}>
                        <div className="markdown-content" style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                        </div>
                      </div>
                    ))}

                    {chatLoading && (
                      <div style={{ alignSelf: 'flex-start', background: '#1e293b', borderRadius: '12px', padding: '12px 16px', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
                        <Loader2 size={16} className={styles.spin} />
                        <span style={{ fontSize: '0.9rem' }}>Thinking...</span>
                      </div>
                    )}
                  </div>

                  {/* Input form panel field */}
                  <form onSubmit={handleAskChatbot} style={{ padding: '16px', borderTop: '1px solid #1e293b', display: 'flex', gap: '10px', background: '#111827', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                    <input
                      type="text"
                      placeholder="Ask a question about the presentation slides..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      disabled={chatLoading}
                      style={{ flex: 1, background: '#1f2937', border: '1px solid #374151', borderRadius: '8px', padding: '12px 16px', color: '#f3f4f6', outline: 'none', fontSize: '0.95rem' }}
                    />
                    <button type="submit" disabled={chatLoading || !query.trim()} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', width: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'opacity 0.2s' }}>
                      <Send size={18} />
                    </button>
                  </form>
                </div>
              ) : generating[activeFeature] && !results[activeFeature] ? (
                <div className={styles.generating}>
                  <div className={styles.genAnim}>
                    <div className={styles.pulse} style={{ background: activeFeat?.color }} />
                  </div>
                  <p>AI is processing your document...</p>
                  <p className={styles.genSub}>This may take 15–30 seconds</p>
                </div>
              ) : activeResult ? (
                <div className={`${styles.result} fade-in`}>
                  {activeFeature === 'mcq' ? (
                    <InteractiveQuiz rawJsonData={activeResult.result} />
                  ) : (
                    <div className="markdown-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {activeResult.result}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.noResult}>
                  <p>Click <strong>Generate</strong> to create {activeFeat?.label} for this PDF.</p>
                  <button className="btn btn-primary" onClick={() => generate(activeFeature)} disabled={generating[activeFeature]} style={{ marginTop: 16 }}>
                    {generating[activeFeature] ? <Loader2 size={16} className={styles.spin} /> : <><Sparkles size={16} /> Generate</>}
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* --- Interactive Quiz Component --- */
function InteractiveQuiz({ rawJsonData }) {
  const [questions, setQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [parseError, setParseError] = useState(false);

  useEffect(() => {
    try {
      let cleanData = rawJsonData.trim();
      if (cleanData.startsWith('```json')) {
        cleanData = cleanData.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleanData.startsWith('```')) {
        cleanData = cleanData.replace(/^```/, '').replace(/```$/, '').trim();
      }

      const parsed = JSON.parse(cleanData);
      setQuestions(Array.isArray(parsed) ? parsed : []);
      setParseError(false);
    } catch (e) {
      console.error("Failed parsing MCQ output data:", e);
      setParseError(true);
    }
    setSelectedAnswers({});
    setSubmitted(false);
    setScore(0);
  }, [rawJsonData]);

  const handleSelect = (qId, optionIdx) => {
    if (submitted) return;
    const optionLetter = String.fromCharCode(65 + optionIdx);
    setSelectedAnswers(prev => ({ ...prev, [qId]: optionLetter }));
  };

  const handleSubmit = () => {
    if (Object.keys(selectedAnswers).length < questions.length) {
      if (!window.confirm("You have skipped some questions. Do you want to submit anyway?")) {
        return;
      }
    }

    let currentScore = 0;
    questions.forEach(q => {
      if (selectedAnswers[q.id] === q.correctAnswer) {
        currentScore++;
      }
    });

    setScore(currentScore);
    setSubmitted(true);
    toast.success(`Quiz Completed! You scored ${currentScore}/${questions.length}`);
  };

  if (parseError) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#f87171' }}>
        <p>⚠️ Failed to structuralize quiz format automatically. Try hitting <strong>Regenerate</strong> above.</p>
      </div>
    );
  }

  return (
    <div style={{ color: '#f1f5f9', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
      {questions.map((q, qIdx) => {
        const letters = ['A', 'B', 'C', 'D'];
        const userAnswer = selectedAnswers[q.id];

        return (
          <div key={q.id || qIdx} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '20px' }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', color: '#ffffff' }}>
              Q{qIdx + 1}. {q.question}
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {q.options.map((option, oIdx) => {
                const currentLetter = letters[oIdx];
                const isSelected = userAnswer === currentLetter;
                const isCorrectAnswer = q.correctAnswer === currentLetter;

                let bg = '#111827';
                let border = '1px solid #475569';
                let cursor = 'pointer';

                if (!submitted) {
                  if (isSelected) {
                    bg = '#1e1b4b';
                    border = '2px solid #6366f1';
                  }
                } else {
                  cursor = 'default';
                  if (isCorrectAnswer) {
                    bg = '#064e3b';
                    border = '2px solid #10b981';
                  } else if (isSelected && !isCorrectAnswer) {
                    bg = '#7f1d1d';
                    border = '2px solid #ef4444';
                  } else {
                    bg = '#111827';
                    border = '1px solid #1f2937';
                  }
                }

                return (
                  <button
                    key={oIdx}
                    disabled={submitted}
                    onClick={() => handleSelect(q.id, oIdx)}
                    style={{
                      background: bg,
                      border: border,
                      borderRadius: '8px',
                      padding: '12px 16px',
                      textAlign: 'left',
                      color: '#e2e8f0',
                      cursor: cursor,
                      fontSize: '0.95rem',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'center',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontWeight: 700, color: isSelected ? '#a5b4fc' : '#94a3b8' }}>
                      {currentLetter})
                    </span>
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>

            {submitted && (
              <div style={{ marginTop: '16px', padding: '12px', background: '#0f172a', borderLeft: '4px solid #3b82f6', borderRadius: '4px', fontSize: '0.9rem' }}>
                <p style={{ margin: 0, color: '#93c5fd' }}>
                  <strong>Correct Answer: {q.correctAnswer}</strong>
                </p>
                <p style={{ margin: '6px 0 0 0', color: '#cbd5e1', lineHeight: '1.4' }}>
                  {q.explanation}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {!submitted ? (
        <button
          onClick={handleSubmit}
          className="btn btn-primary"
          style={{ width: '100%', padding: '14px', fontSize: '1rem', background: '#10b981', borderColor: '#10b981', color: '#fff', fontWeight: 'bold' }}
        >
          Submit Quiz Evaluation
        </button>
      ) : (
        <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #311042 100%)', border: '1px solid #818cf8', borderRadius: '12px', padding: '24px', textAlign: 'center', marginTop: '12px' }}>
          <Award size={40} style={{ color: '#fcd34d', marginBottom: '8px' }} />
          <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 4px 0' }}>Quiz Evaluated!</h3>
          <p style={{ fontSize: '2rem', fontWeight: 900, color: '#34d399', margin: '8px 0' }}>
            {score} / {questions.length}
          </p>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: 0 }}>
            {Math.round((score / questions.length) * 100)}% Conceptual Clarity Rating
          </p>
        </div>
      )}
    </div>
  );
}