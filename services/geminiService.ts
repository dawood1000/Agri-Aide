import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import type { Language, Crop, AnalysisResult } from '../types';

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

  // Explicit instruction to minimize conversational filler and ensure valid JSON.
  // Note: responseMimeType: "application/json" is NOT used here because it is incompatible with googleMaps tool.
  const systemInstruction = `You are a world-class agricultural pathologist specializing in ${crop.name}.
Your mission is to analyze the provided image of a plant leaf and determine its health status.

OUTPUT CONSTRAINTS:
1. RETURN ONLY A VALID JSON OBJECT. NO MARKDOWN, NO EXPLANATION.
2. IF THE IMAGE IS NOT A ${crop.name} LEAF, SET "cropMismatch": true.
3. ALL TEXT FIELDS MUST BE IN THE LANGUAGE: ${language}.

JSON SCHEMA:
{
  "cropMismatch": boolean,
  "mismatchExplanation": "Brief professional note in ${language} if mismatch found",
  "diseaseName": "Scientific or common name in ${language}",
  "confidenceScore": number (0-100),
  "isHealthy": boolean,
  "description": "Comprehensive overview in ${language}",
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
          { text: `Analyze this ${crop.name} leaf at coordinates ${location?.latitude || 'unknown'}, ${location?.longitude || 'unknown'}. Return ONLY the JSON object.` }
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
    if (!candidate || !candidate.content) {
      console.error("Gemini failed to return a valid candidate.");
      throw new Error("ANALYSIS_FAILED");
    }

    if (candidate.finishReason === 'SAFETY') {
      console.error("Analysis blocked by safety filters.");
      throw new Error("ANALYSIS_FAILED");
    }

    // Extract text safely. Using the .text property which handles part iteration internally.
    const textResponse = response.text || "";

    if (!textResponse.trim()) {
      console.error("Gemini response contained no readable text parts.");
      throw new Error("ANALYSIS_FAILED");
    }

    // Attempt to locate JSON block using braces to ignore any conversational preamble
    const firstBrace = textResponse.indexOf('{');
    const lastBrace = textResponse.lastIndexOf('}');
    
    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
      console.error("JSON block not found in model output:", textResponse);
      throw new Error("ANALYSIS_FAILED");
    }
    
    const jsonString = textResponse.substring(firstBrace, lastBrace + 1);
    
    try {
      // Clean possible control characters that break JSON.parse
      const cleanedJson = jsonString.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
      const result = JSON.parse(cleanedJson) as AnalysisResult;

      // Extract grounding metadata for UI links
      const groundingChunks = candidate.groundingMetadata?.groundingChunks;
      if (groundingChunks) {
        const links = groundingChunks
          .filter((chunk: any) => chunk.maps)
          .map((chunk: any) => ({
            title: chunk.maps.title || "Regional Insight",
            uri: chunk.maps.uri
          }));
        
        if (links.length > 0) {
          result.groundingLinks = [...(result.groundingLinks || []), ...links];
        }
      }

      return result;
    } catch (parseError) {
      console.error("JSON parsing failed. Raw block:", jsonString);
      throw new Error("ANALYSIS_FAILED");
    }
  } catch (error: any) {
    console.error("Gemini Service Error Detail:", error);
    if (error.message === "API_KEY_NOT_CONFIGURED" || error.message === "ANALYSIS_FAILED") {
      throw error;
    }
    throw new Error("ANALYSIS_FAILED");
  }
};

/**
 * Generates audio bytes for TTS using Gemini 2.5 Flash Preview TTS.
 */
export const generateTTS = async (text: string, voiceName: string = 'Zephyr'): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_NOT_CONFIGURED");

  const ai = new GoogleGenAI({ apiKey });

  // Limit text length and sanitize for better TTS engine compatibility
  const sanitizedText = text.replace(/[*_#`]/g, '').slice(0, 800).trim();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: sanitizedText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate || !candidate.content || !candidate.content.parts) {
      throw new Error("TTS_FAILED");
    }

    // Search all parts for the one containing audio data (inlineData)
    const audioPart = candidate.content.parts.find(p => p.inlineData && p.inlineData.data);
    const base64Audio = audioPart?.inlineData?.data;
    
    if (!base64Audio) {
      console.error("TTS candidate missing audio data.");
      throw new Error("TTS_FAILED");
    }
    return base64Audio;
  } catch (error) {
    console.error("TTS generation error:", error);
    throw new Error("TTS_FAILED");
  }
};

export const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> => {
  // Ensure the buffer is aligned for Int16Array (2 bytes per sample)
  let bufferToUse = data.buffer;
  if (bufferToUse.byteLength % 2 !== 0) {
    bufferToUse = bufferToUse.slice(0, bufferToUse.byteLength - 1);
  }

  const dataInt16 = new Int16Array(bufferToUse);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};
