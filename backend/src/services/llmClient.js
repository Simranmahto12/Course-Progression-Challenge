/**
 * MIRAI SCHOOL OF TECHNOLOGY (MSOT) — COURSE PROGRESSION PLATFORM
 * Multi-Provider LLM Client (Google Gemini API & Local Ollama)
 * 
 * Features:
 * 1. Google Gemini 1.5 Flash / Pro API integration using GEMINI_API_KEY / GOOGLE_API_KEY
 * 2. Local Ollama integration (http://localhost:11434) using OLLAMA_HOST & OLLAMA_MODEL
 * 3. Robust error handling and fallback to deterministic engine
 */

export class LlmClient {
  static getGeminiApiKey() {
    return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || 'AIzaSyC0codgWkkhDkhNYBu8kaCrk7jhhEJ4a9g';
  }

  static getOllamaConfig() {
    return {
      host: process.env.OLLAMA_HOST || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'llama3',
    };
  }

  /**
   * Generic LLM generation supporting Gemini API and Ollama
   */
  static async generate(prompt, { systemInstruction = '', temperature = 0.2, jsonMode = false } = {}) {
    // 1. Try Gemini API first
    const geminiKey = this.getGeminiApiKey();
    if (geminiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
        const contents = [];
        if (systemInstruction) {
          contents.push({ role: 'user', parts: [{ text: `System context: ${systemInstruction}` }] });
          contents.push({ role: 'model', parts: [{ text: 'Understood. I will strictly follow these academic platform instructions.' }] });
        }
        contents.push({ role: 'user', parts: [{ text: prompt }] });

        const bodyPayload = {
          contents,
          generationConfig: {
            temperature,
            ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
          },
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return {
              provider: 'gemini',
              model: 'gemini-1.5-flash',
              text: text.trim(),
            };
          }
        }
      } catch (err) {
        // Fall through to Ollama
      }
    }

    // 2. Try Local Ollama
    const ollama = this.getOllamaConfig();
    try {
      const ollamaRes = await fetch(`${ollama.host}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollama.model,
          prompt: systemInstruction ? `${systemInstruction}\n\nUser: ${prompt}` : prompt,
          stream: false,
          format: jsonMode ? 'json' : undefined,
          options: { temperature },
        }),
      });

      if (ollamaRes.ok) {
        const ollamaData = await ollamaRes.json();
        if (ollamaData?.response) {
          return {
            provider: 'ollama',
            model: ollama.model,
            text: ollamaData.response.trim(),
          };
        }
      }
    } catch (err) {
      // Both external LLM providers unavailable
    }

    return null;
  }

  /**
   * Parse faculty WhatsApp / Telegram message or voice transcript using LLM
   */
  static async parseSessionMessage({ text, facultyName, assignedSubjects = [], defaultDate = null }) {
    const subjectsList = assignedSubjects.map((s) => `${s.code} - ${s.name}`).join('; ');
    const systemInstruction = `You are the MSOT Academic Operations Parser. Your job is to extract structured session log fields from faculty voice transcripts or text messages.
The faculty member is ${facultyName || 'Faculty'}.
Assigned Subjects: [${subjectsList}].
Return ONLY valid JSON matching this schema:
{
  "subjectCode": "Matched Subject Code or null",
  "subjectName": "Matched Subject Name or null",
  "status": "Completed | In Progress | Cancelled | Skipped",
  "percentageComplete": number (0 to 100),
  "topicsCovered": "string summary of topics taught",
  "leftovers": "string summary of carry-forward topics or empty",
  "classworkStatus": "None | Given | Completed",
  "homeworkStatus": "None | Given | Collected",
  "confidenceScore": number between 0.1 and 1.0,
  "needsClarification": boolean,
  "clarificationPrompt": "string if confidence < 0.7 or ambiguous"
}`;

    const prompt = `Faculty input message: "${text}"
Current reference date: ${defaultDate || new Date().toISOString().slice(0, 10)}.
Parse this into the JSON format.`;

    const result = await this.generate(prompt, { systemInstruction, temperature: 0.1, jsonMode: true });
    if (!result || !result.text) return null;

    try {
      const cleaned = result.text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return {
        ...parsed,
        llmProvider: result.provider,
        llmModel: result.model,
      };
    } catch {
      return null;
    }
  }

  /**
   * Generate Grounded Weekly Campus Progression Narrative using LLM
   */
  static async generateCampusSummaryNarrative({ campusName, slippingSubjects = [], totalSubjects = 0, onTrackCount = 0 }) {
    const systemInstruction = `You are an Academic Director at Mirai School of Technology (MSOT).
Generate a concise, professional executive weekly summary of course progression.
Rules:
1. Synthesize slipping courses (buffer ratio < 1.15) and cite faculty notes as reasons.
2. Formulate grounded recovery plans (e.g. scheduling extra remedial class on a working Saturday, merging review topics).
3. Explicitly state that all recommendations are manager suggestions for review and that timetables have not been modified.
4. Keep the format in clean, professional GitHub-flavored Markdown.`;

    const slippingContext = slippingSubjects.map((s) => {
      const notes = (s.facultyNotes || []).map((n) => `[${n.date}]: "${n.note}" (leftover: ${n.leftovers || 'none'})`).join('; ');
      return `- Subject: ${s.subjectCode} - ${s.subjectName} (${s.trackName})
  Faculty: ${s.facultyName} | Buffer Ratio: ${s.bufferRatio.toFixed(2)} | Coverage: ${s.coveragePercentage.toFixed(1)}%
  Recorded Faculty Notes: ${notes || 'No notes entered (low progression velocity)'}
  Missed Timetable Sessions: ${s.missedSessionsCount || 0}`;
    }).join('\n\n');

    const prompt = `Campus: ${campusName}
Total Active Subjects: ${totalSubjects} | On-Track: ${onTrackCount} | Slipping: ${slippingSubjects.length}

Slipping Subjects Data:
${slippingContext || 'None! All courses on track.'}

Generate the executive weekly summary with recovery suggestions for campus manager review.`;

    const result = await this.generate(prompt, { systemInstruction, temperature: 0.3 });
    if (!result || !result.text) return null;

    return {
      narrative: result.text,
      llmProvider: result.provider,
      llmModel: result.model,
    };
  }
}
