import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Clock, ChevronRight, AlertCircle, BookOpen, Zap, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '../components/shared/Navbar';
import api from '../utils/api';
import styles from './UserDashboard.module.css';

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
const formatSize = (b) => b ? `${(b/1024).toFixed(1)} KB` : '—';

const FEATURE_LABELS = {
  summary: { label: 'Summary', color: 'badge-purple' },
  mcq: { label: 'MCQ Quiz', color: 'badge-green' },
  flowchart: { label: 'Flow Diagram', color: 'badge-yellow' },
  short_notes: { label: 'Short Notes', color: 'badge-red' },
};

export default function UserDashboard() {
  const [pdfs, setPdfs] = useState([]);
  const [history, setHistory] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/pdf/my-pdfs'),
      api.get('/pdf/history/all'),
    ]).then(([p, h]) => {
      setPdfs(p.data);
      setHistory(h.data);
    }).catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error('Only PDF files allowed'); return; }
    const fd = new FormData();
    fd.append('pdf', file);
    setUploading(true);
    try {
      const res = await api.post('/pdf/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('PDF uploaded! Opening workspace...');
      setPdfs(p => [res.data, ...p]);
      navigate(`/workspace/${res.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      const syntheticEvent = { target: { files: [file] } };
      handleUpload(syntheticEvent);
    }
  };

  if (loading) return (
    <div className={styles.loadingScreen}>
      <div className={styles.loadingOrb} />
      <p className={styles.loadingText}>Loading your workspace…</p>
    </div>
  );

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.main}>

        {/* ── HERO ── */}
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <div className={styles.heroBadge}>
              <Zap size={11} />
              <span>AI-Powered Notes</span>
            </div>
            <h1 className={styles.heroHeading}>
              Upload your PDF notes,<br />
              <span className={styles.heroAccent}>let AI do the rest</span>
            </h1>
            <p className={styles.heroSub}>
              Get summaries, MCQs, flow diagrams, and concise study notes powered by Claude AI.
            </p>
          </div>

          <div
            className={`${styles.uploadBox} ${dragOver ? styles.uploadBoxDrag : ''} ${uploading ? styles.uploadBoxUploading : ''}`}
            onClick={() => !uploading && fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleUpload} />
            {uploading ? (
              <div className={styles.uploadingState}>
                <div className={styles.uploadSpinner} />
                <p className={styles.uploadingText}>Uploading &amp; extracting text…</p>
                <p className={styles.uploadingSub}>This will just take a moment</p>
              </div>
            ) : (
              <div className={styles.uploadIdleState}>
                <div className={styles.uploadIconWrap}>
                  <Upload size={26} />
                </div>
                <p className={styles.uploadTitle}>Drop PDF here or <span className={styles.uploadLink}>browse</span></p>
                <p className={styles.uploadSub}>Max 10 MB · PDF only</p>
              </div>
            )}
          </div>
        </section>

        {/* ── STATS ── */}
        <section className={styles.stats}>
          {[
            { icon: <FileText size={18} />, label: 'PDFs Uploaded', value: pdfs.length },
            { icon: <Layers size={18} />, label: 'AI Results', value: history.length },
            { icon: <Clock size={18} />, label: 'Last Upload', value: pdfs[0] ? formatDate(pdfs[0].createdAt) : '—' },
          ].map((s, i) => (
            <div key={i} className={styles.statCard}>
              <div className={styles.statIcon}>{s.icon}</div>
              <div className={styles.statBody}>
                <div className={styles.statValue}>{s.value}</div>
                <div className={styles.statLabel}>{s.label}</div>
              </div>
            </div>
          ))}
        </section>

        {/* ── GRID ── */}
        <div className={styles.grid}>

          {/* PDFs */}
          <section className={styles.panel}>
            <h2 className={styles.sectionTitle}>Your PDFs</h2>
            {pdfs.length === 0 ? (
              <div className={styles.empty}>
                <FileText size={36} />
                <p>No PDFs yet. Upload your first one above!</p>
              </div>
            ) : (
              <div className={styles.list}>
                {pdfs.map(pdf => (
                  <div key={pdf.id} className={styles.pdfCard} onClick={() => navigate(`/workspace/${pdf.id}`)}>
                    <div className={styles.pdfIcon}><FileText size={18} /></div>
                    <div className={styles.pdfInfo}>
                      <div className={styles.pdfName}>{pdf.originalName}</div>
                      <div className={styles.pdfMeta}>{formatDate(pdf.createdAt)} · {formatSize(pdf.fileSize)}</div>
                    </div>
                    <ChevronRight size={16} className={styles.pdfArrow} />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* History */}
          <section className={styles.panel}>
            <h2 className={styles.sectionTitle}>Recent AI Results</h2>
            {history.length === 0 ? (
              <div className={styles.empty}>
                <AlertCircle size={36} />
                <p>No AI results yet. Open a PDF workspace and generate content.</p>
              </div>
            ) : (
              <div className={styles.list}>
                {history.slice(0, 10).map(item => {
                  const feat = FEATURE_LABELS[item.feature] || { label: item.feature, color: 'badge-purple' };
                  return (
                    <div key={item.id} className={styles.historyCard} onClick={() => navigate(`/workspace/${item.pdfId}`)}>
                      <div className={styles.historyTop}>
                        <span className={`badge ${feat.color}`}>{feat.label}</span>
                        <span className={styles.historyDate}>{formatDate(item.createdAt)}</span>
                      </div>
                      <div className={styles.historyFile}>
                        <FileText size={12} />
                        <span>{item.originalName}</span>
                      </div>
                      <p className={styles.historyPreview}>{item.result?.substring(0, 120)}…</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  );
}