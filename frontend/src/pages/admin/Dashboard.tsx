import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck, Stethoscope, Users, Bell, Plus, Edit, Trash2,
  Calendar, Clock, X, Save, AlertTriangle
} from 'lucide-react';
import { LoadingSpinner, PageHeader, Card, EmptyState } from '../../components/UI';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'doctors' | 'logs'>('doctors');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState<string | null>(null);
  const [leaveDates, setLeaveDates] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Create doctor form
  const [form, setForm] = useState({
    email: '', password: 'password123', name: '', specialisation: '',
    slotDuration: 30, bio: '',
    workingHours: {
      mon: { start: '09:00', end: '17:00' },
      tue: { start: '09:00', end: '17:00' },
      wed: { start: '09:00', end: '17:00' },
      thu: { start: '09:00', end: '17:00' },
      fri: { start: '09:00', end: '17:00' },
    } as any,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [docsRes] = await Promise.all([
        api.get('/admin/doctors'),
      ]);
      setDoctors(docsRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/doctors', form);
      toast.success('Doctor created successfully');
      setShowCreateForm(false);
      setForm({ ...form, email: '', name: '', specialisation: '', bio: '' });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create doctor');
    }
  };

  const handleDeleteDoctor = async (id: string) => {
    if (!confirm('Are you sure you want to delete this doctor?')) return;
    try {
      await api.delete(`/admin/doctors/${id}`);
      toast.success('Doctor deleted');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleMarkLeave = async (doctorId: string) => {
    if (!leaveDates.trim()) {
      toast.error('Enter at least one date');
      return;
    }
    try {
      const dates = leaveDates.split(',').map(d => new Date(d.trim()).toISOString());
      const res = await api.post(`/admin/doctors/${doctorId}/leave`, { dates });
      const data = res.data.data;
      if (data.cancelledAppointments?.length > 0) {
        toast.success(`Leave marked. ${data.cancelledAppointments.length} appointment(s) cancelled!`, { duration: 5000 });
      } else {
        toast.success('Leave marked successfully');
      }
      setShowLeaveModal(null);
      setLeaveDates('');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to mark leave');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <PageHeader
        title="Admin Dashboard"
        subtitle="Manage doctors, schedules, and system logs"
        actions={
          <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Doctor
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Doctors', value: doctors.length, icon: Stethoscope, color: 'from-blue-500 to-cyan-500' },
          { label: 'Active Today', value: doctors.length, icon: Users, color: 'from-emerald-500 to-teal-500' },
          { label: 'Notifications', value: logs.length, icon: Bell, color: 'from-purple-500 to-pink-500' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 flex items-center justify-between"
          >
            <div>
              <p className="text-dark-400 text-sm">{stat.label}</p>
              <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
            </div>
            <div className={`p-3 bg-gradient-to-br ${stat.color} rounded-xl`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create doctor form */}
      {showCreateForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="glass-card p-6 mb-8"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Create New Doctor</h3>
          <form onSubmit={handleCreateDoctor} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-300 mb-1">Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Dr. Full Name" required />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="doctor@panacea.health" required />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">Specialisation</label>
              <input value={form.specialisation} onChange={e => setForm({ ...form, specialisation: e.target.value })} className="input-field" placeholder="e.g., Cardiology" required />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">Slot Duration (minutes)</label>
              <input type="number" value={form.slotDuration} onChange={e => setForm({ ...form, slotDuration: parseInt(e.target.value) })} className="input-field" min="10" max="120" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-dark-300 mb-1">Bio</label>
              <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} className="input-field" placeholder="Brief professional bio..." />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="btn-primary">Create Doctor</button>
              <button type="button" onClick={() => setShowCreateForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Doctors table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-dark-700/50 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Doctors</h3>
        </div>

        {doctors.length === 0 ? (
          <EmptyState icon={Stethoscope} title="No doctors" description="Create your first doctor profile" />
        ) : (
          <div className="divide-y divide-dark-700/50">
            {doctors.map((doc) => (
              <div key={doc.id} className="p-4 hover:bg-dark-800/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
                      <Stethoscope className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{doc.name}</p>
                      <p className="text-sm text-primary-400">{doc.doctorProfile?.specialisation}</p>
                      <div className="flex items-center gap-3 text-xs text-dark-400 mt-1">
                        <span><Clock className="w-3 h-3 inline mr-1" />{doc.doctorProfile?.slotDuration} min slots</span>
                        <span>{doc.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowLeaveModal(doc.doctorProfile?.id)}
                      className="px-3 py-1.5 text-xs bg-amber-500/10 text-amber-400 rounded-lg hover:bg-amber-500/20 border border-amber-500/20"
                    >
                      <Calendar className="w-3 h-3 inline mr-1" /> Mark Leave
                    </button>
                    <button
                      onClick={() => handleDeleteDoctor(doc.doctorProfile?.id)}
                      className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 border border-red-500/20"
                    >
                      <Trash2 className="w-3 h-3 inline mr-1" /> Delete
                    </button>
                  </div>
                </div>

                {/* Leave days display */}
                {doc.doctorProfile?.leaveDays?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="text-xs text-dark-400">Leave days:</span>
                    {doc.doctorProfile.leaveDays.slice(0, 5).map((d: string, i: number) => (
                      <span key={i} className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded">
                        {new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    ))}
                    {doc.doctorProfile.leaveDays.length > 5 && (
                      <span className="text-xs text-dark-400">+{doc.doctorProfile.leaveDays.length - 5} more</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leave modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Mark Leave Days
              </h3>
              <button onClick={() => setShowLeaveModal(null)} className="text-dark-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-dark-400 text-sm mb-4">
              ⚠️ Existing booked appointments on leave dates will be automatically cancelled and patients will be notified.
            </p>

            <div className="mb-4">
              <label className="block text-sm text-dark-300 mb-1">Leave Dates (comma-separated)</label>
              <input
                type="text"
                value={leaveDates}
                onChange={e => setLeaveDates(e.target.value)}
                className="input-field"
                placeholder="2026-07-10, 2026-07-11"
              />
              <p className="text-xs text-dark-500 mt-1">Format: YYYY-MM-DD</p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => handleMarkLeave(showLeaveModal)} className="btn-danger flex-1">
                Mark Leave
              </button>
              <button onClick={() => setShowLeaveModal(null)} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
