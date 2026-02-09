import React, { useState, useMemo } from 'react';
import { Shipment } from '../types';
import { formatCurrency, formatNumber, formatDate } from '../utils';
import { IconArrowUp, IconArrowDown } from './Icons';

interface ShipmentListProps {
  data: Shipment[];
}

type SortKey = keyof Shipment | 'dateStr';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

export const ShipmentList: React.FC<ShipmentListProps> = ({ data }) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    const sorted = [...data];
    sorted.sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof Shipment];
      let bValue: any = b[sortConfig.key as keyof Shipment];

      if (aValue instanceof Date && bValue instanceof Date) {
          aValue = aValue.getTime();
          bValue = bValue.getTime();
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [data, sortConfig]);

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return <span className="w-3 h-3 ml-1 inline-block opacity-20">↕</span>;
    return sortConfig.direction === 'asc' ? <span className="ml-1"><IconArrowUp /></span> : <span className="ml-1"><IconArrowDown /></span>;
  };

  const headers: { key: SortKey; label: string; align?: 'left' | 'right' | 'center' }[] = [
    { key: 'cte', label: 'CTE' },
    { key: 'date', label: 'Data', align: 'center' },
    { key: 'origin', label: 'Origem' },
    { key: 'destination', label: 'Destino' },
    { key: 'route', label: 'Rota' },
    { key: 'tableName', label: 'Tabela' },
    { key: 'volumes', label: 'Volumes', align: 'right' },
    { key: 'weight', label: 'Peso', align: 'right' },
    { key: 'value', label: 'Valor CTE', align: 'right' },
  ];

  return (
    <div className="bg-white dark:bg-sle-darkCard rounded-xl shadow-soft dark:shadow-none border border-transparent dark:border-slate-800 overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">Detalhamento de Documentos</h3>
          <p className="text-xs text-slate-500">Lista completa de emissões ({sortedData.length} registros)</p>
        </div>
      </div>
      
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
            <tr>
              {headers.map((header) => (
                <th 
                  key={header.key} 
                  className={`px-6 py-4 whitespace-nowrap cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors select-none ${header.align === 'right' ? 'text-right' : header.align === 'center' ? 'text-center' : ''}`}
                  onClick={() => handleSort(header.key)}
                >
                  <div className={`flex items-center ${header.align === 'right' ? 'justify-end' : header.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                    {header.label}
                    {renderSortIcon(header.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedData.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-3 font-medium text-slate-800 dark:text-white whitespace-nowrap">{item.cte}</td>
                <td className="px-6 py-3 text-center text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatDate(item.date)}</td>
                <td className="px-6 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{item.origin}</td>
                <td className="px-6 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{item.destination}</td>
                <td className="px-6 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{item.route}</td>
                <td className="px-6 py-3 whitespace-nowrap">
                   <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                     {item.tableName}
                   </span>
                </td>
                <td className="px-6 py-3 text-right text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatNumber(item.volumes)}</td>
                <td className="px-6 py-3 text-right text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatNumber(item.weight)}</td>
                <td className="px-6 py-3 text-right font-medium text-sle-primary dark:text-sle-pastelBlue whitespace-nowrap">{formatCurrency(item.value)}</td>
              </tr>
            ))}
            {sortedData.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                  Nenhum registro encontrado para os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};