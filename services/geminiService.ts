
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

  const systemInstruction = `You are a world-class agricultural pathologist specializing in ${crop.name}.
Your mission is to analyze the provided image of a plant leaf and determine its health status.

OUTPUT CONSTRAINTS:
1. RETURN ONLY A VALID JSON OBJECT.
2. DO NOT INCLUDE ANY MARKDOWN FENCING LIKE \`\`\`json.
3. IF THE IMAGE IS NOT A ${crop.name} LEAF, SET "cropMismatch": true.
4. ALL TEXT FIELDS MUST BE IN THE LANGUAGE: ${language}.
5. "confidenceScore" MUST BE AN INTEGER BETWEEN 0 AND 100.

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
  "preventiveMeasures": ["string"],
  "regionalAlerts": ["string"]
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: {
        parts: [
          imagePart,
          { text: `Strictly provide a health analysis for this ${crop.name} leaf in ${language}. Location: ${location?.latitude || 'Unknown'}, ${location?.longitude || 'Unknown'}. Output raw JSON only.` }
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
        if (chunk.maps) return { title: chunk.maps.title || "View on Google Maps", uri: chunk.maps.uri };
        if (chunk.web) return { title: chunk.web.title || "View Source", uri: chunk.web.uri };
        return null;
      })
      .filter((link): link is GroundingLink => link !== null);

    const textResponse = response.text || "";
    
    // Improved JSON extraction: Finds first '{' and last '}' to ignore MD fencing or text wrappers
    const match = textResponse.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("INVALID_RESPONSE_FORMAT");
    
    const jsonString = match[0];
    const cleanedJson = jsonString.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
    const result = JSON.parse(cleanedJson) as AnalysisResult;
    
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
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_NOT_CONFIGURED");

  const ai = new GoogleGenAI({ apiKey });
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are an expert AI Agronomist. 
User just scanned a ${crop.name} leaf diagnosed with ${diagnosis.diseaseName}.
Answer questions in ${language} concisely and professionally.`,
    },
  });
};

/**
 * Generates audio bytes for TTS using Gemini 2.5 Flash Preview TTS.
 */
export const generateTTS = async (text: string, voiceName: string = 'Zephyr'): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_NOT_CONFIGURED");
  const ai = new GoogleGenAI({ apiKey });
  const sanitizedText = text.replace(/[*_#`]/g, '').slice(0, 3000).trim();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: sanitizedText }] }],
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
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
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
