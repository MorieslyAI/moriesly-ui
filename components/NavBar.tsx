
import React, { useState } from 'react';
import { Home, Compass, Calendar, MessageSquare, User } from 'lucide-react';

interface NavBarProps {
  currentView: 'dashboard' | 'camera' | 'diet' | 'consultant' | 'tracker' | 'history' | 'blog' | 'training' | 'medical' | 'settings' | 'devices' | 'profile' | 'notifications' | 'status' | 'track' | 'calendar' | 'chat' | 'explore';
  onChangeView: (view: 'dashboard' | 'camera' | 'diet' | 'consultant' | 'tracker' | 'history' | 'blog' | 'training' | 'medical' | 'settings' | 'devices' | 'profile' | 'notifications' | 'status' | 'track' | 'calendar' | 'chat' | 'explore') => void;
}

const NavBar: React.FC<NavBarProps> = ({ currentView, onChangeView }) => {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 dark:border-zinc-900 px-4 pb-2 pt-2 z-[90] h-16 rounded-t-[1.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
      
      {/* Grid Layout for Balance */}
      <div className="grid grid-cols-2 h-full relative">
        
        {/* Left Side (2 Items) */}
        <div className="flex justify-evenly items-end pr-10 pl-2">
            <button 
                onClick={() => onChangeView('dashboard')}
                className={`flex flex-col items-center gap-0.5 w-14 mb-1 transition-colors ${currentView === 'dashboard' ? 'text-brand-500' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
            >
                <Home className="w-6 h-6" strokeWidth={currentView === 'dashboard' ? 2.5 : 2} fill={currentView === 'dashboard' ? "currentColor" : "none"} />
                <span className="text-[10px] font-medium">Home</span>
            </button>

            <button 
                onClick={() => onChangeView('explore')}
                className={`flex flex-col items-center gap-0.5 w-14 mb-1 transition-colors ${currentView === 'explore' ? 'text-brand-500' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
            >
                <Compass className="w-6 h-6" strokeWidth={currentView === 'explore' ? 2.5 : 2} fill={currentView === 'explore' ? "currentColor" : "none"} />
                <span className="text-[10px] font-medium">Explore</span>
            </button>
        </div>

        {/* Right Side (2 Items) */}
        <div className="flex justify-evenly items-end pl-10 pr-2">
            <button 
                onClick={() => onChangeView('calendar')}
                className={`flex flex-col items-center gap-0.5 w-14 mb-1 transition-colors ${currentView === 'calendar' ? 'text-brand-500' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
            >
                <Calendar className="w-6 h-6" strokeWidth={currentView === 'calendar' ? 2.5 : 2} />
                <span className="text-[10px] font-medium">History</span>
            </button>

            <button 
                onClick={() => onChangeView('profile')}
                className={`flex flex-col items-center gap-0.5 w-14 mb-1 transition-colors ${currentView === 'profile' ? 'text-brand-500' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
            >
                <User className="w-6 h-6" strokeWidth={currentView === 'profile' ? 2.5 : 2} fill={currentView === 'profile' ? "currentColor" : "none"} />
                <span className="text-[10px] font-medium">Profile</span>
            </button>
        </div>

        {/* Center Camera Button (Absolute) */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-6">
            <button 
                onClick={() => onChangeView('camera')}
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl shadow-teal-900/40 border-[4px] border-white dark:border-zinc-950 transition-transform active:scale-95 bg-gradient-to-b from-[#33ADAE] to-[#1F6E6C] text-white hover:scale-105 group"
            >
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="group-hover:rotate-90 transition-transform duration-500 ease-out">
                    {/* Center Dot (Slightly Larger) */}
                    <circle cx="12" cy="12" r="1.6" fill="white" />

                    {/* Inner 3x3 Ring (Standard Size) */}
                    <circle cx="8" cy="8" r="1.3" fill="white" />
                    <circle cx="12" cy="8" r="1.3" fill="white" />
                    <circle cx="16" cy="8" r="1.3" fill="white" />
                    <circle cx="8" cy="12" r="1.3" fill="white" />
                    <circle cx="16" cy="12" r="1.3" fill="white" />
                    <circle cx="8" cy="16" r="1.3" fill="white" />
                    <circle cx="12" cy="16" r="1.3" fill="white" />
                    <circle cx="16" cy="16" r="1.3" fill="white" />

                    {/* Outer Cross (Smaller, Semi-transparent) */}
                    <circle cx="12" cy="4" r="1.0" fill="white" fillOpacity="0.7" />
                    <circle cx="12" cy="20" r="1.0" fill="white" fillOpacity="0.7" />
                    <circle cx="4" cy="12" r="1.0" fill="white" fillOpacity="0.7" />
                    <circle cx="20" cy="12" r="1.0" fill="white" fillOpacity="0.7" />

                    {/* Outer Edges (Smaller, Faded) */}
                    <circle cx="8" cy="4" r="0.9" fill="white" fillOpacity="0.6" />
                    <circle cx="16" cy="4" r="0.9" fill="white" fillOpacity="0.6" />
                    <circle cx="4" cy="8" r="0.9" fill="white" fillOpacity="0.6" />
                    <circle cx="20" cy="8" r="0.9" fill="white" fillOpacity="0.6" />
                    <circle cx="4" cy="16" r="0.9" fill="white" fillOpacity="0.6" />
                    <circle cx="20" cy="16" r="0.9" fill="white" fillOpacity="0.6" />
                    <circle cx="8" cy="20" r="0.9" fill="white" fillOpacity="0.6" />
                    <circle cx="16" cy="20" r="0.9" fill="white" fillOpacity="0.6" />

                    {/* Extreme Corners (Tiny, Blurred/Faint) */}
                    <circle cx="4" cy="4" r="0.6" fill="white" fillOpacity="0.3" />
                    <circle cx="20" cy="4" r="0.6" fill="white" fillOpacity="0.3" />
                    <circle cx="4" cy="20" r="0.6" fill="white" fillOpacity="0.3" />
                    <circle cx="20" cy="20" r="0.6" fill="white" fillOpacity="0.3" />
                </svg>
            </button>
        </div>

      </div>
    </div>
  );
};

export default NavBar;

