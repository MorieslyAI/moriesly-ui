import { createPcmBlob, decodeAudioData } from "./audioUtils";

interface GeminiServiceCallbacks {
  onOpen: () => void;
  onMessage: (text: string | null, isUser: boolean) => void;
  onError: (error: Error) => void;
  onClose: () => void;
  onAudioData: (volume: number) => void; // For visualizer
  onPolicyUpdate?: (policy: {
    status: "active" | "ended";
    shouldEnd: boolean;
    reason?: string;
    remainingSessionSeconds: number;
    remainingSecondsToday: number;
  }) => void;
}

interface GeminiLiveServiceOptions {
  socketToken: string;
  sessionId: string;
  apiBaseUrl?: string;
}

type ProxyServerMessage =
  | { type: "ready"; sessionId: string }
  | { type: "open" }
  | { type: "transcript"; text: string; isUser: boolean }
  | { type: "audio"; data: string }
  | {
      type: "policy";
      status: "active" | "ended";
      shouldEnd: boolean;
      reason?: string;
      remainingSessionSeconds: number;
      remainingSecondsToday: number;
    }
  | { type: "policy_end"; reason?: string }
  | { type: "closed" }
  | { type: "error"; message: string; code?: string };

export class GeminiLiveService {
  private socket: WebSocket | null = null;
  private sessionReady: boolean = false;
  private isDisconnecting: boolean = false;
  private callbacks: GeminiServiceCallbacks | null = null;
  private readonly socketToken: string;
  private readonly sessionId: string;
  private readonly apiBaseUrl?: string;
  private audioContext: AudioContext | null = null;
  private inputAudioContext: AudioContext | null = null;
  private nextStartTime = 0;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private inputGain: GainNode | null = null; // Added GainNode
  private analyser: AnalyserNode | null = null;
  private visualizerInterval: number | null = null;
  private isMuted: boolean = false;

  constructor(options: GeminiLiveServiceOptions) {
    if (!options.socketToken) {
      throw new Error("Socket token is missing");
    }
    if (!options.sessionId) {
      throw new Error("Video session ID is missing");
    }

    this.socketToken = options.socketToken;
    this.sessionId = options.sessionId;
    this.apiBaseUrl = options.apiBaseUrl;
  }

  setMute(mute: boolean) {
    this.isMuted = mute;
  }

  private buildSocketUrl(): string {
    const configuredBase =
      this.apiBaseUrl ?? import.meta.env.VITE_API_URL ?? "http://localhost:4000";
    const base =
      configuredBase && configuredBase.trim().length > 0
        ? configuredBase
        : "http://localhost:4000";

    const url = new URL(base, window.location.origin);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "/chat/video/live";
    url.search = "";
    url.searchParams.set("token", this.socketToken);
    url.searchParams.set("sessionId", this.sessionId);
    return url.toString();
  }

