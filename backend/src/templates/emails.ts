export function bookingConfirmationEmail(data: {
  patientName: string;
  doctorName: string;
  slotStart: Date;
  slotEnd: Date;
}): string {
  const date = data.slotStart.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const time = data.slotStart.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit'
  });

  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #0d9488, #06b6d4); padding: 32px; text-align: center;">
        <h1 style="margin: 0; color: white; font-size: 24px;">✅ Appointment Confirmed</h1>
      </div>
      <div style="padding: 32px;">
        <p>Hi <strong>${data.patientName}</strong>,</p>
        <p>Your appointment has been confirmed:</p>
        <div style="background: #1e293b; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="margin: 8px 0;"><strong>🩺 Doctor:</strong> Dr. ${data.doctorName}</p>
          <p style="margin: 8px 0;"><strong>📅 Date:</strong> ${date}</p>
          <p style="margin: 8px 0;"><strong>🕐 Time:</strong> ${time}</p>
        </div>
        <p>Please arrive 10 minutes early. If you need to cancel or reschedule, you can do so from your dashboard.</p>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 24px;">— Panacea Healthcare Team</p>
      </div>
    </div>
  `;
}

export function cancellationEmail(data: {
  patientName: string;
  doctorName: string;
  slotStart: Date;
  reason: string;
  rebookUrl?: string;
}): string {
  const date = data.slotStart.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #dc2626, #f97316); padding: 32px; text-align: center;">
        <h1 style="margin: 0; color: white; font-size: 24px;">❌ Appointment Cancelled</h1>
      </div>
      <div style="padding: 32px;">
        <p>Hi <strong>${data.patientName}</strong>,</p>
        <p>Your appointment with <strong>Dr. ${data.doctorName}</strong> on <strong>${date}</strong> has been cancelled.</p>
        <p><strong>Reason:</strong> ${data.reason}</p>
        ${data.rebookUrl ? `
          <a href="${data.rebookUrl}" style="display: inline-block; background: linear-gradient(135deg, #0d9488, #06b6d4); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
            📅 Rebook Appointment
          </a>
        ` : ''}
        <p style="color: #94a3b8; font-size: 14px; margin-top: 24px;">— Panacea Healthcare Team</p>
      </div>
    </div>
  `;
}

export function reminderEmail(data: {
  patientName: string;
  doctorName: string;
  slotStart: Date;
  hoursUntil: number;
}): string {
  const time = data.slotStart.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit'
  });

  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #7c3aed, #a855f7); padding: 32px; text-align: center;">
        <h1 style="margin: 0; color: white; font-size: 24px;">⏰ Appointment Reminder</h1>
      </div>
      <div style="padding: 32px;">
        <p>Hi <strong>${data.patientName}</strong>,</p>
        <p>Your appointment with <strong>Dr. ${data.doctorName}</strong> is in <strong>${data.hoursUntil} hour(s)</strong> at <strong>${time}</strong>.</p>
        <p>Please make sure to arrive on time.</p>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 24px;">— Panacea Healthcare Team</p>
      </div>
    </div>
  `;
}

export function medicationReminderEmail(data: {
  patientName: string;
  medication: string;
  dosage: string;
  instructions?: string;
}): string {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 32px; text-align: center;">
        <h1 style="margin: 0; color: white; font-size: 24px;">💊 Medication Reminder</h1>
      </div>
      <div style="padding: 32px;">
        <p>Hi <strong>${data.patientName}</strong>,</p>
        <p>It's time to take your medication:</p>
        <div style="background: #1e293b; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="margin: 8px 0;"><strong>💊 Medication:</strong> ${data.medication}</p>
          <p style="margin: 8px 0;"><strong>📏 Dosage:</strong> ${data.dosage}</p>
          ${data.instructions ? `<p style="margin: 8px 0;"><strong>📝 Instructions:</strong> ${data.instructions}</p>` : ''}
        </div>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 24px;">— Panacea Healthcare Team</p>
      </div>
    </div>
  `;
}

export function leaveConflictEmail(data: {
  patientName: string;
  doctorName: string;
  slotStart: Date;
  rebookUrl: string;
}): string {
  const date = data.slotStart.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #d97706, #f59e0b); padding: 32px; text-align: center;">
        <h1 style="margin: 0; color: white; font-size: 24px;">⚠️ Doctor on Leave — Appointment Cancelled</h1>
      </div>
      <div style="padding: 32px;">
        <p>Hi <strong>${data.patientName}</strong>,</p>
        <p>Unfortunately, <strong>Dr. ${data.doctorName}</strong> is on leave on <strong>${date}</strong> and your appointment has been cancelled.</p>
        <p>Please rebook at your earliest convenience:</p>
        <a href="${data.rebookUrl}" style="display: inline-block; background: linear-gradient(135deg, #0d9488, #06b6d4); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
          📅 Rebook Appointment
        </a>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 24px;">— Panacea Healthcare Team</p>
      </div>
    </div>
  `;
}
