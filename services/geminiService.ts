
import { GoogleGenAI, Type, Modality, GenerateContentResponse, Chat } from "@google/genai";
import type { Language, Crop, AnalysisResult, ChatMessage, GroundingLink } from '../types';

/**
 * Service to handle image analysis via Gemini 2.5 series.
 */
export const analyzeCropImage = async (
  base64Image: string,
  crop: Crop,
  language: Language,
  location?: { latitude: number; longitude: number }
): Promise<AnalysisResult> => {
  const apiKey = process.env.GEMINI_API_KEY;
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

  const systemInstruction = `You are a world-class agricultural pathologist specializing in ${crop.name}.
Analyze the provided leaf image.

CRITICAL REQUIREMENTS:
1. FIRST, check if the image shows a ${crop.name} leaf. If NOT, set "cropMismatch": true and provide explanation.
2. OUTPUT JSON ONLY. NO MARKDOWN, NO EXTRA TEXT.
3. "confidenceScore" MUST BE AN INTEGER (0-100).
4. For healthy leaves, set "isHealthy": true and minimal details.
5. For diseased leaves, provide detailed symptoms, remedies, and preventive measures.
6. LANGUAGE FOR ALL TEXT: ${language}.

JSON SCHEMA:
{
  "cropMismatch": boolean,
  "mismatchExplanation": "string (required if cropMismatch is true)",
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
      model: "gemini-2.5-flash", 
      contents: {
        parts: [
          imagePart,
          { text: `Analyze this image for ${crop.name} leaf health. Check if it's actually a ${crop.name} leaf first. If not, set cropMismatch to true. If it is a ${crop.name} leaf, determine if it's healthy or diseased. For diseased leaves, identify the specific disease, symptoms, remedies, and prevention. Return only valid JSON matching the schema. Language: ${language}.` }
        ]
      },
      config: {
        systemInstruction,
        temperature: 0.1,
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: location ? { latitude: location.latitude, longitude: location.longitude } : undefined
          }
        }
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate || !candidate.content) throw new Error("ANALYSIS_FAILED");
    
    // Extract Grounding Links
    const groundingChunks = candidate.groundingMetadata?.groundingChunks;
    const groundingLinks: GroundingLink[] = (groundingChunks || [])
      .map((chunk: any) => {
        if (chunk.maps) return { title: chunk.maps.title || "Map View", uri: chunk.maps.uri };
        if (chunk.web) return { title: chunk.web.title || "Source", uri: chunk.web.uri };
        return null;
      })
      .filter((link): link is GroundingLink => link !== null);

    const textResponse = response.text || "";
    const match = textResponse.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("INVALID_RESPONSE_FORMAT");
    
    // Clean JSON from invisible characters or control codes
    const cleanedJson = match[0].replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
    const result = JSON.parse(cleanedJson) as AnalysisResult;
    
    // Safety check for confidenceScore
    if (typeof result.confidenceScore !== 'number') {
      result.confidenceScore = 85; // Default fallback if model fails to provide
    }
    
    result.groundingLinks = groundingLinks;
    return result;
  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    throw new Error(error.message === "API_KEY_NOT_CONFIGURED" ? "API_KEY_NOT_CONFIGURED" : "ANALYSIS_FAILED");
  }
};

/**
 * Starts a new chat session for follow-up expert advice.
 */
export const startAgriChat = (
  crop: Crop,
  diagnosis: AnalysisResult,
  language: Language
): Chat => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("API_KEY_NOT_CONFIGURED");

  const ai = new GoogleGenAI({ apiKey });
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are an expert AI Agronomist. User leaf: ${crop.name}, Diagnosis: ${diagnosis.diseaseName}. Answer in ${language}.`,
    },
  });
};

export const generateTTS = async (text: string, voiceName: string = 'Zephyr'): Promise<string> => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("API_KEY_NOT_CONFIGURED");
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: text.slice(0, 1500) }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
    },
  });
  const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData && p.inlineData.data);
  return audioPart?.inlineData?.data || "";
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
