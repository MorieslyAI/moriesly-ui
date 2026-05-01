
import { Blob } from '@google/genai';

export function floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  // Chunking to avoid stack overflow on massive buffers, though usually chunks are small
  const chunkSize = 0x8000; 
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as any);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Downsamples audio data from a source rate to a target rate (16000Hz).
 * Critical for AI speech recognition compatibility across different devices.
 */
function downsampleBuffer(buffer: Float32Array, inputSampleRate: number, targetSampleRate: number = 16000): Float32Array {
  if (inputSampleRate === targetSampleRate) {
    return buffer;
  }
  
  if (inputSampleRate < targetSampleRate) {
    // Upsampling not supported/recommended for this use case
    return buffer;
  }

  const sampleRateRatio = inputSampleRate / targetSampleRate;
  const newLength = Math.round(buffer.length / sampleRateRatio);
  const result = new Float32Array(newLength);
  
  let offsetResult = 0;
  let offsetBuffer = 0;
  
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    
    // Use average value between samples to prevent aliasing (simple low-pass filter effect)
    let accum = 0, count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  
  return result;
}

export function createPcmBlob(data: Float32Array, inputSampleRate: number): Blob {
  // 1. Downsample to 16kHz if necessary
  const downsampledData = downsampleBuffer(data, inputSampleRate, 16000);
  
  // 2. Convert to 16-bit PCM
  const pcmBuffer = floatTo16BitPCM(downsampledData);
  
  // 3. Encode to Base64
  const base64 = arrayBufferToBase64(pcmBuffer);
  
  return {
    data: base64,
    mimeType: 'audio/pcm;rate=16000',
  };
}

export async function decodeAudioData(
  base64Data: string,
  ctx: AudioContext
): Promise<AudioBuffer> {
  const arrayBuffer = base64ToArrayBuffer(base64Data);
  
  // Create an AudioBuffer manually for raw PCM data
  // The Gemini model returns raw PCM 16-bit, 24kHz, mono (usually)
  const dataView = new DataView(arrayBuffer);
  const numChannels = 1;
  const sampleRate = 24000; 
  const length = arrayBuffer.byteLength / 2; // 2 bytes per sample

  const audioBuffer = ctx.createBuffer(numChannels, length, sampleRate);
  const channelData = audioBuffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    // Convert 16-bit integer to float [-1.0, 1.0]
    const int16 = dataView.getInt16(i * 2, true); // Little endian
    channelData[i] = int16 / 32768.0;
  }

  return audioBuffer;
}
