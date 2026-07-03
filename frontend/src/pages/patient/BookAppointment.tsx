import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Stethoscope, Clock, Calendar, ArrowRight, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { LoadingSpinner, PageHeader, UrgencyBadge } from '../../components/UI';
import api from '../../services/api';
import toast from 'react-hot-toast';

type Step = 'search' | 'slots' | 'symptoms' | 'summary' | 'confirmed';

export default function BookAppointment() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('search');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [specFilter, setSpecFilter] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [heldAppointment, setHeldAppointment] = useState<any>(null);
  const [holdTimer, setHoldTimer] = useState(300);
  const [symptoms, setSymptoms] = useState('');
  const [severity, setSeverity] = useState('');
  const [duration, setDuration] = useState('');
  const [preVisitSummary, setPreVisitSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Fetch doctors
  useEffect(() => {
    api.get('/doctors')
      .then(res => {
        const docs = res?.data?.data || [];
        setDoctors(docs);
        setFilteredDoctors(docs);
      })
      .catch(() => {
        setDoctors([]);
      });
  }, []);

  // Search filter
  useEffect(() => {
    let filtered = doctors;
    if (searchTerm) {
      filtered = filtered.filter(d =>
        d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.doctorProfile?.specialisation?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (specFilter) {
      filtered = filtered.filter(d =>
        d.doctorProfile?.specialisation === specFilter
      );
    }
    setFilteredDoctors(filtered);
  }, [searchTerm, specFilter, doctors]);

  // Hold countdown timer
  useEffect(() => {
    if (!heldAppointment) return;
    const interval = setInterval(() => {
      setHoldTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          toast.error('Booking hold expired. Please select a new slot.');
          setStep('slots');
          setHeldAppointment(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [heldAppointment]);

  // Get unique specialisations
  const specialisations = [...new Set(doctors.map(d => d.doctorProfile?.specialisation).filter(Boolean))];

  // Set tomorrow as default date
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const fetchSlots = async (doctorId: string, date: string) => {
    setSlotsLoading(true);
    try {
      const res = await api.get(`/bookings/slots?doctorId=${doctorId}&date=${date}`);
      setSlots(res.data.data || []);
    } catch (err: any) {
      toast.error('Failed to fetch slots');
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleDoctorSelect = (doctor: any) => {
    setSelectedDoctor(doctor);
    setStep('slots');
    if (selectedDate && doctor.doctorProfile?.id) {
      fetchSlots(doctor.doctorProfile.id, selectedDate);
    }
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    if (selectedDoctor?.doctorProfile?.id) {
      fetchSlots(selectedDoctor.doctorProfile.id, date);
    }
  };

  const handleSlotSelect = async (slot: any) => {
    if (!slot.available) return;
    setSelectedSlot(slot);
    setLoading(true);
    try {
      const res = await api.post('/bookings/hold', {
        doctorProfileId: selectedDoctor.doctorProfile.id,
        slotStart: slot.start,
      });
      setHeldAppointment(res.data.data.appointment);
      setHoldTimer(300);
      setStep('symptoms');
      toast.success('Slot held for 5 minutes');
    } catch (err: any) {
      if (err.response?.status === 409) {
        toast.error('This slot was just taken. Please choose another.');
        if (selectedDoctor?.doctorProfile?.id && selectedDate) {
          fetchSlots(selectedDoctor.doctorProfile.id, selectedDate);
        }
      } else {
        toast.error(err.response?.data?.message || 'Failed to hold slot');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitSymptoms = async () => {
    if (!heldAppointment) return;
    setLoading(true);
    try {
      // Submit symptom form
      if (symptoms.trim()) {
        await api.post(`/bookings/${heldAppointment.id}/symptoms`, {
          symptoms,
          duration: duration || undefined,
          severity: severity || undefined,
        });
      }

      // Confirm the booking
      const res = await api.post(`/bookings/confirm/${heldAppointment.id}`);
      setHeldAppointment(res.data.data);

      // Try to fetch pre-visit summary (may still be generating)
      setTimeout(async () => {
        try {
          // The summary should be on the appointment
          const aptRes = await api.get('/bookings/my');
          const apt = aptRes.data.data?.find((a: any) => a.id === heldAppointment.id);
          if (apt?.preVisitSummary?.status === 'COMPLETED') {
            setPreVisitSummary(apt.preVisitSummary);
          }
        } catch {}
      }, 3000);

      setStep('confirmed');
      toast.success('Appointment booked successfully! 🎉');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to confirm booking');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const formatTimer = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-8">
        {(['search', 'slots', 'symptoms', 'confirmed'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`h-1 flex-1 rounded-full transition-colors ${
              (['search', 'slots', 'symptoms', 'summary', 'confirmed'].indexOf(step) >= i)
                ? 'bg-gradient-to-r from-primary-500 to-accent-500'
                : 'bg-dark-700'
            }`} />
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: Search doctors */}
        {step === 'search' && (
          <motion.div key="search" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <PageHeader title="Find a Doctor" subtitle="Search by name or specialisation" />

            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="input-field pl-11"
                  placeholder="Search doctors..."
                />
              </div>
              <select
                value={specFilter}
                onChange={e => setSpecFilter(e.target.value)}
                className="input-field md:w-64"
              >
                <option value="">All Specialisations</option>
                {specialisations.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDoctors.map((doc) => (
                <motion.div
                  key={doc.id}
                  whileHover={{ scale: 1.02 }}
                  className="glass-card-hover p-6 cursor-pointer"
                  onClick={() => handleDoctorSelect(doc)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center mb-3">
                        <Stethoscope className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">{doc.name}</h3>
                      <p className="text-primary-400 text-sm font-medium">{doc.doctorProfile?.specialisation}</p>
                      {doc.doctorProfile?.bio && (
                        <p className="text-dark-400 text-sm mt-2 line-clamp-2">{doc.doctorProfile.bio}</p>
                      )}
                      <div className="flex items-center gap-2 mt-3 text-xs text-dark-400">
                        <Clock className="w-3 h-3" />
                        {doc.doctorProfile?.slotDuration} min slots
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-dark-400" />
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredDoctors.length === 0 && !loading && (
              <div className="text-center py-12 text-dark-400">
                No doctors found. Try adjusting your search.
              </div>
            )}
          </motion.div>
        )}

        {/* STEP 2: Select slot */}
        {step === 'slots' && (
          <motion.div key="slots" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <button onClick={() => setStep('search')} className="flex items-center gap-2 text-dark-400 hover:text-white mb-4">
              <ArrowLeft className="w-4 h-4" /> Back to doctors
            </button>

            <PageHeader
              title={`Book with ${selectedDoctor?.name}`}
              subtitle={selectedDoctor?.doctorProfile?.specialisation}
            />

            <div className="mb-6">
              <label className="block text-sm font-medium text-dark-300 mb-2">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => handleDateChange(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="input-field max-w-xs"
              />
            </div>

            {slotsLoading ? (
              <LoadingSpinner />
            ) : slots.length === 0 ? (
              <div className="glass-card p-8 text-center text-dark-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No available slots for this date. Doctor may be on leave or not working.</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-dark-400 mb-4">
                  {slots.filter(s => s.available).length} of {slots.length} slots available
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {slots.map((slot, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03 }}
                      disabled={!slot.available || loading}
                      onClick={() => handleSlotSelect(slot)}
                      className={`p-3 rounded-xl text-sm font-medium transition-all ${
                        slot.available
                          ? 'bg-primary-500/10 text-primary-400 border border-primary-500/30 hover:bg-primary-500/20 hover:scale-105 cursor-pointer'
                          : 'bg-dark-800/30 text-dark-500 border border-dark-700/30 cursor-not-allowed line-through'
                      }`}
                    >
                      {formatTime(slot.start)}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* STEP 3: Symptom form */}
        {step === 'symptoms' && (
          <motion.div key="symptoms" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <PageHeader
              title="Describe Your Symptoms"
              subtitle="This helps the doctor prepare for your visit"
            />

            {/* Hold timer */}
            <div className="glass-card p-4 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2 text-dark-300">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Slot held for you</span>
              </div>
              <span className={`font-mono text-lg font-bold ${
                holdTimer < 60 ? 'text-red-400 animate-pulse' : 'text-primary-400'
              }`}>
                {formatTimer(holdTimer)}
              </span>
            </div>

            <div className="glass-card p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  What symptoms are you experiencing? *
                </label>
                <textarea
                  value={symptoms}
                  onChange={e => setSymptoms(e.target.value)}
                  className="input-field min-h-[120px] resize-y"
                  placeholder="Describe your symptoms in detail..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Duration</label>
                  <input
                    type="text"
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    className="input-field"
                    placeholder="e.g., 3 days"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Severity</label>
                  <select value={severity} onChange={e => setSeverity(e.target.value)} className="input-field">
                    <option value="">Select severity</option>
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSubmitSymptoms}
                  disabled={loading || !symptoms.trim()}
                  className="btn-primary flex-1"
                >
                  {loading ? 'Confirming...' : 'Confirm Appointment'}
                </button>
                <button
                  onClick={handleSubmitSymptoms}
                  disabled={loading}
                  className="btn-secondary"
                >
                  Skip & Confirm
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 4: Confirmed */}
        {step === 'confirmed' && (
          <motion.div key="confirmed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="max-w-lg mx-auto text-center py-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className="inline-flex p-6 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-3xl mb-6 shadow-lg shadow-emerald-500/25"
              >
                <CheckCircle className="w-16 h-16 text-white" />
              </motion.div>

              <h1 className="text-3xl font-bold text-white mb-2">Appointment Confirmed!</h1>
              <p className="text-dark-400 mb-8">You'll receive a confirmation email shortly.</p>

              <div className="glass-card p-6 text-left mb-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-dark-400">Doctor</span>
                    <span className="text-white font-medium">{selectedDoctor?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400">Specialisation</span>
                    <span className="text-white">{selectedDoctor?.doctorProfile?.specialisation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400">Date</span>
                    <span className="text-white">{selectedDate && new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400">Time</span>
                    <span className="text-white">{selectedSlot && formatTime(selectedSlot.start)}</span>
                  </div>
                </div>
              </div>

              {/* Pre-visit summary if available */}
              {preVisitSummary && preVisitSummary.status === 'COMPLETED' && (
                <div className="glass-card p-6 text-left mb-6">
                  <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-primary-400" />
                    AI Pre-Visit Summary
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-dark-400">Urgency:</span>
                      <UrgencyBadge level={preVisitSummary.urgencyLevel} />
                    </div>
                    <div>
                      <span className="text-dark-400">Chief Complaint:</span>
                      <p className="text-white mt-1">{preVisitSummary.chiefComplaint}</p>
                    </div>
                    {preVisitSummary.suggestedQuestions?.length > 0 && (
                      <div>
                        <span className="text-dark-400">Suggested Questions:</span>
                        <ul className="mt-1 space-y-1">
                          {preVisitSummary.suggestedQuestions.map((q: string, i: number) => (
                            <li key={i} className="text-primary-300 text-sm">• {q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => navigate('/patient/appointments')} className="btn-primary flex-1">
                  View Appointments
                </button>
                <button onClick={() => { setStep('search'); setHeldAppointment(null); }} className="btn-secondary flex-1">
                  Book Another
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
