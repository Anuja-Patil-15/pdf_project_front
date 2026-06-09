import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { BookOpen, Mail, Lock, ArrowRight } from 'lucide-react';
import styles from './AuthPage.module.css';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.bg} />
      <div className={styles.card}>
        <div className={styles.logo}>
          <BookOpen size={28} color="var(--accent-2)" />
          <span>NoteAI</span>
        </div>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.sub}>Sign in to continue learning</p>
        <form onSubmit={handle} className={styles.form}>
          <div>
            <label>Email</label>
            <div className={styles.inputWrap}>
              <Mail size={16} className={styles.icon} />
              <input className={`input-field ${styles.withIcon}`}
                type="email" placeholder="you@example.com"
                value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label>Password</label>
            <div className={styles.inputWrap}>
              <Lock size={16} className={styles.icon} />
              <input className={`input-field ${styles.withIcon}`}
                type="password" placeholder="••••••••"
                value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
            </div>
          </div>
          <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:'13px' }} disabled={loading}>
            {loading ? <div className="spinner" /> : <><span>Sign In</span><ArrowRight size={16} /></>}
          </button>
        </form>
        <p className={styles.switch}>
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
        
      </div>
    </div>
  );
}
