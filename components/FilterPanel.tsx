import React, { useState } from 'react';
import { IconFilter, IconChevronDown, IconX, IconCalendar } from './Icons';

interface FilterPanelProps {
  // Data Options
  availableYears: string[];
  availableMonths: string[];
  availableDays: string[];
  tables: string[];
  routes: string[];
  origins: string[];

  // Selected State
  selectedYears: string[];
  selectedMonths: string[];
  selectedDays: string[];
  selectedTables: string[];
  selectedRoutes: string[];
  selectedOrigins: string[];

  // Handlers
  onYearChange: (year: string) => void;
  onMonthChange: (month: string) => void;
  onDayChange: (day: string) => void;
  onTableChange: (table: string) => void;
  onRouteChange: (route: string) => void;
  onOriginChange: (origin: string) => void;
  onReset: () => void;
}

// Dropdown Component Helper
const FilterDropdown = ({ 
  label, 
  count, 
  items, 
  selectedItems, 
  onSelect,
  icon,
  grid = false
}: { 
  label: string; 
  count: number; 
  items: string[]; 
  selectedItems: string[]; 
  onSelect: (item: string) => void;
  icon?: React.ReactNode;
  grid?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
          count > 0 
            ? 'bg-sle-primary text-white border-sle-primary shadow-sm' 
            : 'bg-white dark:bg-sle-darkCard text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-sle-primary dark:hover:border-sle-primary'
        }`}
      >
        {icon}
        <span>{label} {count > 0 && <span className="ml-1 opacity-80">({count})</span>}</span>
        <IconChevronDown />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className={`absolute top-full left-0 mt-2 min-w-[200px] max-h-80 overflow-y-auto bg-white dark:bg-sle-darkCard border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-20 custom-scrollbar p-2 ${grid ? 'grid grid-cols-4 gap-1 w-[280px]' : ''}`}>
            {items.map(item => (
              <label 
                key={item} 
                className={`flex items-center gap-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer ${grid ? 'justify-center border border-slate-100 dark:border-slate-700' : ''} ${selectedItems.includes(item) && grid ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200' : ''}`}
              >
                <input 
                  type="checkbox" 
                  checked={selectedItems.includes(item)}
                  onChange={() => onSelect(item)}
                  className={`rounded border-slate-300 text-sle-primary focus:ring-sle-primary ${grid ? 'hidden' : ''}`}
                />
                <span className={`text-xs truncate ${selectedItems.includes(item) ? 'font-bold text-sle-primary dark:text-white' : 'text-slate-700 dark:text-slate-200'}`} title={item}>
                    {item}
                </span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const FilterPanel: React.FC<FilterPanelProps> = ({
  availableYears, availableMonths, availableDays,
  tables, routes, origins,
  selectedYears, selectedMonths, selectedDays,
  selectedTables, selectedRoutes, selectedOrigins,
  onYearChange, onMonthChange, onDayChange,
  onTableChange, onRouteChange, onOriginChange,
  onReset
}) => {
  
  const hasFilters = selectedTables.length > 0 || selectedRoutes.length > 0 || selectedOrigins.length > 0 || selectedYears.length > 0 || selectedMonths.length > 0 || selectedDays.length > 0;

  return (
    <div className="bg-white dark:bg-sle-darkCard rounded-xl shadow-soft dark:shadow-none border border-transparent dark:border-slate-800 p-3 mb-6 flex flex-wrap items-center gap-3">
      
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mr-2">
        <IconFilter />
        <span className="font-semibold text-sm">Filtros</span>
      </div>

      <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

      {/* Temporal Filters */}
      <FilterDropdown 
        label="Ano" 
        count={selectedYears.length} 
        items={availableYears} 
        selectedItems={selectedYears} 
        onSelect={onYearChange}
        icon={<IconCalendar />}
      />

      <FilterDropdown 
        label="Mês" 
        count={selectedMonths.length} 
        items={availableMonths} 
        selectedItems={selectedMonths} 
        onSelect={onMonthChange} 
      />

      <FilterDropdown 
        label="Dia" 
        count={selectedDays.length} 
        items={availableDays} 
        selectedItems={selectedDays} 
        onSelect={onDayChange}
        grid={true}
      />

      <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

      {/* Dimension Filters */}
      <FilterDropdown 
        label="Tabelas" 
        count={selectedTables.length} 
        items={tables} 
        selectedItems={selectedTables} 
        onSelect={onTableChange} 
      />

      <FilterDropdown 
        label="Origem" 
        count={selectedOrigins.length} 
        items={origins} 
        selectedItems={selectedOrigins} 
        onSelect={onOriginChange} 
      />

      <FilterDropdown 
        label="Rotas" 
        count={selectedRoutes.length} 
        items={routes} 
        selectedItems={selectedRoutes} 
        onSelect={onRouteChange} 
      />

      {hasFilters && (
        <button 
          onClick={onReset}
          className="ml-auto flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-sle-secondary transition-colors"
        >
          <IconX />
          Limpar
        </button>
      )}

      {/* Active Filter Pills Display */}
      <div className="w-full flex flex-wrap gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
          {selectedYears.map(y => (
             <span key={y} className="pill-primary">Ano: {y} <button onClick={() => onYearChange(y)}><IconX /></button></span>
          ))}
          {selectedMonths.map(m => (
             <span key={m} className="pill-primary">Mês: {m} <button onClick={() => onMonthChange(m)}><IconX /></button></span>
          ))}
          {selectedTables.map(t => (
            <span key={t} className="pill-secondary">
              {t} <button onClick={() => onTableChange(t)}><IconX /></button>
            </span>
          ))}
      </div>
      <style>{`
        .pill-primary { @apply px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded-md flex items-center gap-1 border border-indigo-100 dark:border-indigo-800; }
        .pill-secondary { @apply px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs rounded-md flex items-center gap-1 border border-slate-200 dark:border-slate-700; }
      `}</style>
    </div>
  );
};