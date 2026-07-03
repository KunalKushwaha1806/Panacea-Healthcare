import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Heart, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      // Redirect based on role
      const user = JSON.parse(localStorage.getItem('panacea_user') || '{}');
      const routes: Record<string, string> = {
        PATIENT: '/patient/dashboard',
        DOCTOR: '/doctor/dashboard',
        ADMIN: '/admin/dashboard',
      };
      navigate(routes[user.role] || '/');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (email: string) => {
    setEmail(email);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-dark-950 to-accent-900/20" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="inline-flex p-4 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl mb-4 shadow-lg shadow-primary-500/25"
          >
            <Heart className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
          <p className="text-dark-400 mt-2">Sign in to Panacea Healthcare</p>
        </div>

        {/* Form */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-11"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-11 pr-11"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-dark-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-400 hover:text-primary-300 font-medium">
                Register
              </Link>
            </p>
          </div>
        </div>

        {/* Demo accounts */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 glass-card p-4"
        >
          <p className="text-xs text-dark-400 mb-3 text-center font-medium">DEMO ACCOUNTS</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => fillDemo('john@example.com')}
              className="text-xs py-2 px-3 bg-primary-500/10 text-primary-400 rounded-lg hover:bg-primary-500/20 transition-colors border border-primary-500/20"
            >
              Patient
            </button>
            <button
              onClick={() => fillDemo('dr.sharma@panacea.health')}
              className="text-xs py-2 px-3 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors border border-blue-500/20"
            >
              Doctor
            </button>
            <button
              onClick={() => fillDemo('admin@panacea.health')}
              className="text-xs py-2 px-3 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-500/20 transition-colors border border-purple-500/20"
            >
              Admin
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
