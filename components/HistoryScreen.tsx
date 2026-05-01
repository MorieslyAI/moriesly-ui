
import React, { useState, useMemo } from 'react';
import { HistoryItem } from '../types';
import { Plus, Dumbbell, Wheat, Droplet, Leaf, FlaskConical, X, Activity, Flame, Zap, Info, Clock, Calendar, ChevronRight, ChevronLeft, Search, Filter, Share2, Download, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import MetabolicInvoice from './MetabolicInvoice';
import SugarPile from './SugarPile';
import BurnMeter from './BurnMeter';
import GlucosePredictor from './GlucosePredictor';
import OrganMap from './OrganMap';
import ReceiptAnalysis from './ReceiptAnalysis';
import VersusArena from './VersusArena';
import DeceptionDetector from './DeceptionDetector';

interface HistoryScreenProps {
  history: HistoryItem[];
  onExport: () => void;
  onUpdateHistoryItem: (updatedItem: HistoryItem) => void;
  onScanAddOn: (item: HistoryItem) => void;
  onTextAddOn: (itemId: string, text: string) => Promise<any>;
}

const HistoryScreen: React.FC<HistoryScreenProps> = ({ history, onExport, onUpdateHistoryItem, onScanAddOn, onTextAddOn }) => {
  const [filter, setFilter] = useState<'all' | 'consumed' | 'rejected' | 'scanned'>('all');
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editMacros, setEditMacros] = useState({ protein: 0, carbs: 0, fat: 0, fiber: 0 });
  const [addOnText, setAddOnText] = useState('');
  const [showAddOnOptions, setShowAddOnOptions] = useState(false);
  const [isProcessingAddOn, setIsProcessingAddOn] = useState(false);
  const [addOnResult, setAddOnResult] = useState<any>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  
  // New State for View Mode and Sorting
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');
  const [sortConfig, setSortConfig] = useState<{ key: keyof HistoryItem; direction: 'asc' | 'desc' }>({ key: 'timestamp', direction: 'desc' });
  
  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      // Date Filter
      if (selectedDate) {
        const itemDate = new Date(item.timestamp);
        if (itemDate.toDateString() !== selectedDate.toDateString()) {
            return false;
        }
      }

      if (filter === 'all') return true;
      return item.action === filter;
    });
  }, [history, filter, selectedDate]);

  // --- Table Sorting Logic ---
  const sortedTableData = useMemo(() => {
    const sortableItems = [...filteredHistory];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any = a[sortConfig.key];
        let bValue: any = b[sortConfig.key];

        // Special handling for timestamp sorting
        if (sortConfig.key === 'timestamp') {
            aValue = new Date(a.timestamp).getTime();
            bValue = new Date(b.timestamp).getTime();
        }
        
        // Handle undefined values safely
        if (aValue === undefined && bValue === undefined) return 0;
        if (aValue === undefined) return 1;
        if (bValue === undefined) return -1;

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredHistory, sortConfig]);

  const handleSort = (key: keyof HistoryItem) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // --- List Grouping Logic ---
  const groupedHistory = useMemo<Record<string, HistoryItem[]>>(() => {
    const groups: Record<string, HistoryItem[]> = {};
    filteredHistory.forEach(item => {
      const dateKey = new Date(item.timestamp).toDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(item);
    });
    return groups;
  }, [filteredHistory]);

  const sortedHistoryEntries = useMemo(() => {
    return Object.entries(groupedHistory).sort((a,b) => 
        new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  }, [groupedHistory]);

  // Helper to get item icon
  const getItemIcon = (type?: string) => {
      switch(type) {
          case 'receipt': return '🧾';
          case 'versus': return '⚔️';
          case 'skin': return '🧬';
          case 'label': return '🔍';
          case 'drink': return '🥤';
          default: return '🍎';
      }
  };

  return (
    <div className="pb-24 px-4 md:px-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* --- FULL SCREEN IMAGE MODAL --- */}
      {fullScreenImage && (
          <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300" onClick={() => setFullScreenImage(null)}>
              <div className="relative max-w-full max-h-full">
                  <img src={`data:image/jpeg;base64,${fullScreenImage}`} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" alt="Full Evidence" />
                  <button 
                    onClick={() => setFullScreenImage(null)}
                    className="absolute top-[-40px] right-0 md:top-4 md:right-4 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md transition-all"
                  >
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
              </div>
          </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 md:p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm mb-6 relative overflow-hidden">
         <div className="absolute top-0 right-0 p-3 opacity-10">
             <svg className="w-24 h-24 md:w-32 md:h-32 text-zinc-900 dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
         </div>
         <div className="relative z-10">
             <div className="mb-4 md:mb-6">
                 <h2 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white mb-1 uppercase tracking-tight">Mission Log</h2>
                 <p className="text-zinc-500 dark:text-zinc-400 text-xs md:text-sm">Comprehensive archive of all detected substances.</p>
             </div>
             
             <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                 <div className="flex gap-1 md:gap-2 bg-zinc-100 dark:bg-black/30 p-1 rounded-xl w-full md:w-fit overflow-x-auto scrollbar-hide">
                     {(['all', 'consumed', 'rejected', 'scanned'] as const).map(f => (
                         <button 
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-3 md:px-4 py-2 rounded-lg text-[10px] md:text-xs font-bold uppercase transition-all whitespace-nowrap flex-1 md:flex-none ${
                                filter === f 
                                ? 'bg-white dark:bg-white text-black shadow-lg' 
                                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-white/10'
                            }`}
                         >
                             {f}
                         </button>
                     ))}
                 </div>
             </div>
         </div>
      </div>

      {/* --- CALENDAR WIDGET --- */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-4 md:p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500">
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                </div>
                <div>
                    <h3 className="text-xs md:text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wide">Time Travel</h3>
                    <p className="text-[10px] md:text-xs text-zinc-500">Filter logs by date</p>
                </div>
            </div>

            <div className="flex items-center gap-1 md:gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-full p-1">
                <button 
                    onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
                    className="p-1.5 md:p-2 rounded-full hover:bg-white dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all shadow-sm"
                >
                    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="text-[10px] md:text-xs font-bold text-zinc-700 dark:text-zinc-300 w-20 md:w-24 text-center select-none">
                    {currentMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
                <button 
                    onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
                    className="p-1.5 md:p-2 rounded-full hover:bg-white dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all shadow-sm"
                >
                    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
        </div>

        <div className="grid grid-cols-7 gap-1 md:gap-2 mb-4">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-center text-[9px] md:text-[10px] font-bold text-zinc-400 uppercase py-1 md:py-2">{day}</div>
            ))}
            
            {(() => {
                const year = currentMonth.getFullYear();
                const month = currentMonth.getMonth();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const firstDay = new Date(year, month, 1).getDay();
                const days = [];

                // Empty cells
                for (let i = 0; i < firstDay; i++) {
                    days.push(<div key={`empty-${i}`} />);
                }

                // Days
                for (let i = 1; i <= daysInMonth; i++) {
                    const date = new Date(year, month, i);
                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                    const isToday = new Date().toDateString() === date.toDateString();
                    
                    // Check for data
                    const dayData = history.filter(h => new Date(h.timestamp).toDateString() === date.toDateString());
                    const hasData = dayData.length > 0;
                    const hasIssues = dayData.some(h => h.action === 'rejected' || (h.sugarg || 0) > 20);

                    days.push(
                        <button
                            key={i}
                            onClick={() => setSelectedDate(isSelected ? null : date)}
                            className={`w-full aspect-square rounded-lg md:rounded-xl flex flex-col items-center justify-center text-[10px] md:text-xs font-bold transition-all relative group ${
                                isSelected
                                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-lg scale-105 z-10'
                                : hasData
                                    ? 'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                    : 'text-zinc-300 dark:text-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
                            } ${isToday && !isSelected ? 'border-2 border-teal-500' : ''}`}
                        >
                            {i}
                            {hasData && !isSelected && (
                                <div className={`absolute bottom-1 md:bottom-2 w-1 h-1 rounded-full ${hasIssues ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                            )}
                        </button>
                    );
                }
                return days;
            })()}
        </div>
        
        {selectedDate && (
            <div className="flex justify-center">
                <button 
                    onClick={() => setSelectedDate(null)}
                    className="text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 transition-colors"
                >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    Clear Filter
                </button>
            </div>
        )}
      </div>

      {/* --- CONTROLS: VIEW TOGGLE & EXPORT --- */}
      <div className="flex justify-end gap-2 mb-4">
          {/* View Toggle */}
          <div className="bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl flex border border-zinc-200 dark:border-zinc-700">
              <button 
                  onClick={() => setViewMode('list')} 
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                  title="List View"
              >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <button 
                  onClick={() => setViewMode('table')} 
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
                  title="Table View"
              >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7-4h14M4 6h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" /></svg>
              </button>
          </div>

          <button 
              onClick={onExport}
              className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all active:scale-95 border border-zinc-200 dark:border-zinc-700 shadow-sm group"
          >
              <svg className="w-4 h-4 group-hover:text-teal-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span className="hidden md:inline">Export CSV</span>
          </button>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
          <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white dark:bg-zinc-950 w-full max-w-lg md:max-w-4xl max-h-[90vh] rounded-3xl overflow-y-auto border border-zinc-200 dark:border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-200">
                  
                  {/* --- SPECIALIZED CONTENT BASED ON TYPE --- */}
                  {selectedItem.itemType === 'receipt' && selectedItem.metadata ? (
                      <div className="relative">
                          <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 z-50 text-zinc-500 hover:text-white"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                          <ReceiptAnalysis data={selectedItem.metadata} onClose={() => setSelectedItem(null)} />
                      </div>
                  ) : selectedItem.itemType === 'versus' && selectedItem.metadata ? (
                      <div className="relative">
                          <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 z-50 text-zinc-500 hover:text-white"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                          <VersusArena data={selectedItem.metadata} onClose={() => setSelectedItem(null)} />
                      </div>
                  ) : selectedItem.itemType === 'label' && selectedItem.metadata ? (
                      <div className="relative">
                          <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 z-50 text-zinc-500 hover:text-white"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                          <DeceptionDetector data={selectedItem.metadata} onClose={() => setSelectedItem(null)} />
                      </div>
                  ) : (
                      <>
                        <div className="relative h-48 md:h-72 bg-black flex-shrink-0 group">
                            {selectedItem.imageBase64 ? (
                                <>
                                    <img 
                                        src={`data:image/jpeg;base64,${selectedItem.imageBase64}`} 
                                        className="w-full h-full object-cover opacity-80 cursor-zoom-in transition-opacity group-hover:opacity-100" 
                                        alt="Scan Evidence"
                                        onClick={() => setFullScreenImage(selectedItem.imageBase64 || null)} 
                                    />
                                    <button
                                        onClick={() => setFullScreenImage(selectedItem.imageBase64 || null)}
                                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white px-4 py-2 rounded-full backdrop-blur-md border border-white/20 opacity-0 group-hover:opacity-100 transition-all transform scale-95 group-hover:scale-100 flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                                        <span className="text-xs font-bold uppercase tracking-wide">View Full Image</span>
                                    </button>
                                </>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">No Image Evidence</div>
                            )}
                            
                            <button 
                                onClick={() => setSelectedItem(null)}
                                className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-black transition-colors backdrop-blur-sm z-20"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            
                            <div className="absolute bottom-4 left-4 z-10">
                                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                                    selectedItem.action === 'consumed' 
                                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/50' 
                                    : selectedItem.action === 'rejected'
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50'
                                    : 'bg-indigo-500 text-white shadow-lg'
                                }`}>
                                    {selectedItem.action}
                                </span>
                            </div>
                        </div>

                        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                            {/* --- HEADER: TIME & TYPE --- */}
                            <div className="flex items-center gap-3 mb-1">
                                <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                                    {selectedItem.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                                    selectedItem.itemType === 'drink' 
                                    ? 'bg-blue-50 text-blue-600 border-blue-100' 
                                    : 'bg-orange-50 text-orange-600 border-orange-100'
                                }`}>
                                    {selectedItem.itemType || 'FOOD'}
                                </span>
                            </div>
                            
                            {/* --- TITLE --- */}
                            <h2 className="text-xl font-black text-zinc-900 dark:text-white leading-tight mb-2">{selectedItem.name}</h2>

                            {/* --- ACTION BADGE --- */}
                            <div className="flex justify-between items-center mb-6">
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-block ${
                                    selectedItem.action === 'consumed' 
                                    ? 'bg-rose-100 text-rose-600' 
                                    : selectedItem.action === 'rejected'
                                    ? 'bg-emerald-100 text-emerald-600'
                                    : 'bg-indigo-100 text-indigo-600'
                                }`}>
                                    {selectedItem.action}
                                </span>
                                {selectedItem.action === 'consumed' && !isEditing && (
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setShowAddOnOptions(!showAddOnOptions)}
                                            className="text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-50 dark:bg-teal-900/20 px-3 py-1 rounded-full"
                                        >
                                            + ADD-ON
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setIsEditing(true);
                                                setEditMacros(selectedItem.macros || { protein: 0, carbs: 0, fat: 0, fiber: 0 });
                                            }}
                                            className="text-xs font-bold text-zinc-500 hover:text-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full"
                                        >
                                            EDIT
                                        </button>
                                    </div>
                                )}
                            </div>

                            {showAddOnOptions && !isEditing && (
                                <div className="bg-teal-50 dark:bg-teal-900/10 p-4 rounded-2xl mb-6 border border-teal-100 dark:border-teal-900/30 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-xs font-black text-teal-800 dark:text-teal-400 uppercase tracking-wider">Add-on Options</h3>
                                        <button onClick={() => setShowAddOnOptions(false)} className="text-teal-400 hover:text-teal-600"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <button 
                                            onClick={() => {
                                                onScanAddOn(selectedItem);
                                                setSelectedItem(null);
                                            }}
                                            className="flex flex-col items-center justify-center p-3 bg-white dark:bg-zinc-900 rounded-xl border border-teal-100 dark:border-teal-900/30 hover:border-teal-500 transition-colors group"
                                        >
                                            <svg className="w-6 h-6 text-teal-500 mb-1 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase">Re-capture</span>
                                        </button>
                                        <button 
                                            onClick={() => {
                                                // Focus text input
                                                const input = document.getElementById('addon-text-input');
                                                input?.focus();
                                            }}
                                            className="flex flex-col items-center justify-center p-3 bg-white dark:bg-zinc-900 rounded-xl border border-teal-100 dark:border-teal-900/30 hover:border-teal-500 transition-colors group"
                                        >
                                            <svg className="w-6 h-6 text-teal-500 mb-1 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase">Type Add-on</span>
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold text-teal-600/60 uppercase tracking-widest">Manual Typing</label>
                                        <div className="relative">
                                            <input 
                                                id="addon-text-input"
                                                type="text" 
                                                disabled={isProcessingAddOn}
                                                placeholder="e.g. 2 tbsp soy sauce, 1 tsp chili sauce"
                                                value={addOnText}
                                                onChange={e => setAddOnText(e.target.value)}
                                                className="w-full bg-white dark:bg-zinc-900 border border-teal-100 dark:border-teal-900/30 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none disabled:opacity-50"
                                            />
                                            <button 
                                                disabled={!addOnText.trim() || isProcessingAddOn}
                                                onClick={async () => {
                                                    setIsProcessingAddOn(true);
                                                    const result = await onTextAddOn(selectedItem!.id, addOnText);
                                                    setIsProcessingAddOn(false);
                                                    if (result) {
                                                        setAddOnResult(result);
                                                        setAddOnText('');
                                                        // Keep options open to show result, or close after timeout
                                                        setTimeout(() => {
                                                            setAddOnResult(null);
                                                            setShowAddOnOptions(false);
                                                            setSelectedItem(null);
                                                        }, 5000);
                                                    }
                                                }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-teal-500 text-white p-1.5 rounded-lg disabled:opacity-50 hover:bg-teal-600 transition-colors"
                                            >
                                                {isProcessingAddOn ? (
                                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {addOnResult && (
                                        <div className="mt-4 p-3 bg-white dark:bg-zinc-900 rounded-xl border border-teal-200 dark:border-teal-800 animate-in zoom-in-95 duration-300">
                                            <div className="text-[10px] font-black text-teal-600 uppercase mb-2 flex items-center gap-2">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                Analysis Complete
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="text-center">
                                                    <div className="text-xs font-black text-zinc-900 dark:text-white">+{addOnResult.calories}</div>
                                                    <div className="text-[8px] font-bold text-zinc-400 uppercase">Kcal</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-xs font-black text-zinc-900 dark:text-white">+{addOnResult.sugar}g</div>
                                                    <div className="text-[8px] font-bold text-zinc-400 uppercase">Sugar</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-xs font-black text-zinc-900 dark:text-white">+{addOnResult.protein}g</div>
                                                    <div className="text-[8px] font-bold text-zinc-400 uppercase">Protein</div>
                                                </div>
                                            </div>
                                            <p className="text-[9px] text-zinc-500 mt-2 italic text-center">Meal stats updated successfully.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {isEditing && (
                                <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-2xl mb-6 space-y-4">
                                    <h3 className="font-black text-sm uppercase tracking-wider">Edit Macros</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {['protein', 'carbs', 'fat', 'fiber'].map(macro => (
                                            <div key={macro}>
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase">{macro}</label>
                                                <input 
                                                    type="number"
                                                    value={editMacros[macro as keyof typeof editMacros]}
                                                    onChange={e => setEditMacros(prev => ({...prev, [macro]: parseFloat(e.target.value) || 0}))}
                                                    className="w-full bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-bold"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => {
                                                const updatedItem = { ...selectedItem, macros: editMacros };
                                                onUpdateHistoryItem(updatedItem);
                                                setSelectedItem(updatedItem);
                                                setIsEditing(false);
                                            }}
                                            className="flex-1 bg-teal-500 text-white py-2 rounded-lg text-xs font-bold uppercase"
                                        >
                                            Save
                                        </button>
                                        <button 
                                            onClick={() => setIsEditing(false)}
                                            className="flex-1 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 py-2 rounded-lg text-xs font-bold uppercase"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* --- TOP STATS CARDS --- */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 p-3 rounded-2xl flex flex-col items-center justify-center border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <svg className="w-8 h-8 text-zinc-500" fill="currentColor" viewBox="0 0 24 24"><path d="M17 19c.55 0 1-.45 1-1v-6c0-.55-.45-1-1-1h-4v-4c0-.55-.45-1-1-1H6c-.55 0-1 .45-1 1v11c0 .55.45 1 1 1h11zM5 19V7h6v5h5v6H5z"/></svg>
                                    </div>
                                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                        Sugar
                                    </span>
                                    <div className="text-xl font-black text-zinc-900 dark:text-white z-10">
                                        {Math.round(selectedItem.sugarg * 10) / 10}<span className="text-xs text-zinc-500 font-medium ml-0.5">g</span>
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 p-3 rounded-2xl flex flex-col items-center justify-center border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <svg className="w-8 h-8 text-zinc-500" fill="currentColor" viewBox="0 0 24 24"><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/></svg>
                                    </div>
                                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                        GI
                                    </span>
                                    <div className={`text-xl font-black z-10 ${
                                        (selectedItem.glycemicIndex || 0) > 70 ? 'text-rose-500' : (selectedItem.glycemicIndex || 0) > 55 ? 'text-amber-500' : 'text-emerald-500'
                                    }`}>
                                        {selectedItem.glycemicIndex || '-'}
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 p-3 rounded-2xl flex flex-col items-center justify-center border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <svg className="w-8 h-8 text-zinc-500" fill="currentColor" viewBox="0 0 24 24"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/></svg>
                                    </div>
                                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>
                                        Cals
                                    </span>
                                    <div className="text-xl font-black text-zinc-900 dark:text-white z-10">
                                        {Math.round((selectedItem.calories || 0) * 10) / 10}
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 p-3 rounded-2xl flex flex-col items-center justify-center border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Dumbbell className="w-8 h-8 text-zinc-500" />
                                    </div>
                                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <Dumbbell className="w-3 h-3" />
                                        Prot
                                    </span>
                                    <div className="text-xl font-black text-zinc-900 dark:text-white z-10">
                                        {Math.round((selectedItem.macros?.protein || 0) * 10) / 10}<span className="text-xs text-zinc-500 font-medium ml-0.5">g</span>
                                    </div>
                                </div>
                            </div>

                            {/* --- MACRO & MICRO NUTRIENTS --- */}
                            {(selectedItem.macros || (selectedItem.vitamins && selectedItem.vitamins.length > 0)) && (
                                <div className="bg-zinc-50 dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-100 dark:border-zinc-800">
                                    
                                    {/* Macros */}
                                    {selectedItem.macros && (
                                        <div className="mb-5">
                                            <div className="flex items-center gap-1.5 mb-3">
                                                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                                                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                                    Macros
                                                </span>
                                            </div>
                                            <div className="h-3 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden flex shadow-inner mb-4">
                                                <div style={{ width: `${(selectedItem.macros.protein / ((selectedItem.macros.protein + selectedItem.macros.carbs + selectedItem.macros.fat + (selectedItem.macros.fiber || 0)) || 1)) * 100}%` }} className="h-full bg-blue-500"></div>
                                                <div style={{ width: `${(selectedItem.macros.carbs / ((selectedItem.macros.protein + selectedItem.macros.carbs + selectedItem.macros.fat + (selectedItem.macros.fiber || 0)) || 1)) * 100}%` }} className="h-full bg-orange-500"></div>
                                                <div style={{ width: `${(selectedItem.macros.fat / ((selectedItem.macros.protein + selectedItem.macros.carbs + selectedItem.macros.fat + (selectedItem.macros.fiber || 0)) || 1)) * 100}%` }} className="h-full bg-rose-500"></div>
                                                {selectedItem.macros.fiber !== undefined && selectedItem.macros.fiber > 0 && (
                                                    <div style={{ width: `${(selectedItem.macros.fiber / ((selectedItem.macros.protein + selectedItem.macros.carbs + selectedItem.macros.fat + selectedItem.macros.fiber) || 1)) * 100}%` }} className="h-full bg-emerald-500"></div>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="flex items-center gap-2.5 bg-white dark:bg-zinc-800/50 p-2.5 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 shadow-sm">
                                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-500/20 text-blue-500">
                                                        <Dumbbell className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Protein</span>
                                                        <span className="text-sm font-black text-zinc-700 dark:text-zinc-200 leading-none">{Math.round(selectedItem.macros.protein * 10) / 10}g</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2.5 bg-white dark:bg-zinc-800/50 p-2.5 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 shadow-sm">
                                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-50 dark:bg-orange-500/20 text-orange-500">
                                                        <Wheat className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Carbs</span>
                                                        <span className="text-sm font-black text-zinc-700 dark:text-zinc-200 leading-none">{Math.round(selectedItem.macros.carbs * 10) / 10}g</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2.5 bg-white dark:bg-zinc-800/50 p-2.5 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 shadow-sm">
                                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-rose-50 dark:bg-rose-500/20 text-rose-500">
                                                        <Droplet className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Fat</span>
                                                        <span className="text-sm font-black text-zinc-700 dark:text-zinc-200 leading-none">{Math.round(selectedItem.macros.fat * 10) / 10}g</span>
                                                    </div>
                                                </div>
                                                {selectedItem.macros.fiber !== undefined && selectedItem.macros.fiber > 0 && (
                                                    <div className="flex items-center gap-2.5 bg-white dark:bg-zinc-800/50 p-2.5 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 shadow-sm">
                                                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-500">
                                                            <Leaf className="w-3.5 h-3.5" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Fiber</span>
                                                            <span className="text-sm font-black text-zinc-700 dark:text-zinc-200 leading-none">{selectedItem.macros.fiber.toFixed(1)}g</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Divider */}
                                    {(selectedItem.macros && selectedItem.vitamins && selectedItem.vitamins.length > 0) && (
                                        <div className="h-px bg-zinc-200 dark:bg-zinc-800 w-full my-4 border-dashed border-t"></div>
                                    )}

                                    {/* Micros */}
                                    {selectedItem.vitamins && selectedItem.vitamins.length > 0 && (
                                        <div>
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                <FlaskConical className="w-3 h-3" />
                                                Specific Nutrients
                                            </span>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                {selectedItem.vitamins.map((v, i) => (
                                                    <div key={i} className="px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm flex flex-col gap-0.5">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase truncate">{v.name}</span>
                                                            <span className="text-[9px] font-black text-brand-600 bg-brand-50 dark:bg-brand-900/20 px-1 rounded">{v.percent}%</span>
                                                        </div>
                                                        <span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-bold">{v.amount}</span>
                                                        <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full mt-1.5">
                                                            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.min(v.percent, 100)}%` }}></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* --- AI VERDICT --- */}
                            <div className="bg-teal-50 dark:bg-teal-900/10 rounded-xl p-4 border-l-2 border-teal-500 relative overflow-hidden">
                                <div className="flex items-center gap-2 mb-1">
                                    <svg className="w-3 h-3 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    <span className="text-teal-700 dark:text-teal-400 text-[10px] font-black uppercase tracking-wider">AI Verdict</span>
                                </div>
                                <p className="text-sm font-medium text-teal-900 dark:text-teal-100 leading-snug">
                                    "{selectedItem.aiVerdict}"
                                </p>
                            </div>

                            {selectedItem.itemType !== 'skin' && (
                                <div className="space-y-4">
                                    <SugarPile grams={selectedItem.sugarg} />
                                    <BurnMeter sugarGrams={selectedItem.sugarg} />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="h-full">
                                            <GlucosePredictor sugar={selectedItem.sugarg} gi={selectedItem.glycemicIndex || 50} />
                                        </div>
                                        <div className="h-full">
                                            <OrganMap 
                                                sugar={selectedItem.sugarg} 
                                                calories={selectedItem.calories}
                                                fat={selectedItem.macros?.fat}
                                                protein={selectedItem.macros?.protein}
                                                fiber={selectedItem.macros?.fiber}
                                                type={selectedItem.itemType === 'drink' ? 'drink' : 'food'} 
                                                impactData={selectedItem.metadata?.organ_impact}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedItem.antidote && (
                                <div className="bg-rose-50 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-200 dark:border-rose-900/50">
                                    <div className="text-[10px] font-bold text-rose-500 uppercase mb-1 flex items-center gap-2">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                        Required Counter-Measure
                                    </div>
                                    <p className="text-sm font-bold text-rose-700 dark:text-rose-400">{selectedItem.antidote}</p>
                                    <div className="text-[10px] text-rose-600/70 dark:text-rose-400/70 mt-1">Recommended to mitigate metabolic crash.</div>
                                </div>
                            )}

                            {selectedItem.itemType !== 'skin' && (
                                <div className="opacity-90 transform scale-95 origin-top">
                                    <MetabolicInvoice 
                                        focusTax={selectedItem.focusTax || 0} 
                                        agingGrade={(selectedItem.agingImpact as any) || 'Low'} 
                                        sleepPenalty='None' 
                                    />
                                </div>
                            )}
                        </div>
                      </>
                  )}
              </div>
          </div>
      )}

      {/* CONTENT: VIEW SWITCHING */}
      {viewMode === 'list' ? (
          /* --- LIST VIEW --- */
          sortedHistoryEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                  <div className="text-4xl mb-4 opacity-30">📂</div>
                  <p>No records found in the archives.</p>
              </div>
          ) : (
              sortedHistoryEntries.map(([date, items]) => (
                  <div key={date} className="mb-6">
                      <div className="sticky top-20 z-10 bg-zinc-50/90 dark:bg-zinc-950/90 backdrop-blur-md py-2 px-4 mb-2 rounded-lg border border-zinc-200 dark:border-zinc-800">
                          <span className="text-xs font-bold uppercase text-zinc-500">{date}</span>
                      </div>
                      
                      <div className="space-y-3">
                          {items.map((item) => (
                              <button 
                                key={item.id}
                                onClick={() => setSelectedItem(item)}
                                className="w-full bg-white dark:bg-zinc-900 p-3 md:p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex items-center gap-3 md:gap-4 hover:border-teal-500/30 hover:shadow-lg hover:shadow-teal-500/5 transition-all group text-left relative overflow-hidden"
                              >
                                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                      item.action === 'consumed' ? 'bg-rose-500' : item.action === 'rejected' ? 'bg-emerald-500' : 'bg-indigo-500'
                                  }`}></div>

                                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-zinc-50 dark:bg-zinc-800 overflow-hidden flex-shrink-0 relative border border-zinc-100 dark:border-zinc-700 flex items-center justify-center">
                                      {item.imageBase64 ? (
                                          <img src={`data:image/jpeg;base64,${item.imageBase64}`} className="w-full h-full object-cover" alt="" />
                                      ) : (
                                          <span className="text-2xl opacity-50">{getItemIcon(item.itemType)}</span>
                                      )}
                                  </div>
                                  
                                  <div className="flex-1 min-w-0 py-1">
                                      <div className="flex justify-between items-start mb-1">
                                          <div className="flex items-center gap-2 min-w-0">
                                              <h4 className="font-black text-zinc-900 dark:text-white truncate text-base md:text-lg tracking-tight group-hover:text-teal-600 transition-colors">{item.name}</h4>
                                          </div>
                                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                              {item.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                          </span>
                                      </div>
                                      
                                      <div className="flex items-center gap-3">
                                          <div className="flex items-center gap-1">
                                              <div className={`w-1.5 h-1.5 rounded-full ${
                                                  (item.glycemicIndex || 0) > 55 ? 'bg-orange-500' : 'bg-emerald-500'
                                              }`}></div>
                                              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{Math.round(item.sugarg * 10) / 10}g Sugar</span>
                                          </div>
                                          {item.calories && (
                                              <span className="text-xs font-medium text-zinc-400">• {Math.round(item.calories * 10) / 10} kcal</span>
                                          )}
                                          {item.hasAddOn && (
                                              <span className="flex-shrink-0 bg-teal-50 dark:bg-teal-900/10 text-teal-600 dark:text-teal-400 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-teal-100/50 dark:border-teal-800/30 ml-auto flex items-center gap-1">
                                                  <Plus className="w-2 h-2" /> Add-on
                                              </span>
                                          )}
                                      </div>
                                  </div>
                                  
                                  <div className="text-zinc-300 dark:text-zinc-700">
                                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                  </div>
                              </button>
                          ))}
                      </div>
                  </div>
              ))
          )
      ) : (
          /* --- TABLE VIEW --- */
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2">
              <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-zinc-500 dark:text-zinc-400">
                      <thead className="text-xs text-zinc-700 uppercase bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                          <tr>
                              <th scope="col" className="px-6 py-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('name')}>
                                  <div className="flex items-center gap-1 group">
                                      Name 
                                      <span className={`transition-opacity ${sortConfig.key === 'name' ? 'opacity-100 text-teal-500' : 'opacity-30 group-hover:opacity-70'}`}>
                                          {sortConfig.key === 'name' && sortConfig.direction === 'desc' ? '↓' : '↑'}
                                      </span>
                                  </div>
                              </th>
                              <th scope="col" className="px-6 py-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('sugarg')}>
                                  <div className="flex items-center gap-1 group">
                                      Sugar (g)
                                      <span className={`transition-opacity ${sortConfig.key === 'sugarg' ? 'opacity-100 text-teal-500' : 'opacity-30 group-hover:opacity-70'}`}>
                                          {sortConfig.key === 'sugarg' && sortConfig.direction === 'desc' ? '↓' : '↑'}
                                      </span>
                                  </div>
                              </th>
                              <th scope="col" className="px-6 py-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('itemType')}>
                                  <div className="flex items-center gap-1 group">
                                      Type
                                      <span className={`transition-opacity ${sortConfig.key === 'itemType' ? 'opacity-100 text-teal-500' : 'opacity-30 group-hover:opacity-70'}`}>
                                          {sortConfig.key === 'itemType' && sortConfig.direction === 'desc' ? '↓' : '↑'}
                                      </span>
                                  </div>
                              </th>
                              <th scope="col" className="px-6 py-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('action')}>
                                  <div className="flex items-center gap-1 group">
                                      Action
                                      <span className={`transition-opacity ${sortConfig.key === 'action' ? 'opacity-100 text-teal-500' : 'opacity-30 group-hover:opacity-70'}`}>
                                          {sortConfig.key === 'action' && sortConfig.direction === 'desc' ? '↓' : '↑'}
                                      </span>
                                  </div>
                              </th>
                              <th scope="col" className="px-6 py-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" onClick={() => handleSort('timestamp')}>
                                  <div className="flex items-center gap-1 group">
                                      Time
                                      <span className={`transition-opacity ${sortConfig.key === 'timestamp' ? 'opacity-100 text-teal-500' : 'opacity-30 group-hover:opacity-70'}`}>
                                          {sortConfig.key === 'timestamp' && sortConfig.direction === 'desc' ? '↓' : '↑'}
                                      </span>
                                  </div>
                              </th>
                          </tr>
                      </thead>
                      <tbody>
                          {sortedTableData.length === 0 ? (
                              <tr>
                                  <td colSpan={5} className="px-6 py-10 text-center text-zinc-500">No records found matching filters.</td>
                              </tr>
                          ) : (
                              sortedTableData.map((item) => (
                                  <tr 
                                    key={item.id} 
                                    onClick={() => setSelectedItem(item)}
                                    className="bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                                  >
                                      <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white truncate max-w-[200px]">
                                          <div className="flex items-center gap-2">
                                              {item.name}
                                              {item.hasAddOn && (
                                                  <span className="flex-shrink-0 bg-teal-50 dark:bg-teal-900/10 text-teal-600 dark:text-teal-400 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest border border-teal-100/50 dark:border-teal-800/30 flex items-center gap-1">
                                                      <Plus className="w-2 h-2" />
                                                  </span>
                                              )}
                                          </div>
                                      </td>
                                      <td className="px-6 py-4">
                                          <span className={`font-mono font-bold ${item.sugarg > 20 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                              {item.sugarg}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 capitalize">
                                          <span className="flex items-center gap-2">
                                              {getItemIcon(item.itemType)} {item.itemType || 'Unknown'}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4">
                                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                              item.action === 'consumed' 
                                              ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' 
                                              : item.action === 'rejected'
                                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                              : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                          }`}>
                                              {item.action}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-xs font-mono text-zinc-500">
                                          <div className="flex flex-col">
                                              <span>{item.timestamp.toLocaleDateString()}</span>
                                              <span className="text-[10px] opacity-70">{item.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                          </div>
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}
    </div>
  );
};

export default HistoryScreen;
