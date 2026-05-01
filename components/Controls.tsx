import React from 'react';
import { ConnectionState } from '../types';

interface ControlsProps {
  connectionState: ConnectionState;
  onConnect: () => void;
  onDisconnect: () => void;
}

const Controls: React.FC<ControlsProps> = ({ connectionState, onConnect, onDisconnect }) => {
  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isConnecting = connectionState === ConnectionState.CONNECTING;

  return (
    <div className="flex items-center justify-between p-4 bg-slate-900 border-t border-slate-800">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${
          isConnected ? 'bg-red-500 animate-pulse' : 
          isConnecting ? 'bg-yellow-500 animate-bounce' : 'bg-slate-500'
        }`} />
        <span className="text-sm font-mono text-slate-400 uppercase">
          {connectionState}
        </span>
      </div>

      {!isConnected ? (
        <button
          onClick={onConnect}
          disabled={isConnecting}
          className={`px-6 py-2 rounded-full font-bold uppercase tracking-wider transition-all
            ${isConnecting 
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
              : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_20px_rgba(8,145,178,0.4)]'
            }`}
        >
          {isConnecting ? 'Initializing...' : 'Activate Spy'}
        </button>
      ) : (
        <button
          onClick={onDisconnect}
          className="px-6 py-2 rounded-full font-bold uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all"
        >
          Terminate
        </button>
      )}
    </div>
  );
};

export default Controls;