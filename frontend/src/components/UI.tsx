import { motion } from 'framer-motion';

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className="flex items-center justify-center py-12">
      <motion.div
        className={`${sizeMap[size]} border-2 border-dark-600 border-t-primary-500 rounded-full`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const badgeClass = {
    BOOKED: 'badge-booked',
    COMPLETED: 'badge-completed',
    CANCELLED: 'badge-cancelled',
    HELD: 'badge-held',
    RESCHEDULED: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  }[status] || 'badge';

  return <span className={`badge ${badgeClass}`}>{status}</span>;
}

export function UrgencyBadge({ level }: { level: string }) {
  const cls = {
    Low: 'badge-low',
    Medium: 'badge-medium',
    High: 'badge-high',
  }[level] || 'badge';

  return <span className={cls}>{level} Urgency</span>;
}

export function EmptyState({ icon: Icon, title, description, action }: {
  icon: any;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="p-4 bg-dark-800/50 rounded-2xl mb-4">
        <Icon className="w-12 h-12 text-dark-400" />
      </div>
      <h3 className="text-lg font-semibold text-dark-200 mb-2">{title}</h3>
      <p className="text-dark-400 max-w-md mb-4">{description}</p>
      {action}
    </motion.div>
  );
}

export function PageHeader({ title, subtitle, actions }: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
    >
      <div>
        <h1 className="section-title text-3xl">{title}</h1>
        {subtitle && <p className="text-dark-400 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </motion.div>
  );
}

export function Card({ children, className = '', hover = false }: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${hover ? 'glass-card-hover' : 'glass-card'} p-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}
