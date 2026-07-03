import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, AlertTriangle, FileText, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { LoadingSpinner, StatusBadge, UrgencyBadge, PageHeader, EmptyState, Card } from '../../components/UI';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [prescriptions, setPrescriptions] = useState([{ medication: '', dosage: '', frequency: '', duration: '' }]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAppointments();
  }, [selectedDate]);

  const fetchAppointments = () => {
    setLoading(true);
    api.get(`/doctor/appointments?date=${selectedDate}`)
      .then(res => setAppointments(res.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const addPrescription = () => {
    setPrescriptions([...prescriptions, { medication: '', dosage: '', frequency: '', duration: '' }]);
  };

  const removePrescription = (idx: number) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== idx));
  };

  const updatePrescription = (idx: number, field: string, value: string) => {
    const updated = [...prescriptions];
    (updated[idx] as any)[field] = value;
    setPrescriptions(updated);
  };

  const handleSubmitNotes = async (appointmentId: string) => {
    if (!notes.trim()) {
      toast.error('Clinical notes are required');
      return;
    }
    setSubmitting(true);
    try {
      const validPrescriptions = prescriptions.filter(p => p.medication && p.dosage && p.frequency && p.duration);
      await api.post(`/doctor/appointments/${appointmentId}/notes`, {
        clinicalNotes: notes,
        diagnosis: diagnosis || undefined,
        prescriptions: validPrescriptions,
      });
      toast.success('Post-visit notes submitted. AI summary is being generated.');
      setNotes('');
      setDiagnosis('');
      setPrescriptions([{ medication: '', dosage: '', frequency: '', duration: '' }]);
      fetchAppointments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit notes');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveSummary = async (appointmentId: string, approved: boolean) => {
    try {
      await api.post(`/doctor/appointments/${appointmentId}/approve-summary`, { approved });
      toast.success(approved ? 'Summary approved and sent to patient' : 'Summary rejected');
      fetchAppointments();
    } catch (err: any) {
      toast.error('Failed to update summary');
    }
  };

  const todayStats = {
    total: appointments.length,
    highUrgency: appointments.filter(a => a.preVisitSummary?.urgencyLevel === 'High').length,
    completed: appointments.filter(a => a.status === 'COMPLETED').length,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <PageHeader
        title="Doctor Dashboard"
        subtitle="Manage your appointments and patient notes"
      />

      {/* Date picker + stats */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-primary-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="input-field w-auto"
          />
        </div>

        <div className="flex gap-3 ml-auto">
          <div className="glass-card px-4 py-2 flex items-center gap-2">
            <span className="text-dark-400 text-sm">Total:</span>
            <span className="text-white font-bold">{todayStats.total}</span>
          </div>
          {todayStats.highUrgency > 0 && (
            <div className="glass-card px-4 py-2 flex items-center gap-2 border-red-500/30">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-red-400 font-bold">{todayStats.highUrgency} High Urgency</span>
            </div>
          )}
          <div className="glass-card px-4 py-2 flex items-center gap-2">
            <span className="text-dark-400 text-sm">Completed:</span>
            <span className="text-emerald-400 font-bold">{todayStats.completed}</span>
          </div>
        </div>
      </div>

      {loading ? <LoadingSpinner /> : appointments.length === 0 ? (
        <EmptyState icon={Calendar} title="No appointments" description="No appointments scheduled for this date" />
      ) : (
        <div className="space-y-4">
          {appointments.map((apt) => (
            <motion.div
              key={apt.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card overflow-hidden"
            >
              {/* Header row */}
              <div
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-dark-800/30 transition-colors"
                onClick={() => setExpandedId(expandedId === apt.id ? null : apt.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${
                    apt.preVisitSummary?.urgencyLevel === 'High'
                      ? 'bg-red-500/20 animate-pulse-soft'
                      : 'bg-primary-500/10'
                  }`}>
                    <User className="w-5 h-5 text-primary-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{apt.patient?.name}</p>
                    <div className="flex items-center gap-3 text-sm text-dark-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(apt.slotStart).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {apt.patient?.phone && <span>📞 {apt.patient.phone}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {apt.preVisitSummary?.urgencyLevel && (
                    <UrgencyBadge level={apt.preVisitSummary.urgencyLevel} />
                  )}
                  <StatusBadge status={apt.status} />
                  {expandedId === apt.id ? <ChevronUp className="w-5 h-5 text-dark-400" /> : <ChevronDown className="w-5 h-5 text-dark-400" />}
                </div>
              </div>

              {/* Expanded content */}
              {expandedId === apt.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="border-t border-dark-700/50 p-5"
                >
                  {/* Pre-visit summary */}
                  {apt.preVisitSummary && apt.preVisitSummary.status === 'COMPLETED' && (
                    <div className="glass-card p-4 bg-dark-900/50 mb-4">
                      <h4 className="text-sm font-semibold text-primary-400 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> AI Pre-Visit Summary
                      </h4>
                      <p><strong>Chief Complaint:</strong> {apt.preVisitSummary.chiefComplaint}</p>
                      <p className="text-sm text-dark-300 mt-1">
                        <strong>Patient Symptoms:</strong> {apt.symptomForm?.symptoms}
                      </p>
                    </div>
                  )}

                  {apt.symptomForm && !apt.preVisitSummary && (
                    <div className="glass-card p-4 bg-dark-900/50 mb-4">
                      <h4 className="text-sm font-semibold text-amber-400 mb-2">Patient Symptoms</h4>
                      <p className="text-dark-200 text-sm">{apt.symptomForm.symptoms}</p>
                      {apt.symptomForm.severity && <p className="text-dark-400 text-xs mt-1">Severity: {apt.symptomForm.severity}</p>}
                    </div>
                  )}

                  {/* Post-visit notes form (only for BOOKED status) */}
                  {apt.status === 'BOOKED' && !apt.postVisitNotes && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-white">Submit Post-Visit Notes</h4>

                      <div>
                        <label className="block text-sm text-dark-300 mb-1">Clinical Notes *</label>
                        <textarea
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          className="input-field min-h-[100px]"
                          placeholder="Enter clinical notes..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm text-dark-300 mb-1">Diagnosis</label>
                        <input type="text" value={diagnosis} onChange={e => setDiagnosis(e.target.value)} className="input-field" placeholder="Primary diagnosis" />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm text-dark-300">Prescriptions</label>
                          <button onClick={addPrescription} className="text-xs text-primary-400 hover:text-primary-300">+ Add medication</button>
                        </div>
                        {prescriptions.map((p, i) => (
                          <div key={i} className="grid grid-cols-4 gap-2 mb-2">
                            <input
                              value={p.medication} onChange={e => updatePrescription(i, 'medication', e.target.value)}
                              className="input-field text-sm" placeholder="Medication"
                            />
                            <input
                              value={p.dosage} onChange={e => updatePrescription(i, 'dosage', e.target.value)}
                              className="input-field text-sm" placeholder="Dosage"
                            />
                            <input
                              value={p.frequency} onChange={e => updatePrescription(i, 'frequency', e.target.value)}
                              className="input-field text-sm" placeholder="Frequency"
                            />
                            <div className="flex gap-1">
                              <input
                                value={p.duration} onChange={e => updatePrescription(i, 'duration', e.target.value)}
                                className="input-field text-sm flex-1" placeholder="Duration"
                              />
                              {prescriptions.length > 1 && (
                                <button onClick={() => removePrescription(i)} className="text-red-400 hover:text-red-300 px-2">×</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => handleSubmitNotes(apt.id)}
                        disabled={submitting}
                        className="btn-primary flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        {submitting ? 'Submitting...' : 'Submit Notes & Generate AI Summary'}
                      </button>
                    </div>
                  )}

                  {/* Post-visit summary review */}
                  {apt.postVisitSummary && apt.postVisitSummary.status === 'COMPLETED' && (
                    <div className="glass-card p-4 bg-dark-900/50 mt-4">
                      <h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> AI Post-Visit Summary (Patient View)
                      </h4>
                      <p className="text-dark-200 text-sm mb-3">{apt.postVisitSummary.patientSummary}</p>

                      {!apt.postVisitSummary.approvedByDoctor && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-dark-700/50">
                          <button onClick={() => handleApproveSummary(apt.id, true)} className="btn-primary text-sm py-2">
                            ✅ Approve & Send to Patient
                          </button>
                          <button onClick={() => handleApproveSummary(apt.id, false)} className="btn-secondary text-sm py-2">
                            ❌ Reject
                          </button>
                        </div>
                      )}
                      {apt.postVisitSummary.approvedByDoctor && (
                        <p className="text-emerald-400 text-xs mt-2">✅ Approved and sent to patient</p>
                      )}
                    </div>
                  )}

                  {apt.postVisitSummary?.status === 'PENDING' && (
                    <div className="glass-card p-4 bg-dark-900/50 mt-4">
                      <p className="text-amber-400 text-sm">⏳ AI summary is being generated...</p>
                    </div>
                  )}

                  {apt.postVisitSummary?.status === 'FAILED' && (
                    <div className="glass-card p-4 bg-dark-900/50 mt-4 border border-red-500/20">
                      <p className="text-red-400 text-sm">⚠️ AI summary generation failed. Please review manually.</p>
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
