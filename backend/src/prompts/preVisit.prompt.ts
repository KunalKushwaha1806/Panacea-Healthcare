/**
 * Pre-visit summary prompt template.
 * Triggered when patient submits symptom form before confirming booking.
 */
export const PRE_VISIT_PROMPT = `Analyse these symptoms and return a JSON object with exactly these fields:
{
  "urgencyLevel": "Low" | "Medium" | "High",
  "chiefComplaint": "A concise chief complaint in one sentence",
  "suggestedQuestions": ["Question 1 for the doctor", "Question 2 for the doctor", "Question 3 for the doctor"]
}

Rules:
- urgencyLevel must be exactly one of: "Low", "Medium", "High"
- chiefComplaint must be a clear, concise summary of the main issue
- suggestedQuestions must contain exactly 3 relevant questions the patient should ask the doctor
- Return ONLY the JSON object, no additional text or markdown

Symptoms: {{symptoms}}
Duration: {{duration}}
Severity: {{severity}}`;
