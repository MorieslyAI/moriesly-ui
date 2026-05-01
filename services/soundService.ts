
export class GeigerService {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private nextClickTime: number = 0;
  private intensity: number = 0; // 0 to 100 (Sugar level)

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  public setIntensity(grams: number) {
    // Cap intensity at 50g for max effect
    this.intensity = Math.min(grams, 60); 
  }

  public start() {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.isPlaying = true;
    this.scheduleClicks();
  }

  public stop() {
    this.isPlaying = false;
    this.intensity = 0;
  }

  private scheduleClicks() {
    if (!this.isPlaying || !this.ctx) return;

    while (this.nextClickTime < this.ctx.currentTime + 0.1) {
      this.playClick(this.nextClickTime);
      
      // Calculate delay based on intensity (sugar amount)
      // Low sugar = slow clicks (random 0.1s to 1.0s)
      // High sugar = rapid fire (random 0.01s to 0.05s)
      
      let maxDelay = 0.8;
      let minDelay = 0.1;

      if (this.intensity > 5) {
        // As intensity rises, delay shrinks drastically
        const factor = Math.min(this.intensity / 40, 1); // 0 to 1
        maxDelay = 0.8 - (factor * 0.75); // 0.8 -> 0.05
        minDelay = 0.1 - (factor * 0.09); // 0.1 -> 0.01
      }

      const randomDelay = Math.random() * (maxDelay - minDelay) + minDelay;
      this.nextClickTime += randomDelay;
    }
    
    // Keep scheduling
    const timer = window.setTimeout(() => this.scheduleClicks(), 25);
  }

  private playClick(time: number) {
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // Geiger clicks are usually short bursts of white noise or square waves
    osc.type = 'square';
    
    // Vary frequency slightly for realism
    osc.frequency.value = 100 + Math.random() * 50; 

    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.005); // Extremely short

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.01);
  }
}

export const geiger = new GeigerService();
