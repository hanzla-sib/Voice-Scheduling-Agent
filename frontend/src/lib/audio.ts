const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

export class AudioCapture {
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  onAudioData: ((b64: string) => void) | null = null;

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: INPUT_SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    this.context = new AudioContext({ sampleRate: INPUT_SAMPLE_RATE });

    await this.context.audioWorklet.addModule(
      createWorkletURL()
    );

    this.workletNode = new AudioWorkletNode(this.context, "pcm-processor");
    this.workletNode.port.onmessage = (event: MessageEvent) => {
      const pcmData = event.data as Int16Array;
      const bytes = new Uint8Array(pcmData.buffer);
      const b64 = uint8ToBase64(bytes);
      this.onAudioData?.(b64);
    };

    this.source = this.context.createMediaStreamSource(this.stream);
    this.source.connect(this.workletNode);
  }

  stop() {
    this.workletNode?.disconnect();
    this.source?.disconnect();
    this.context?.close();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.context = null;
    this.workletNode = null;
    this.source = null;
  }
}

export class AudioPlayer {
  private context: AudioContext | null = null;
  private nextStartTime = 0;

  constructor() {
    this.context = new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
  }

  play(b64: string) {
    if (!this.context) return;

    const bytes = base64ToUint8(b64);
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const buffer = this.context.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
    buffer.getChannelData(0).set(float32);

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);

    const now = this.context.currentTime;
    const start = Math.max(now, this.nextStartTime);
    source.start(start);
    this.nextStartTime = start + buffer.duration;
  }

  stop() {
    this.nextStartTime = 0;
    this.context?.close();
    this.context = null;
  }
}

function createWorkletURL(): string {
  const code = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    this._chunkSize = 2048;
  }
  process(inputs) {
    const input = inputs[0];
    if (input.length === 0) return true;
    const channel = input[0];
    for (let i = 0; i < channel.length; i++) {
      const s = Math.max(-1, Math.min(1, channel[i]));
      this._buffer.push(s < 0 ? s * 0x8000 : s * 0x7FFF);
    }
    while (this._buffer.length >= this._chunkSize) {
      const chunk = new Int16Array(this._buffer.splice(0, this._chunkSize));
      this.port.postMessage(chunk);
    }
    return true;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
`;
  const blob = new Blob([code], { type: "application/javascript" });
  return URL.createObjectURL(blob);
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
