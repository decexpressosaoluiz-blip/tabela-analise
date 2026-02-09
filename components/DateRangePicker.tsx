import React, { useState, useEffect, useRef } from 'react';
import { IconCalendar, IconChevronLeft, IconChevronRight } from './Icons';

interface DateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  minDate?: Date;
  maxDate?: Date;
  onChange: (start: string, end: string) => void;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

// Helper to get local YYYY-MM-DD
const toLocalISO = (d: Date) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Helper to create date from local components
const createLocalDate = (y: number, m: number, d: number) => new Date(y, m, d);

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, minDate, maxDate, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // View state: Represents the month of the LEFT calendar
  const [viewDate, setViewDate] = useState(new Date());

  // Parse strings to compare locally
  const start = startDate ? new Date(parseInt(startDate.split('-')[0]), parseInt(startDate.split('-')[1])-1, parseInt(startDate.split('-')[2])) : null;
  const end = endDate ? new Date(parseInt(endDate.split('-')[0]), parseInt(endDate.split('-')[1])-1, parseInt(endDate.split('-')[2])) : null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // When opening or start date changes, sync viewDate to start date if it exists
    if (isOpen) {
        if (start) {
            setViewDate(new Date(start.getFullYear(), start.getMonth(), 1));
        } else if (maxDate) {
            // Default view to the latest data if no selection
            setViewDate(new Date(maxDate.getFullYear(), maxDate.getMonth(), 1));
        } else {
            setViewDate(new Date());
        }
    }
  }, [isOpen]);

  const handleDayClick = (date: Date) => {
    const dateStr = toLocalISO(date);

    if (!startDate || (startDate && endDate)) {
      // Start new selection
      onChange(dateStr, "");
    } else if (startDate && !endDate) {
      // Complete selection
      const currentStart = start!;
      if (date < currentStart) {
        // If clicked is before start, it becomes new start
        onChange(dateStr, "");
      } else {
        onChange(startDate, dateStr);
        setIsOpen(false);
      }
    }
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1);
    setViewDate(newDate);
  };

  const renderMonth = (monthOffset: number) => {
    const targetMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + monthOffset, 1);
    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth();
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    return (
      <div className="w-[280px] mx-auto">
        <div className="text-center font-bold text-slate-800 dark:text-slate-200 mb-4 capitalize">
          {MONTH_NAMES[month]} {year}
        </div>
        
        <div className="grid grid-cols-7 mb-2">
          {WEEK_DAYS.map(day => (
            <div key={day} className="text-center text-xs font-medium text-slate-400">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
           {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${monthOffset}-${i}`} />
           ))}

           {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const current = createLocalDate(year, month, day);
              const currentStr = toLocalISO(current);
              
              const isStart = startDate === currentStr;
              const isEnd = endDate === currentStr;
              const inRange = start && end && current > start && current < end;

              // Check constraints
              let isDisabled = false;
              if (minDate) {
                  // Normalize minDate to start of day for comparison
                  const min = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
                  if (current < min) isDisabled = true;
              }
              if (maxDate) {
                  // Normalize maxDate to end of day/start of day for loose comparison
                  const max = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());
                  if (current > max) isDisabled = true;
              }

              let wrapperClass = "flex items-center justify-center w-full h-9 relative";
              let btnClass = "w-9 h-9 flex items-center justify-center text-sm rounded-full transition-all relative z-10 ";
              
              // Connecting background for range
              let rangeBgClass = "absolute top-0 bottom-0 bg-sle-secondary/10 dark:bg-sle-pastelRed/20 ";
              
              if (isDisabled) {
                  btnClass += "text-slate-300 dark:text-slate-600 cursor-not-allowed line-through opacity-50";
                  rangeBgClass = "hidden";
              } else if (isStart && isEnd) {
                 // Single day range
                 btnClass += "bg-sle-secondary dark:bg-sle-pastelRed text-white dark:text-slate-900 font-bold";
              } else if (isStart) {
                 btnClass += "bg-sle-secondary dark:bg-sle-pastelRed text-white dark:text-slate-900 font-bold";
                 if (end) rangeBgClass += "left-1/2 right-0"; // Connect right
                 else rangeBgClass = "hidden";
              } else if (isEnd) {
                 btnClass += "bg-sle-primary dark:bg-sle-pastelBlue text-white dark:text-slate-900 font-bold"; 
                 if (start) rangeBgClass += "left-0 right-1/2"; // Connect left
                 else rangeBgClass = "hidden";
              } else if (inRange) {
                 btnClass += "text-sle-secondary dark:text-sle-pastelRed font-medium";
                 rangeBgClass += "left-0 right-0";
              } else {
                 btnClass += "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800";
                 rangeBgClass = "hidden";
              }

              return (
                <div key={day} className={wrapperClass}>
                   {!isDisabled && <div className={rangeBgClass}></div>}
                   <button 
                     className={btnClass} 
                     onClick={() => !isDisabled && handleDayClick(current)}
                     disabled={isDisabled}
                   >
                     {day}
                   </button>
                </div>
              );
           })}
        </div>
      </div>
    );
  };

  // Format display text
  const getDisplayText = () => {
    if (!startDate) return "Selecionar período";
    const formatDate = (d: string) => {
       const [y, m, dNum] = d.split('-');
       return `${dNum}/${m}/${y.slice(2)}`;
    };
    if (startDate && !endDate) return `${formatDate(startDate)} - Selecione o fim`;
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
          startDate 
            ? 'bg-sle-secondary/10 dark:bg-sle-pastelRed/10 text-sle-secondary dark:text-sle-pastelRed border-sle-secondary dark:border-sle-pastelRed' 
            : 'bg-white dark:bg-sle-darkCard text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-sle-primary'
        }`}
      >
        <IconCalendar />
        <span>{getDisplayText()}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 p-4 md:p-6 bg-white dark:bg-sle-darkCard border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[60] flex flex-col md:flex-row gap-8 w-[320px] md:w-auto overflow-hidden">
           {/* Navigation Overlays */}
           <button 
              onClick={() => changeMonth(-1)} 
              className="absolute left-2 top-4 md:left-4 md:top-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 z-20"
           >
              <IconChevronLeft />
           </button>
           
           <button 
              onClick={() => changeMonth(1)} 
              className="absolute right-2 top-4 md:right-4 md:top-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 z-20"
           >
              <IconChevronRight />
           </button>

           {/* Calendars */}
           <div className="flex flex-col md:flex-row gap-8">
             <div className="block">
               {renderMonth(0)}
             </div>
             
             {/* Divider & Second Month: Hidden on Mobile */}
             <div className="hidden md:block w-px bg-slate-100 dark:bg-slate-800"></div>
             <div className="hidden md:block">
                {renderMonth(1)}
             </div>
           </div>

           <div className="absolute bottom-4 right-6 flex gap-2">
             {startDate && (
                 <button 
                 onClick={() => { onChange("", ""); setIsOpen(false); }}
                 className="text-xs text-sle-secondary dark:text-sle-pastelRed font-medium hover:underline"
               >
                 Limpar
               </button>
             )}
           </div>
        </div>
      )}
    </div>
  );
};