  private sendProxyMessage(payload: Record<string, unknown>) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(payload));
  }

  private handleServerMessage(message: ProxyServerMessage) {
    if (!this.callbacks) return;

    if (message.type === "open") {
      this.sessionReady = true;
      this.callbacks.onOpen();
      return;
    }

    if (message.type === "transcript") {
      this.callbacks.onMessage(message.text, message.isUser);
      return;
    }

    if (message.type === "audio" && this.audioContext) {
      void decodeAudioData(message.data, this.audioContext)
        .then((audioBuffer) => this.playAudio(audioBuffer))
        .catch((e) => {
          console.warn("Audio decode failed", e);
        });
      return;
    }

    if (message.type === "policy" && this.callbacks.onPolicyUpdate) {
      this.callbacks.onPolicyUpdate({
        status: message.status,
        shouldEnd: message.shouldEnd,
        reason: message.reason,
        remainingSessionSeconds: message.remainingSessionSeconds,
        remainingSecondsToday: message.remainingSecondsToday,
      });
      return;
    }

    if (message.type === "policy_end" && this.callbacks.onPolicyUpdate) {
      this.callbacks.onPolicyUpdate({
        status: "ended",
        shouldEnd: true,
        reason: message.reason ?? "policy_end",
        remainingSessionSeconds: 0,
        remainingSecondsToday: 0,
      });
      return;
    }

    if (message.type === "error") {
      const err = new Error(message.message || "Video socket error");
      (err as any).code = message.code;
      this.callbacks.onError(err);
      return;
    }

    if (message.type === "closed") {
      this.callbacks.onClose();
    }
  }

  async connect(
    callbacks: GeminiServiceCallbacks,
    systemInstruction: string,
  ): Promise<void> {
    try {
      this.callbacks = callbacks;
      this.isDisconnecting = false;

      // 1. Initialize Audio Contexts with Fallback
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;

      // Output context (User hears AI)
      this.audioContext = new AudioContextClass({ sampleRate: 24000 });

      // Input context (User speaks to AI)
      // We try 16k, but browsers often ignore this and give hardware rate (e.g. 48k or 44.1k)
      // We handle resampling manually in audioUtils.
      try {
        this.inputAudioContext = new AudioContextClass({ sampleRate: 16000 });
      } catch (e) {
        console.warn(
          "Could not enforce 16k sample rate, falling back to system default.",
        );
        this.inputAudioContext = new AudioContextClass();
      }

      // 2. CRITICAL: Resume AudioContext immediately (Relies on being called from UI event)
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }
      if (
        this.inputAudioContext &&
        this.inputAudioContext.state === "suspended"
      ) {
        await this.inputAudioContext.resume();
      }

      // 3. Setup Audio Analyser for Visuals (Output)
      if (this.audioContext) {
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.5;
        this.analyser.connect(this.audioContext.destination);
        this.startVisualizerLoop(callbacks.onAudioData);
      }

      // 4. Connect to backend websocket relay
      const socketUrl = this.buildSocketUrl();
      this.socket = new WebSocket(socketUrl);

      this.socket.onopen = async () => {
        try {
          await this.startAudioInputStream();
        } catch (micError: any) {
          callbacks.onError(
            new Error("Microphone Access Failed: " + micError.message),
          );
          void this.disconnect();
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data)) as ProxyServerMessage;
          if (payload.type === "ready") {
            this.sendProxyMessage({
              type: "init",
              systemInstruction,
            });
          } else {
            this.handleServerMessage(payload);
          }
        } catch (e: any) {
          callbacks.onError(new Error(e.message || "Invalid server payload"));
        }
      };

      this.socket.onclose = () => {
        if (this.isDisconnecting) return;
        callbacks.onClose();
      };

      this.socket.onerror = () => {
        callbacks.onError(new Error("WebSocket transport error"));
      };
    } catch (e: any) {
      console.error("Connection failed", e);
      callbacks.onError(
        new Error(e.message || "Connection failed initialization"),
      );
    }
  }

  private startVisualizerLoop(onAudioData: (vol: number) => void) {
    if (this.visualizerInterval) clearInterval(this.visualizerInterval);

    this.visualizerInterval = window.setInterval(() => {
      if (!this.analyser) return;

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      const binCount = Math.floor(dataArray.length / 2);
      for (let i = 0; i < binCount; i++) {
        sum += dataArray[i];
      }
      const average = sum / binCount;
      const volume = Math.min(100, average * 1.5);

      onAudioData(volume);
    }, 40);
  }

  private async startAudioInputStream() {
    if (!this.inputAudioContext) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
          sampleRate: 16000, // Try to hint browser
        },
      });

      // CRITICAL CHECK: Verify context still exists after async permission grant
      // The session might have been disconnected while waiting for permission.
      if (!this.inputAudioContext) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      this.source = this.inputAudioContext.createMediaStreamSource(stream);

      // Create Gain Node to boost volume significantly (3.0x) to ensure VAD triggers
      this.inputGain = this.inputAudioContext.createGain();
      this.inputGain.gain.value = 3.0;

      // Buffer size 1024 reduces audio latency for real-time interaction
      this.scriptProcessor = this.inputAudioContext.createScriptProcessor(
        1024,
        1,
        1,
      );

      const currentSampleRate = this.inputAudioContext.sampleRate;
      console.log(`Microphone initialized at ${currentSampleRate}Hz.`);

      this.scriptProcessor.onaudioprocess = (e) => {
        if (
          !this.sessionReady ||
          !this.socket ||
          this.socket.readyState !== WebSocket.OPEN
        )
          return;

        let inputData = e.inputBuffer.getChannelData(0);

        // Mute Logic: Send silence if muted
        if (this.isMuted) {
          inputData = new Float32Array(inputData.length);
        }

        // CRITICAL FIX: Pass the ACTUAL sample rate to the blob creator for resampling
        const pcmBlob = createPcmBlob(inputData, currentSampleRate);

        this.sendProxyMessage({
          type: "audio",
          data: pcmBlob.data,
          mimeType: pcmBlob.mimeType,
        });
      };

      // Connect graph: Source -> Gain -> Processor -> Dest
      this.source.connect(this.inputGain);
      this.inputGain.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.inputAudioContext.destination);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      throw err; // Propagate to caller
    }
  }

  sendVideoFrame(base64Data: string) {
    if (!this.sessionReady) return;

    this.sendProxyMessage({
      type: "video",
      mimeType: "image/jpeg",
      data: base64Data,
    });
  }

  private playAudio(buffer: AudioBuffer) {
    if (!this.audioContext) return;

    // Ensure we don't drift too far behind
    if (this.nextStartTime < this.audioContext.currentTime) {
      this.nextStartTime = this.audioContext.currentTime;
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;

    if (this.analyser) {
      source.connect(this.analyser);
    } else {
      source.connect(this.audioContext.destination);
    }

    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
  }

  async disconnect() {
    this.isDisconnecting = true;

    if (this.visualizerInterval) {
      clearInterval(this.visualizerInterval);
      this.visualizerInterval = null;
    }

    if (this.source) {
      try {
        this.source.disconnect();
        this.source.mediaStream.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      this.source = null;
    }
    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch (e) {}
      this.scriptProcessor = null;
    }

    if (this.inputAudioContext) {
      try {
        await this.inputAudioContext.close();
      } catch (e) {}
      this.inputAudioContext = null;
    }

    if (this.audioContext) {
      try {
        await this.audioContext.close();
      } catch (e) {}
      this.audioContext = null;
    }

    if (this.socket) {
      try {
        this.sendProxyMessage({ type: "close" });
        this.socket.close(1000, "client_disconnect");
      } catch (e) {}
      this.socket = null;
    }

    this.sessionReady = false;
    this.analyser = null;
    this.isMuted = false;
    this.callbacks = null;
    this.isDisconnecting = false;
  }
}
