
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, SafetyStatus } from "../types";

const SYSTEM_INSTRUCTION = `You are a Beverage Safety Expert and Forensic Multi-Modal Analyst. Your task is to perform a synthesized analysis of a drink image and user-reported physical symptoms.

FORENSIC VISUAL CHECKLIST:
1. SINKING ICE: In alcoholic drinks, ice must float. Sinking ice indicates a density change often caused by dissolved solids/adulterants.
2. REACTION BUBBLES: Unusual, rapid fizzing from the bottom (powder reaction).
3. OPTICAL ANOMALIES: Cloudiness, "fogging," or oily films in clear liquids.
4. COLOR SHIFTS: Layering or subtle chemical tinting.

SYMPTOM CORRELATION (HIGHEST PRIORITY):
- If the user reports ANY symptoms, you must treat the drink as potentially compromised designated as WARNING or DANGER.
- Physical symptoms are direct evidence of physiological reaction, which overrides benign visual appearance.
- Example: Clear drink + "Dizziness" = DANGER (Suspected invisible agent like GHB).
- Your 'observations' must include a "SYMPTOM ANALYSIS" section if symptoms are present.

INVALID IMAGES:
- If no beverage container is clearly visible for analysis, set status to INVALID.

RESPONSE SCHEMA:
- STATUS: SAFE, WARNING, DANGER, CRITICAL, or INVALID.
- OBSERVATIONS: A list of findings, including at least one point synthesizing the image with the reported symptoms.
- RED FLAGS: Specific indicators found (e.g., "Sinking Ice").
- RECOMMENDATION: Specific advice.
- EMERGENCY ACTION: Required if DANGER or CRITICAL.

Output strictly in JSON format.`;

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function analyzeBeverage(base64Image: string, userSymptoms: string[] = [], retries = 2): Promise<AnalysisResult> {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    throw new Error("API Key is missing. Please check .env.local configuration.");
  }
  const ai = new GoogleGenAI({ apiKey });
  const modelName = 'gemini-3-flash-preview';

  const symptomContext = userSymptoms.length > 0
    ? `CRITICAL ALERT: The user reports the following active symptoms: ${userSymptoms.join(', ')}. Treat these as CONFIRMED physiological reactions to the drink. If symptoms include dizziness, confusion, nausea, or vision issues, the status MUST be at least WARNING or DANGER regardless of visual clarity.`
    : "The user reports no physical symptoms at this time.";

  const execute = async () => {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          parts: [
            { text: `Perform a forensic synthesis. Sypmtom correlation is PRIMARY priority. \n\nContext: ${symptomContext}\n\nAnalyze the image for any supporting visual evidence, but prioritize the symptoms in your final risk assessment.` },
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
          ]
        }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, enum: Object.values(SafetyStatus) },
            drinkType: { type: Type.STRING },
            observations: { type: Type.ARRAY, items: { type: Type.STRING } },
            detectedRedFlags: { type: Type.ARRAY, items: { type: Type.STRING } },
            confidence: { type: Type.NUMBER },
            alertMessage: { type: Type.STRING },
            recommendation: { type: Type.STRING },
            emergencyAction: { type: Type.STRING }
          },
          required: ["status", "drinkType", "observations", "detectedRedFlags", "confidence", "recommendation"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("Empty response from AI");
    return JSON.parse(resultText) as AnalysisResult;
  };

  try {
    return await execute();
  } catch (error: any) {
    if (retries > 0 && (error.message?.includes('500') || error.message?.includes('xhr') || error.message?.includes('fetch'))) {
      console.warn(`Transient error, retrying... (${retries} left)`);
      await delay(1500 * (3 - retries));
      return analyzeBeverage(base64Image, userSymptoms, retries - 1);
    }

    console.error("Gemini Analysis Final Error:", error);

    const errorMessage = error.message || '';
    if (errorMessage.includes('API key') || errorMessage.includes('403')) {
      throw new Error("Invalid API Key. Please check your system configuration.");
    }

    throw new Error(errorMessage.includes('400')
      ? "Image quality issue. Try a different angle or better light."
      : "Server error. Please wait a moment and try again.");
  }
}
