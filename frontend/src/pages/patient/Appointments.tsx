import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Stethoscope, FileText, Pill, ChevronDown, ChevronUp, X } from 'lucide-react';
import { LoadingSpinner, StatusBadge, UrgencyBadge, PageHeader, EmptyState } from '../../components/UI';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function PatientAppointments() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = () => {
    api.get('/bookings/my')
      .then(res => setAppointments(res.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await api.post(`/bookings/cancel/${id}`, { reason: 'Cancelled by patient' });
      toast.success('Appointment cancelled');
      fetchAppointments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    }
  };

  const filtered = filter === 'all' ? appointments :
    appointments.filter(a => a.status === filter.toUpperCase());

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <PageHeader title="My Appointments" subtitle="View and manage your appointments" />

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'booked', 'completed', 'cancelled'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'bg-dark-800/30 text-dark-400 border border-dark-700/30 hover:text-dark-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Calendar} title="No appointments" description="You don't have any appointments yet." />
      ) : (
        <div className="space-y-4">
          {filtered.map((apt) => (
            <motion.div
              key={apt.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card overflow-hidden"
            >
              {/* Main row */}
              <div
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-dark-800/30 transition-colors"
                onClick={() => setExpandedId(expandedId === apt.id ? null : apt.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-xl">
                    <Stethoscope className="w-5 h-5 text-primary-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{apt.doctorProfile?.user?.name}</p>
                    <p className="text-sm text-dark-400">{apt.doctorProfile?.specialisation}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-dark-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(apt.slotStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(apt.slotStart).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={apt.status} />
                  {apt.preVisitSummary?.urgencyLevel && (
                    <UrgencyBadge level={apt.preVisitSummary.urgencyLevel} />
                  )}
                  {expandedId === apt.id ? (
                    <ChevronUp className="w-5 h-5 text-dark-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-dark-400" />
                  )}
                </div>
              </div>

              {/* Expanded details */}
              {expandedId === apt.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="border-t border-dark-700/50 p-5"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pre-visit summary */}
                    {apt.preVisitSummary && apt.preVisitSummary.status === 'COMPLETED' && (
                      <div className="glass-card p-4 bg-dark-900/50">
                        <h4 className="text-sm font-semibold text-primary-400 mb-3 flex items-center gap-2">
                          <FileText className="w-4 h-4" /> Pre-Visit AI Summary
                        </h4>
                        <p className="text-dark-200 text-sm"><strong>Chief Complaint:</strong> {apt.preVisitSummary.chiefComplaint}</p>
                        {apt.preVisitSummary.suggestedQuestions?.length > 0 && (
                          <div className="mt-2">
                            <p className="text-dark-400 text-xs font-medium">Questions for doctor:</p>
                            {apt.preVisitSummary.suggestedQuestions.map((q: string, i: number) => (
                              <p key={i} className="text-dark-300 text-sm ml-2">• {q}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Post-visit summary */}
                    {apt.postVisitSummary && apt.postVisitSummary.status === 'COMPLETED' && (
                      <div className="glass-card p-4 bg-dark-900/50">
                        <h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                          <FileText className="w-4 h-4" /> Post-Visit Summary
                        </h4>
                        <p className="text-dark-200 text-sm">{apt.postVisitSummary.patientSummary}</p>
                        {apt.postVisitSummary.followUpSteps?.length > 0 && (
                          <div className="mt-2">
                            <p className="text-dark-400 text-xs font-medium">Follow-up Steps:</p>
                            {apt.postVisitSummary.followUpSteps.map((s: string, i: number) => (
                              <p key={i} className="text-dark-300 text-sm ml-2">• {s}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Prescriptions */}
                    {apt.prescriptions?.length > 0 && (
                      <div className="glass-card p-4 bg-dark-900/50 md:col-span-2">
                        <h4 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
                          <Pill className="w-4 h-4" /> Prescriptions
                        </h4>
                        <div className="grid gap-2">
                          {apt.prescriptions.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between bg-dark-800/50 rounded-lg px-3 py-2 text-sm">
                              <span className="text-white font-medium">{p.medication}</span>
                              <span className="text-dark-300">{p.dosage} — {p.frequency} for {p.duration}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {apt.status === 'BOOKED' && new Date(apt.slotStart) > new Date() && (
                    <div className="mt-4 pt-4 border-t border-dark-700/50 flex gap-3">
                      <button onClick={() => handleCancel(apt.id)} className="btn-danger text-sm py-2">
                        <span className="flex items-center gap-2">
                          <X className="w-4 h-4" /> Cancel Appointment
                        </span>
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
