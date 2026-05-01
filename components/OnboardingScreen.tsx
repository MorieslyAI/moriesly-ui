
import React, { useState, useEffect } from 'react';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const slides = [
  {
    id: 'identity',
    subtitle: 'METABOLIC INTELLIGENCE',
    title: 'FUEL YOUR\nAMBITION',
    desc: 'Your body is an engine. Moriesly AI analyzes every calorie to ensure you are fueling for peak human performance.',
    // Image: Determined runner in urban setting, high contrast
    image: 'https://images.unsplash.com/photo-1594882645126-14020914d58d?q=80&w=1920&auto=format&fit=crop',
    overlayColor: 'from-zinc-900 via-zinc-900/40 to-transparent'
  },
  {
    id: 'scan',
    subtitle: 'DECODE THE INVISIBLE',
    title: 'EAT REAL.\nFEEL POWERFUL.',
    desc: 'Point your camera at any food. We expose hidden sugars and chemical loads instantly so you can choose real fuel.',
    // Image: Vibrant healthy food bowl with dark background
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1920&auto=format&fit=crop',
    overlayColor: 'from-teal-950/90 via-black/50 to-transparent',
    hasScanEffect: true
  },
  {
    id: 'optimize',
    subtitle: 'DATA-DRIVEN DISCIPLINE',
    title: 'BUILD YOUR\nLEGACY',
    desc: 'Track glycemic load, recovery metrics, and burn rates. Join the elite few who master their biology.',
    // Image: Intense gym/crossfit setting
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1920&auto=format&fit=crop',
    overlayColor: 'from-rose-950/90 via-black/50 to-transparent'
  }
];

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
      setLoaded(true);
  }, []);

  const handleNext = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    setTimeout(() => {
        if (currentIndex < slides.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            onComplete();
        }
        setIsAnimating(false);
    }, 600); // Transition duration matching CSS
  };

  const activeSlide = slides[currentIndex];

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col font-sans overflow-hidden">
      
      {/* BACKGROUND IMAGE LAYER */}
      <div className="absolute inset-0 z-0">
          {slides.map((slide, idx) => (
              <div 
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                    idx === currentIndex ? 'opacity-100' : 'opacity-0'
                }`}
              >
                  {/* The Image with Slow Ken Burns Zoom Effect */}
                  <div className={`w-full h-full transform transition-transform duration-[15000ms] ease-out ${idx === currentIndex ? 'scale-110' : 'scale-100'}`}>
                      <img 
                        src={slide.image} 
                        alt="Background" 
                        className="w-full h-full object-cover brightness-[0.8] contrast-125"
                      />
                  </div>
                  
                  {/* Cinematic Gradient Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${slide.overlayColor} opacity-100`}></div>
                  
                  {/* Film Grain Texture for Premium Feel */}
                  <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay pointer-events-none" 
                       style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
                  </div>
              </div>
          ))}
      </div>

      {/* SPECIAL EFFECTS LAYER (Scanner Line) */}
      {activeSlide.hasScanEffect && (
          <div className="absolute inset-0 z-10 pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-teal-400 shadow-[0_0_20px_#2dd4bf] animate-[scan-down_3s_ease-in-out_infinite]"></div>
              <div className="absolute inset-0 bg-[linear-gradient(rgba(45,212,191,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-30"></div>
          </div>
      )}

      {/* TOP BAR */}
      <div className="relative z-20 w-full px-6 pt-8 flex justify-between items-center">
          <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/10 backdrop-blur-md rounded-lg flex items-center justify-center border border-white/20">
                  <img 
                    src="https://i.ibb.co.com/hJYKch5n/Logo-Moriesly-remove-bg.png" 
                    alt="Logo" 
                    className="w-5 h-5 object-contain drop-shadow-md"
                  />
              </div>
              <span className="font-black text-xs tracking-[0.2em] text-white/90">MORIESLY AI</span>
          </div>
          <button 
            onClick={onComplete}
            className="text-[10px] font-bold text-white/50 hover:text-white uppercase tracking-widest transition-colors"
          >
              Skip
          </button>
      </div>

      {/* CONTENT AREA */}
      <div className="relative z-20 flex-1 flex flex-col justify-end px-6 pb-12">
          
          <div className={`transition-all duration-700 transform ${isAnimating ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'}`}>
              
              {/* Subtitle with Animated Line */}
              <div className="flex items-center gap-3 mb-4 overflow-hidden">
                  <div className="w-8 h-[2px] bg-teal-500 animate-in slide-in-from-left duration-700"></div>
                  <p className="text-teal-400 font-bold text-xs uppercase tracking-[0.25em] animate-in slide-in-from-bottom duration-700 delay-100">
                      {activeSlide.subtitle}
                  </p>
              </div>

              {/* Huge Typography Title */}
              <h1 className="text-6xl md:text-7xl font-black text-white leading-[0.85] tracking-tighter mb-6 uppercase drop-shadow-2xl whitespace-pre-line animate-in slide-in-from-bottom duration-700 delay-200">
                  {activeSlide.title}
              </h1>

              <p className="text-zinc-300 text-sm font-medium leading-relaxed max-w-sm mb-10 text-pretty drop-shadow-md animate-in fade-in duration-1000 delay-300">
                  {activeSlide.desc}
              </p>

              {/* Progress & Navigation */}
              <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                      {slides.map((_, idx) => (
                          <div 
                            key={idx} 
                            className={`h-1 rounded-full transition-all duration-500 ease-out ${idx === currentIndex ? 'w-12 bg-white' : 'w-2 bg-white/20'}`}
                          ></div>
                      ))}
                  </div>

                  {/* High Tech Button */}
                  <button
                    onClick={handleNext}
                    className="group relative flex items-center justify-center w-16 h-16 rounded-full border border-white/20 bg-white/5 backdrop-blur-md transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
                  >
                      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white border-r-white opacity-0 group-hover:opacity-100 transition-all duration-700 rotate-0 group-hover:rotate-180"></div>
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                  </button>
              </div>

          </div>
      </div>

      <style>{`
        @keyframes scan-down {
            0% { top: -10%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 110%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default OnboardingScreen;
