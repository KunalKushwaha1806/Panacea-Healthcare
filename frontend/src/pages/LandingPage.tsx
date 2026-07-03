import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Calendar, Brain, Bell, Shield, ArrowRight, Stethoscope, Clock, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();

  const dashboardUrl = user?.role === 'DOCTOR' ? '/doctor/dashboard'
    : user?.role === 'ADMIN' ? '/admin/dashboard'
    : '/patient/dashboard';

  const features = [
    {
      icon: Calendar,
      title: 'Smart Booking',
      description: 'Find doctors by specialisation, view real-time slot availability, and book with concurrency-safe slot holding.',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Brain,
      title: 'AI-Powered Summaries',
      description: 'Pre-visit symptom analysis with urgency scoring and post-visit patient-friendly summary generation.',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      icon: Bell,
      title: 'Smart Notifications',
      description: 'Email confirmations, appointment reminders (24h & 1h), medication schedules, and Google Calendar sync.',
      gradient: 'from-amber-500 to-orange-500',
    },
    {
      icon: Shield,
      title: 'Multi-Role Access',
      description: 'Dedicated portals for patients, doctors, and admins with role-based access control.',
      gradient: 'from-emerald-500 to-teal-500',
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-accent-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4">
        {/* Hero */}
        <div className="pt-20 pb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
              className="inline-flex p-5 bg-gradient-to-br from-primary-500 to-accent-500 rounded-3xl mb-8 shadow-2xl shadow-primary-500/25"
            >
              <Heart className="w-14 h-14 text-white" />
            </motion.div>

            <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight">
              Healthcare,{' '}
              <span className="bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400 bg-clip-text text-transparent bg-[length:200%] animate-[gradient_3s_ease-in-out_infinite]">
                Reimagined
              </span>
            </h1>
            <p className="text-xl text-dark-300 max-w-2xl mx-auto mb-10 leading-relaxed">
              Panacea is a smart healthcare platform with AI-powered appointment management,
              intelligent visit summaries, and automated follow-up care.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isAuthenticated ? (
                <Link to={dashboardUrl} className="btn-primary text-lg px-8 py-4 flex items-center gap-3">
                  Go to Dashboard <ArrowRight className="w-5 h-5" />
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn-primary text-lg px-8 py-4 flex items-center gap-3">
                    Get Started <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link to="/login" className="btn-secondary text-lg px-8 py-4">
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-20">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.15 }}
              className="glass-card-hover p-6 group"
            >
              <div className={`p-3 bg-gradient-to-br ${feature.gradient} rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-dark-400 text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>

        {/* How it works */}
        <div className="py-20 border-t border-dark-800/50">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-dark-400 max-w-xl mx-auto">Three simple steps to better healthcare management</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: Stethoscope, title: 'Find & Book', desc: 'Search doctors by specialisation, pick a slot, and book instantly with smart conflict prevention.' },
              { step: '02', icon: Zap, title: 'AI Analysis', desc: 'Submit symptoms before your visit. Our AI analyses urgency and prepares your doctor with key insights.' },
              { step: '03', icon: Clock, title: 'Follow Up', desc: 'Get patient-friendly visit summaries, medication reminders, and automated follow-up scheduling.' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="text-center"
              >
                <div className="text-6xl font-extrabold bg-gradient-to-b from-dark-600 to-dark-800 bg-clip-text text-transparent mb-4">
                  {item.step}
                </div>
                <div className="inline-flex p-3 bg-primary-500/10 rounded-xl mb-4">
                  <item.icon className="w-6 h-6 text-primary-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-dark-400 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="py-8 border-t border-dark-800/50 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="w-4 h-4 text-primary-500" />
            <span className="text-dark-400 text-sm">Panacea Healthcare</span>
          </div>
          <p className="text-dark-500 text-xs">Built with care. Powered by AI.</p>
        </footer>
      </div>
    </div>
  );
}
