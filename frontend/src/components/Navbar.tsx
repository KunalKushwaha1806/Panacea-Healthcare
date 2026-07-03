import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { 
  Heart, LogOut, Calendar, Stethoscope, ShieldCheck, 
  User, Menu, X 
} from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  const roleLinks = {
    PATIENT: [
      { path: '/patient/dashboard', label: 'Dashboard', icon: Calendar },
      { path: '/patient/book', label: 'Book Appointment', icon: Stethoscope },
      { path: '/patient/appointments', label: 'My Appointments', icon: Calendar },
    ],
    DOCTOR: [
      { path: '/doctor/dashboard', label: 'Dashboard', icon: Stethoscope },
      { path: '/doctor/appointments', label: 'Appointments', icon: Calendar },
    ],
    ADMIN: [
      { path: '/admin/dashboard', label: 'Dashboard', icon: ShieldCheck },
      { path: '/admin/doctors', label: 'Manage Doctors', icon: Stethoscope },
      { path: '/admin/logs', label: 'Notification Logs', icon: Calendar },
    ],
  };

  const links = user ? roleLinks[user.role] || [] : [];

  return (
    <nav className="sticky top-0 z-50 glass-card border-b border-dark-700/50 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <motion.div
            whileHover={{ rotate: 15, scale: 1.1 }}
            className="p-2 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl"
          >
            <Heart className="w-5 h-5 text-white" />
          </motion.div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
            Panacea
          </span>
        </Link>

        {/* Desktop Nav */}
        {isAuthenticated && (
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={isActive(link.path) ? 'nav-link-active' : 'nav-link'}
              >
                <span className="flex items-center gap-2">
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* User section */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-2 text-dark-300">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">{user?.name}</span>
                <span className={`badge ${
                  user?.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                  user?.role === 'DOCTOR' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                  'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                }`}>
                  {user?.role}
                </span>
              </div>
              <button onClick={handleLogout} className="nav-link flex items-center gap-2 text-red-400 hover:text-red-300">
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-secondary text-sm py-2 px-4">Login</Link>
              <Link to="/register" className="btn-primary text-sm py-2 px-4">Register</Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 text-dark-300 hover:text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden mt-4 pb-4 border-t border-dark-700/50 pt-4"
        >
          {isAuthenticated && links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`block py-2 px-4 rounded-lg ${isActive(link.path) ? 'text-primary-400 bg-dark-800/50' : 'text-dark-300'}`}
              onClick={() => setMobileOpen(false)}
            >
              <span className="flex items-center gap-2">
                <link.icon className="w-4 h-4" />
                {link.label}
              </span>
            </Link>
          ))}
          {isAuthenticated ? (
            <button onClick={handleLogout} className="w-full text-left py-2 px-4 text-red-400 mt-2">
              <span className="flex items-center gap-2">
                <LogOut className="w-4 h-4" /> Logout
              </span>
            </button>
          ) : (
            <div className="flex flex-col gap-2 mt-2">
              <Link to="/login" className="btn-secondary text-center text-sm" onClick={() => setMobileOpen(false)}>Login</Link>
              <Link to="/register" className="btn-primary text-center text-sm" onClick={() => setMobileOpen(false)}>Register</Link>
            </div>
          )}
        </motion.div>
      )}
    </nav>
  );
}
