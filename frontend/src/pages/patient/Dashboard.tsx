import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Calendar, Clock, Stethoscope, Activity, ArrowRight } from 'lucide-react';
import { Card, LoadingSpinner, StatusBadge, UrgencyBadge, EmptyState, PageHeader } from '../../components/UI';
import api from '../../services/api';

export default function PatientDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/bookings/my')
      .then(res => setAppointments(res.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const upcomingAppointments = appointments
    .filter(a => a.status === 'BOOKED' && new Date(a.slotStart) > new Date())
    .sort((a, b) => new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime());

  const pastAppointments = appointments
    .filter(a => a.status === 'COMPLETED')
    .slice(0, 3);

  const stats = [
    { label: 'Upcoming', value: upcomingAppointments.length, icon: Calendar, color: 'from-blue-500 to-cyan-500' },
    { label: 'Completed', value: appointments.filter(a => a.status === 'COMPLETED').length, icon: Activity, color: 'from-emerald-500 to-teal-500' },
    { label: 'Total', value: appointments.length, icon: Stethoscope, color: 'from-purple-500 to-pink-500' },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <PageHeader
        title={`Welcome, ${user?.name?.split(' ')[0]} 👋`}
        subtitle="Manage your health appointments and records"
        actions={
          <Link to="/patient/book" className="btn-primary flex items-center gap-2">
            <Stethoscope className="w-4 h-4" /> Book Appointment
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm">{stat.label}</p>
                <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 bg-gradient-to-br ${stat.color} rounded-xl`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming appointments */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-400" />
            Upcoming Appointments
          </h2>
          {upcomingAppointments.length === 0 ? (
            <Card>
              <EmptyState
                icon={Calendar}
                title="No upcoming appointments"
                description="Book an appointment with a doctor"
                action={
                  <Link to="/patient/book" className="btn-primary text-sm">
                    Book Now
                  </Link>
                }
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.slice(0, 5).map((apt) => (
                <motion.div
                  key={apt.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass-card-hover p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">
                        Dr. {apt.doctorProfile?.user?.name?.replace('Dr. ', '')}
                      </p>
                      <p className="text-sm text-dark-400">
                        {apt.doctorProfile?.specialisation}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-sm text-dark-300">
                        <Calendar className="w-4 h-4" />
                        {new Date(apt.slotStart).toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric'
                        })}
                        <Clock className="w-4 h-4 ml-2" />
                        {new Date(apt.slotStart).toLocaleTimeString('en-US', {
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge status={apt.status} />
                      {apt.preVisitSummary?.urgencyLevel && (
                        <UrgencyBadge level={apt.preVisitSummary.urgencyLevel} />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Recent completed */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Recent Visits
          </h2>
          {pastAppointments.length === 0 ? (
            <Card>
              <EmptyState
                icon={Activity}
                title="No past visits"
                description="Your visit history will appear here"
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {pastAppointments.map((apt) => (
                <Link key={apt.id} to={`/patient/appointments`}>
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-card-hover p-4 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-white">
                        Dr. {apt.doctorProfile?.user?.name?.replace('Dr. ', '')}
                      </p>
                      <p className="text-sm text-dark-400 mt-1">
                        {new Date(apt.slotStart).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-dark-400" />
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
