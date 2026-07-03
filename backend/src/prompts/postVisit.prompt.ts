/**
 * Post-visit summary prompt template.
 * Triggered when doctor submits clinical notes + prescription.
 */
export const POST_VISIT_PROMPT = `Convert these clinical notes into a patient-friendly summary. Return a JSON object with exactly these fields:
{
  "patientSummary": "A clear, easy-to-understand summary of the visit and diagnosis written for the patient",
  "medicationSchedule": [
    {
      "name": "Medication name",
      "dosage": "e.g. 500mg",
      "frequency": "e.g. Twice daily",
      "duration": "e.g. 5 days",
      "instructions": "e.g. Take after meals"
    }
  ],
  "followUpSteps": ["Step 1", "Step 2"]
}

Rules:
- patientSummary should be in plain language, avoiding medical jargon where possible
- medicationSchedule must list each medication with dosage, frequency, duration, and any special instructions
- followUpSteps should include when to return, what symptoms to watch for, and any lifestyle recommendations
- Return ONLY the JSON object, no additional text or markdown

Clinical Notes: {{clinicalNotes}}
Diagnosis: {{diagnosis}}
Prescriptions: {{prescriptions}}`;
