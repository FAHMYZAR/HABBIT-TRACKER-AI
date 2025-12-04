import React, { useState } from 'react';
import { ScheduleItem, EventCategory } from '../types';
import { getStatusForEvent } from '../utils/timeUtils';
import { BookOpen, Dumbbell, Moon, Sun, Briefcase, Coffee, Check, Clock, Zap, ChevronDown, ChevronUp, Activity, StickyNote, CalendarClock } from 'lucide-react';

interface Props {
  item: ScheduleItem;
  currentTime: string;
  onToggleSubtask: (index: number) => void;
}

const ThemeConfig: Record<EventCategory, { bg: string, border: string, text: string, iconBg: string }> = {
  [EventCategory.ACADEMIC]: { 
    bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', iconBg: 'bg-blue-200' 
  },
  [EventCategory.FITNESS]: { 
    bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-900', iconBg: 'bg-orange-200'
  },
  [EventCategory.RELIGIOUS]: { 
    bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-900', iconBg: 'bg-violet-200'
  },
  [EventCategory.ROUTINE]: { 
    bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', iconBg: 'bg-emerald-200'
  },
  [EventCategory.WORK]: { 
    bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-900', iconBg: 'bg-pink-200'
  },
  [EventCategory.MEAL]: { 
    bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-900', iconBg: 'bg-yellow-200'
  },
  [EventCategory.REST]: { 
    bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-900', iconBg: 'bg-teal-200'
  },
  [EventCategory.OTHER]: { 
    bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-900', iconBg: 'bg-gray-200'
  },
};

const CategoryIcons: Record<EventCategory, React.ReactNode> = {
  [EventCategory.ACADEMIC]: <BookOpen className="w-3.5 h-3.5" />,
  [EventCategory.FITNESS]: <Dumbbell className="w-3.5 h-3.5" />,
  [EventCategory.RELIGIOUS]: <Moon className="w-3.5 h-3.5" />,
  [EventCategory.ROUTINE]: <Sun className="w-3.5 h-3.5" />,
  [EventCategory.WORK]: <Briefcase className="w-3.5 h-3.5" />,
  [EventCategory.MEAL]: <Coffee className="w-3.5 h-3.5" />,
  [EventCategory.REST]: <Zap className="w-3.5 h-3.5" />,
  [EventCategory.OTHER]: <Clock className="w-3.5 h-3.5" />,
};

export const ScheduleItemCard: React.FC<Props> = ({ item, currentTime, onToggleSubtask }) => {
  const status = getStatusForEvent(item.startTime, item.endTime, currentTime, item.isTomorrow);
  const theme = ThemeConfig[item.category] || ThemeConfig.OTHER;
  
  const isCompleted = status === 'COMPLETED';
  const isOngoing = status === 'ONGOING';
  const [expanded, setExpanded] = useState(isOngoing || item.isTomorrow);

  return (
    <div 
        onClick={() => setExpanded(!expanded)}
        className={`
            relative flex flex-col gap-3 p-4 rounded-[1.5rem] border-b-[4px] border-r-[4px] active:border-b-[1px] active:border-r-[1px] active:translate-y-[2px] active:translate-x-[2px] transition-all duration-200 cursor-pointer select-none
            ${isCompleted ? 'bg-gray-100 border-gray-300 opacity-60 grayscale' : `${theme.bg} ${theme.border} bg-white`}
            ${isOngoing ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}
            ${item.isTomorrow ? 'border-dashed' : ''}
        `}
    >
      <div className="flex items-start gap-3">
        {/* Time Column */}
        <div className={`
          flex flex-col items-center justify-center py-1.5 px-1 rounded-xl border
          ${isCompleted ? 'bg-white border-gray-200 text-gray-400' : 'bg-white border-slate-200 text-slate-800'}
          w-[60px] shrink-0 shadow-sm
        `}>
          <span className="text-base font-black tracking-tight leading-none">{item.startTime}</span>
          <div className="h-0.5 w-3 bg-slate-200 my-0.5"></div>
          <span className="text-[10px] font-bold opacity-60 leading-none">{item.endTime}</span>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
             <div>
                <div className="flex flex-wrap items-center gap-1 mb-1">
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${theme.iconBg} ${theme.text}`}>
                        {CategoryIcons[item.category]}
                        {item.category}
                    </div>
                    {item.isTomorrow && (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-indigo-100 text-indigo-800">
                            <CalendarClock className="w-3 h-3"/>
                            BESOK
                        </div>
                    )}
                </div>
                <h3 className={`text-base md:text-lg font-extrabold leading-snug ${isCompleted ? 'line-through text-gray-500' : 'text-slate-800'}`}>
                    {item.title}
                </h3>
             </div>
             <div className={`p-1 rounded-full ${expanded ? 'bg-black/5' : ''} transition-colors`}>
                {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
             </div>
          </div>
          
          {/* Brief Description - Shown when collapsed */}
          {item.description && !expanded && (
             <p className="text-xs font-medium text-slate-500 mt-1 truncate">{item.description}</p>
          )}

          {/* Metrics Badge */}
          {item.metrics && (
             <div className="mt-2 inline-flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                <Activity className="w-3 h-3 text-red-500" />
                <span className="text-xs font-bold text-slate-700">{item.metrics}</span>
             </div>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-1 pt-3 border-t border-black/5 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200 cursor-default" onClick={(e) => e.stopPropagation()}>
            
            {/* Smart Tip / Catatan Penting */}
            {item.smartTip && (
                <div className="bg-white p-3 rounded-xl border border-indigo-100 flex gap-3 shadow-sm">
                    <div className="shrink-0 bg-indigo-50 p-1.5 rounded-lg text-indigo-600 h-fit">
                        <StickyNote className="w-3.5 h-3.5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-indigo-900 uppercase mb-0.5">Catatan Penting</p>
                        <p className="text-xs text-slate-600 leading-relaxed italic">"{item.smartTip}"</p>
                    </div>
                </div>
            )}

            {/* Subtasks */}
            {item.subtasks && item.subtasks.length > 0 && (
                <div className="space-y-1">
                    {item.subtasks.map((sub, idx) => {
                        // Check if subtask starts with marker OR if the whole event is completed (time passed)
                        // EXCEPTION: If it is tomorrow, it is NOT visually done.
                        const isMarked = sub.startsWith("✓ ");
                        const isVisuallyDone = (isMarked || isCompleted) && !item.isTomorrow;
                        const cleanText = isMarked ? sub.substring(2) : sub;

                        return (
                            <div 
                                key={idx} 
                                onClick={() => !isCompleted && onToggleSubtask(idx)}
                                className={`flex items-start gap-2 text-sm font-medium p-1.5 rounded-lg transition-colors 
                                    ${isCompleted ? 'cursor-default' : 'cursor-pointer hover:bg-black/5'}
                                    ${isVisuallyDone ? 'text-slate-400' : 'text-slate-700'}
                                `}
                            >
                                <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                                    ${isVisuallyDone ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 bg-white'}
                                `}>
                                    {isVisuallyDone && <Check className="w-2.5 h-2.5 text-white" />}
                                </div>
                                <span className={`text-xs md:text-sm leading-tight ${isVisuallyDone ? 'line-through opacity-70' : ''}`}>
                                    {cleanText}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
      )}
    </div>
  );
};