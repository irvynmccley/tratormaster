import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Calendar, RotateCcw } from 'lucide-react';

export interface MonthMultiSelectProps {
  availableMonths: string[];
  selectedMonths: string[];
  onChange: (months: string[]) => void;
  monthSalesCount?: Record<string, number>;
  className?: string;
}

export function formatMonthYear(m: string, short = false): string {
  if (!m || !m.includes('-')) return m;
  const [year, month] = m.split('-');
  const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  if (short) {
    const monthShort = d.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
    return `${monthShort.charAt(0).toUpperCase() + monthShort.slice(1)}/${year.slice(2)}`;
  }
  const monthName = d.toLocaleString('pt-BR', { month: 'long' });
  return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
}

export const MonthMultiSelect: React.FC<MonthMultiSelectProps> = ({
  availableMonths,
  selectedMonths,
  onChange,
  monthSalesCount = {},
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const toggleMonth = (month: string) => {
    if (selectedMonths.includes(month)) {
      onChange(selectedMonths.filter(m => m !== month));
    } else {
      onChange([...selectedMonths, month]);
    }
  };

  const handleSelectAll = () => {
    onChange([...availableMonths]);
  };

  const handleClear = () => {
    onChange([]);
  };

  // Quick preset: Last 3 available months
  const handleSelectLast3Months = () => {
    onChange(availableMonths.slice(0, 3));
  };

  // Quick preset: Current year months
  const handleSelectCurrentYear = () => {
    const currentYear = new Date().getFullYear().toString();
    const monthsThisYear = availableMonths.filter(m => m.startsWith(currentYear));
    if (monthsThisYear.length > 0) {
      onChange(monthsThisYear);
    }
  };

  // Display label for the trigger button
  const getTriggerLabel = () => {
    if (selectedMonths.length === 0) {
      return 'Todos';
    }
    if (selectedMonths.length === 1) {
      return formatMonthYear(selectedMonths[0]);
    }
    if (selectedMonths.length === 2) {
      return `${formatMonthYear(selectedMonths[0], true)}, ${formatMonthYear(selectedMonths[1], true)}`;
    }
    return `${selectedMonths.length} meses selecionados`;
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full bg-zinc-50 border rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between gap-2 transition-all outline-none focus:ring-2 focus:ring-yellow-400 ${
          isOpen ? 'ring-2 ring-yellow-400 border-yellow-400 bg-white' : 'border-zinc-200 hover:border-zinc-300'
        } ${selectedMonths.length > 0 ? 'border-yellow-400/80 font-medium' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-1.5 overflow-hidden truncate">
          <Calendar size={14} className={selectedMonths.length > 0 ? 'text-yellow-600 shrink-0' : 'text-zinc-400 shrink-0'} />
          <span className={`truncate text-xs sm:text-sm ${selectedMonths.length > 0 ? 'text-zinc-900 font-semibold' : 'text-zinc-700'}`}>
            {getTriggerLabel()}
          </span>
          {selectedMonths.length > 2 && (
            <span className="shrink-0 bg-yellow-400 text-zinc-900 font-extrabold text-[10px] px-1.5 py-0.5 rounded-full leading-none">
              {selectedMonths.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedMonths.length > 0 && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-0.5 hover:bg-zinc-200 rounded text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
              title="Limpar seleção de meses"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-yellow-600' : ''}`}
          />
        </div>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div 
          className="absolute z-50 mt-1.5 right-0 w-72 sm:w-80 bg-white rounded-xl shadow-2xl border border-zinc-200 p-3 animate-in fade-in zoom-in-95 duration-150"
          style={{ minWidth: '280px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Calendar size={13} className="text-yellow-500" />
              Filtrar por Mês
            </span>
            <div className="flex items-center gap-1 text-[11px]">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2 py-0.5 font-bold text-yellow-700 hover:bg-yellow-50 rounded transition-colors"
              >
                Todos
              </button>
              <span className="text-zinc-300">|</span>
              <button
                type="button"
                onClick={handleClear}
                className="px-2 py-0.5 font-bold text-zinc-500 hover:bg-zinc-100 rounded transition-colors"
              >
                Limpar
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          {availableMonths.length > 2 && (
            <div className="flex items-center gap-1.5 mb-2.5 pb-2 border-b border-zinc-100">
              <button
                type="button"
                onClick={handleSelectLast3Months}
                className="text-[10px] font-bold px-2 py-1 bg-zinc-100 hover:bg-yellow-100 hover:text-yellow-800 text-zinc-700 rounded-md transition-colors"
              >
                Últimos 3 meses
              </button>
              <button
                type="button"
                onClick={handleSelectCurrentYear}
                className="text-[10px] font-bold px-2 py-1 bg-zinc-100 hover:bg-yellow-100 hover:text-yellow-800 text-zinc-700 rounded-md transition-colors"
              >
                Este ano ({new Date().getFullYear()})
              </button>
            </div>
          )}

          {/* Month Checkboxes List */}
          <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {availableMonths.length === 0 ? (
              <p className="text-xs text-zinc-400 italic text-center py-4">Nenhum mês disponível</p>
            ) : (
              availableMonths.map((month) => {
                const isSelected = selectedMonths.includes(month);
                const count = monthSalesCount[month] ?? 0;

                return (
                  <div
                    key={month}
                    onClick={() => toggleMonth(month)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                      isSelected
                        ? 'bg-yellow-50/80 text-yellow-950 font-semibold'
                        : 'hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-yellow-400 border-yellow-500 text-zinc-900 shadow-sm'
                            : 'border-zinc-300 bg-white hover:border-zinc-400'
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                      <span className="truncate">{formatMonthYear(month)}</span>
                    </div>

                    {count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-2 shrink-0 ${
                          isSelected
                            ? 'bg-yellow-200 text-yellow-900'
                            : 'bg-zinc-100 text-zinc-500'
                        }`}
                      >
                        {count} {count === 1 ? 'venda' : 'vendas'}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Info */}
          <div className="pt-2 mt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
            <span>
              {selectedMonths.length === 0
                ? 'Todos os meses incluídos'
                : `${selectedMonths.length} de ${availableMonths.length} meses`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 bg-yellow-400 hover:bg-yellow-500 text-zinc-900 font-bold rounded-md transition-colors"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
