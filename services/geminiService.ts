
import { GoogleGenAI, Type, Modality, GenerateContentResponse, Chat } from "@google/genai";
import type { Language, Crop, AnalysisResult, ChatMessage, GroundingLink } from '../types';

/**
 * Service to handle image analysis via Gemini 3 Flash.
 * Optimized for high-precision botanical recognition of Cotton, Wheat, Sugarcane, Mango, and Rice.
 */
export const analyzeCropImage = async (
  base64Image: string,
  crop: Crop,
  language: Language,
  location?: { latitude: number; longitude: number }
): Promise<AnalysisResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_NOT_CONFIGURED");
  }

  const ai = new GoogleGenAI({ apiKey });

  const imagePart = {
    inlineData: {
      data: base64Image,
      mimeType: 'image/jpeg',
    },
  };

  const systemInstruction = `You are an elite AI Botanical Pathologist. Your specialized knowledge core is limited to five crops: Cotton, Wheat, Sugarcane, Mango, and Rice.

RECOGNITION MISSION:
Analyze the provided image of a ${crop.name} leaf. You must identify:
1. SPECIMEN VALIDITY: Ensure the leaf belongs to the ${crop.name} species.
   - Cotton: Palmately lobed leaves.
   - Wheat: Long, narrow blades with parallel veins.
   - Sugarcane: Broad, grass-like leaves with a prominent white midrib.
   - Mango: Large, leathery, lanceolate leaves.
   - Rice: Slender blades, often rough-textured.
2. PATHOLOGY: Detect diseases (fungal, bacterial, viral), pests, or nutrient deficiencies.
3. ADVISORY: Provide organic/chemical remedies and long-term prevention.

STRICT OUTPUT RULES:
- OUTPUT RAW JSON ONLY. NO MARKDOWN WRAPPERS (\`\`\`json).
- "confidenceScore" must be 0-100.
- "cropMismatch": Set true only if the object is NOT a plant or clearly NOT a leaf.
- Use ${language} for all text fields.

JSON SCHEMA:
{
  "cropMismatch": boolean,
  "mismatchExplanation": "string",
  "diseaseName": "string",
  "confidenceScore": number,
  "isHealthy": boolean,
  "description": "string",
  "symptoms": ["string"],
  "remedies": { "chemical": ["string"], "organic": ["string"] },
  "preventiveMeasures": ["string"]
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: {
        parts: [
          imagePart,
          { text: `Identify health issues in this ${crop.name} leaf. Current Location: ${location?.latitude || 'Unknown'}, ${location?.longitude || 'Unknown'}. Respond in ${language}.` }
        ]
      },
      config: {
        systemInstruction,
        temperature: 0.1,
        tools: [{ googleSearch: {} }] // Using Google Search to ground advice in real-time regional data
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate || !candidate.content) throw new Error("ANALYSIS_FAILED");
    
    // Extract Search Grounding Links
    const groundingChunks = candidate.groundingMetadata?.groundingChunks;
    const groundingLinks: GroundingLink[] = (groundingChunks || [])
      .map((chunk: any) => {
        if (chunk.web) return { title: chunk.web.title || "Search Result", uri: chunk.web.uri };
        return null;
      })
      .filter((link): link is GroundingLink => link !== null);

    const textResponse = response.text || "";
    const match = textResponse.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("INVALID_RESPONSE_FORMAT");
    
    const cleanedJson = match[0].replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
    const result = JSON.parse(cleanedJson) as AnalysisResult;
    
    // Normalize confidence score
    if (typeof result.confidenceScore !== 'number') {
      result.confidenceScore = 85;
    } else if (result.confidenceScore <= 1) {
      result.confidenceScore = Math.round(result.confidenceScore * 100);
    }
    
    result.groundingLinks = groundingLinks;
    return result;
  } catch (error: any) {
    console.error("Gemini 3 Analysis Error:", error);
    throw new Error(error.message === "API_KEY_NOT_CONFIGURED" ? "API_KEY_NOT_CONFIGURED" : "ANALYSIS_FAILED");
  }
};

/**
 * Expert Chat Service using Gemini 3 Flash.
 */
export const startAgriChat = (
  crop: Crop,
  diagnosis: AnalysisResult,
  language: Language
): Chat => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_NOT_CONFIGURED");

  const ai = new GoogleGenAI({ apiKey });
  return ai.chats.create({
    model: 'gemini-3-flash-preview', 
    config: {
      systemInstruction: `You are an expert AI Agronomist for ${crop.name}. A user has a crop with "${diagnosis.diseaseName}". Help them in ${language}.`,
    },
  });
};

/**
 * TTS generation using the specific TTS model.
 */
export const generateTTS = async (text: string, voiceName: string = 'Zephyr'): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_NOT_CONFIGURED");
  
  const ai = new GoogleGenAI({ apiKey });
  
  const sanitizedText = text
    .replace(/[*_#`~>]/g, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') 
    .slice(0, 2000)
    .trim();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: sanitizedText }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { 
        voiceConfig: { 
          prebuiltVoiceConfig: { voiceName } 
        } 
      },
    },
  });
  
  const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData && p.inlineData.data);
  if (!audioPart || !audioPart.inlineData) {
    throw new Error("TTS_GENERATION_FAILED");
  }
  
  return audioPart.inlineData.data;
};

export const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
};

export const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> => {
  let bufferToUse = data.buffer;
  if (bufferToUse.byteLength % 2 !== 0) bufferToUse = bufferToUse.slice(0, bufferToUse.byteLength - 1);
  const dataInt16 = new Int16Array(bufferToUse);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
};
