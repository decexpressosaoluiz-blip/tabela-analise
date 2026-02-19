
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchShipmentData } from './services/dataService';
import { Shipment } from './types';
import { formatCurrency, formatNumber } from './utils';
import { FilterPanel } from './components/FilterPanel';
import { ShipmentList } from './components/ShipmentList';
import { 
  IconTrendingUp, IconPackage, IconDollar, IconScale, 
  IconSun, IconMoon, IconList, IconTable, IconX
} from './components/Icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LabelList, ReferenceLine
} from 'recharts';

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const AVAILABLE_YEARS = ['2025', '2026'];
const AVAILABLE_DAYS = Array.from({length: 31}, (_, i) => String(i + 1));

const isPromotional = (tableName: string): boolean => {
  const upper = tableName.toUpperCase();
  return upper.includes('PROMO') || upper.includes('OFF') || upper.includes('DESCONTO');
};

const getTableType = (tableName: string): 'standard' | 'promo' | 'other' => {
  if (isPromotional(tableName)) return 'promo';
  if (tableName.toUpperCase().includes('PADR') || tableName.toUpperCase().includes('TABELA')) return 'standard';
  return 'other';
};

function App() {
  const [rawData, setRawData] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'analytical' | 'operational'>('analytical');

  // --- FILTERS STATE ---
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>(['2026']);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(['Janeiro', 'Fevereiro']);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await fetchShipmentData();
      data.sort((a, b) => a.date.getTime() - b.date.getTime());
      setRawData(data);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const colors = useMemo(() => {
    return darkMode ? {
        standard: '#818CF8', 
        promo: '#F87171',    
        other: '#94A3B8',
        success: '#34D399',
        warning: '#FBBF24',
        danger: '#F87171',
        grid: '#1e293b',
        text: '#e2e8f0'
    } : {
        standard: '#2E31B4', 
        promo: '#EC1B23',    
        other: '#94A3B8',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        grid: '#E2E8F0',
        text: '#1E293B'
    };
  }, [darkMode]);

  // --- FILTERING LOGIC ---
  const uniqueTables = useMemo(() => Array.from(new Set(rawData.map(s => s.tableName))).filter(Boolean).sort(), [rawData]);
  const uniqueRoutes = useMemo(() => Array.from(new Set(rawData.map(s => s.route))).filter(Boolean).sort(), [rawData]);
  const uniqueOrigins = useMemo(() => Array.from(new Set(rawData.map(s => s.origin))).filter(Boolean).sort(), [rawData]);

  const filteredData = useMemo(() => {
    return rawData.filter(item => {
      const itemYear = String(item.date.getFullYear());
      if (selectedYears.length > 0 && !selectedYears.includes(itemYear)) return false;

      const itemMonthIndex = item.date.getMonth();
      const itemMonthName = MONTH_NAMES[itemMonthIndex];
      if (selectedMonths.length > 0 && !selectedMonths.includes(itemMonthName)) return false;

      const itemDay = String(item.date.getDate());
      if (selectedDays.length > 0 && !selectedDays.includes(itemDay)) return false;

      if (selectedTables.length > 0 && !selectedTables.includes(item.tableName)) return false;
      if (selectedRoutes.length > 0 && !selectedRoutes.includes(item.route)) return false;
      if (selectedOrigins.length > 0 && !selectedOrigins.includes(item.origin)) return false;
      
      return true;
    });
  }, [rawData, selectedTables, selectedRoutes, selectedOrigins, selectedYears, selectedMonths, selectedDays]);

  const monthlyData = useMemo(() => {
    const months: Record<string, any> = {};
    filteredData.forEach(d => {
      const k = `${d.date.getFullYear()}-${d.date.getMonth()}`;
      if (!months[k]) {
        months[k] = { 
          name: d.date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), 
          dateObj: d.date,
          totalRev: 0, totalVol: 0, totalDocs: 0,
          stdRev: 0, stdVol: 0, promoRev: 0, promoVol: 0, otherRev: 0, otherVol: 0 
        };
      }
      const m = months[k];
      m.totalRev += d.value; m.totalVol += d.weight; m.totalDocs += 1;
      const type = getTableType(d.tableName);
      if (type === 'standard') { m.stdRev += d.value; m.stdVol += d.weight; }
      else if (type === 'promo') { m.promoRev += d.value; m.promoVol += d.weight; }
    });
    return Object.values(months).sort((a: any, b: any) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [filteredData]);

  const kpis = useMemo(() => {
    const len = monthlyData.length;
    const current = monthlyData[len - 1] || { totalRev: 0, totalVol: 0, totalDocs: 0 };
    const prev = monthlyData[len - 2] || { totalRev: 0, totalVol: 0, totalDocs: 0 };
    const prev2 = monthlyData[len - 3] || { totalRev: 0, totalVol: 0, totalDocs: 0 };
    return { current, prev, prev2 };
  }, [monthlyData]);

  const dailyEvolution = useMemo(() => {
    return filteredData.reduce((acc: any[], d) => {
      const dayKey = `${d.date.getDate()}/${d.date.getMonth()+1}`;
      const existing = acc.find(a => a.day === dayKey);
      const type = getTableType(d.tableName);
      if (existing) {
        if (type === 'standard') existing.stdRev += d.value;
        else if (type === 'promo') existing.promoRev += d.value;
      } else {
        acc.push({
           day: dayKey,
           stdRev: type === 'standard' ? d.value : 0,
           promoRev: type === 'promo' ? d.value : 0,
        });
      }
      return acc;
    }, []);
  }, [filteredData]);

  const routePerformance = useMemo(() => {
    const routes: Record<string, any> = {};
    filteredData.forEach(d => {
      if (!routes[d.route]) {
        routes[d.route] = { route: d.route, totalVol: 0, totalRev: 0, stdVol: 0, stdRev: 0, promoVol: 0, promoRev: 0 };
      }
      const r = routes[d.route];
      r.totalVol += d.weight; r.totalRev += d.value;
      const type = getTableType(d.tableName);
      if (type === 'standard') { r.stdVol += d.weight; r.stdRev += d.value; }
      else if (type === 'promo') { r.promoVol += d.weight; r.promoRev += d.value; }
    });
    return Object.values(routes).map((r: any) => ({
      ...r,
      stdYield: r.stdVol > 0 ? r.stdRev / r.stdVol : 0,
      promoYield: r.promoVol > 0 ? r.promoRev / r.promoVol : 0,
      sharePromo: r.totalVol > 0 ? r.promoVol / r.totalVol : 0
    })).sort((a: any, b: any) => b.totalRev - a.totalRev);
  }, [filteredData]);

  const compensationStats = useMemo(() => {
    if (monthlyData.length < 2) return null;
    const current = monthlyData[monthlyData.length - 1];
    const prev = monthlyData[monthlyData.length - 2];
    const gap = current.totalRev - prev.totalRev;
    return { current, prev, gap, isPositive: gap >= 0 };
  }, [monthlyData]);

  const KPICard = ({ title, value, prevVal, prev2Val, format = 'currency', icon }: any) => {
    const delta1 = prevVal > 0 ? (value - prevVal) / prevVal : 0;
    const delta2 = prev2Val > 0 ? (value - prev2Val) / prev2Val : 0;
    const fmt = format === 'currency' ? formatCurrency : (v: number) => format === 'weight' ? `${formatNumber(v/1000)}t` : formatNumber(v);
    return (
      <div className="bg-white dark:bg-sle-darkCard rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
         <div className="flex justify-between items-start mb-3">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{title}</p>
            <div className="text-sle-primary dark:text-sle-pastelBlue">{icon}</div>
         </div>
         <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">{fmt(value)}</h3>
         <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
            <div><span className="text-slate-400 block">vs Mês Ant.</span><span className={`font-bold ${delta1 >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{delta1 >= 0 ? '▲' : '▼'} {(Math.abs(delta1) * 100).toFixed(1)}%</span></div>
            <div><span className="text-slate-400 block">vs 2 Meses</span><span className={`font-bold ${delta2 >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{delta2 >= 0 ? '▲' : '▼'} {(Math.abs(delta2) * 100).toFixed(1)}%</span></div>
         </div>
      </div>
    );
  };

  const CustomTooltip = ({ active, payload, label, format = 'currency' }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-sle-darkCard p-4 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg z-50">
          <p className="text-sm font-bold text-slate-800 dark:text-white mb-2 pb-2 border-b dark:border-slate-700">{label}</p>
          {payload.map((entry: any, index: number) => (
             <div key={index} className="flex items-center justify-between gap-4 mb-1 text-xs">
                <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor: entry.color}}></span>{entry.name}</span>
                <span className="text-slate-800 dark:text-white font-bold">{format === 'currency' ? formatCurrency(entry.value) : formatNumber(entry.value)}</span>
             </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-sle-bgLight dark:bg-sle-dark">
      <div className="w-12 h-12 border-4 border-sle-primary border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-sle-primary font-bold animate-pulse">Sincronizando com a Planilha...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-sle-bgLight dark:bg-sle-dark text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
      
      <header className="bg-white dark:bg-sle-darkCard shadow-sm sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
                 <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sle-primary to-sle-primaryDark flex items-center justify-center text-white font-bold">SL</div>
                 <div>
                   <h1 className="text-lg font-bold text-sle-primaryDark dark:text-white leading-tight">Analytics Comercial</h1>
                   <div className="flex items-center gap-2">
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Última atualização: {lastUpdated?.toLocaleTimeString('pt-BR')}</p>
                      {refreshing && <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>}
                   </div>
                 </div>
             </div>

             <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

             <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg">
                <button onClick={() => setActiveTab('analytical')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'analytical' ? 'bg-white dark:bg-sle-primary text-sle-primary dark:text-white shadow-sm' : 'text-slate-500'}`}>Visão Analítica</button>
                <button onClick={() => setActiveTab('operational')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'operational' ? 'bg-white dark:bg-sle-primary text-sle-primary dark:text-white shadow-sm' : 'text-slate-500'}`}>Operacional</button>
             </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => loadData(true)} 
              disabled={refreshing}
              className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-sle-primary transition-all ${refreshing ? 'animate-spin opacity-50' : ''}`}
              title="Atualizar dados da planilha agora"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-400 hover:text-sle-primary transition-colors">
               {darkMode ? <IconSun /> : <IconMoon />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto py-6 px-4 sm:px-6 space-y-6">
        
        <FilterPanel 
            availableYears={AVAILABLE_YEARS} availableMonths={MONTH_NAMES} availableDays={AVAILABLE_DAYS}
            tables={uniqueTables} routes={uniqueRoutes} origins={uniqueOrigins}
            selectedYears={selectedYears} selectedMonths={selectedMonths} selectedDays={selectedDays}
            selectedTables={selectedTables} selectedRoutes={selectedRoutes} selectedOrigins={selectedOrigins}
            onYearChange={(y) => setSelectedYears(prev => prev.includes(y) ? prev.filter(i => i !== y) : [...prev, y])}
            onMonthChange={(m) => setSelectedMonths(prev => prev.includes(m) ? prev.filter(i => i !== m) : [...prev, m])}
            onDayChange={(d) => setSelectedDays(prev => prev.includes(d) ? prev.filter(i => i !== d) : [...prev, d])}
            onTableChange={(t) => setSelectedTables(prev => prev.includes(t) ? prev.filter(i => i !== t) : [...prev, t])}
            onRouteChange={(r) => setSelectedRoutes(prev => prev.includes(r) ? prev.filter(i => i !== r) : [...prev, r])}
            onOriginChange={(o) => setSelectedOrigins(prev => prev.includes(o) ? prev.filter(i => i !== o) : [...prev, o])}
            onReset={() => { setSelectedTables([]); setSelectedRoutes([]); setSelectedOrigins([]); setSelectedYears(['2026']); setSelectedMonths(['Janeiro', 'Fevereiro']); setSelectedDays([]); }}
        />

        {activeTab === 'analytical' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
               <KPICard title="Faturamento" value={kpis.current.totalRev} prevVal={kpis.prev.totalRev} prev2Val={kpis.prev2.totalRev} icon={<IconDollar />} />
               <KPICard title="Volume" value={kpis.current.totalVol} prevVal={kpis.prev.totalVol} prev2Val={kpis.prev2.totalVol} format="weight" icon={<IconScale />} />
               <KPICard title="Emissões" value={kpis.current.totalDocs} prevVal={kpis.prev.totalDocs} prev2Val={kpis.prev2.totalDocs} format="number" icon={<IconPackage />} />
               <KPICard title="Ticket Médio" value={kpis.current.totalDocs ? kpis.current.totalRev / kpis.current.totalDocs : 0} prevVal={kpis.prev.totalDocs ? kpis.prev.totalRev / kpis.prev.totalDocs : 0} prev2Val={kpis.prev2.totalDocs ? kpis.prev2.totalRev / kpis.prev2.totalDocs : 0} icon={<IconTrendingUp />} />
               <KPICard title="R$/kg" value={kpis.current.totalVol ? kpis.current.totalRev / kpis.current.totalVol : 0} prevVal={kpis.prev.totalVol ? kpis.prev.totalRev / kpis.prev.totalVol : 0} prev2Val={kpis.prev2.totalVol ? kpis.prev2.totalRev / kpis.prev2.totalVol : 0} icon={<IconTable />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-sle-darkCard rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                    <h3 className="text-lg font-bold mb-6 text-slate-800 dark:text-white">Evolução Diária (Mix)</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer>
                            <BarChart data={dailyEvolution}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="stdRev" name="Padrão" stackId="a" fill={colors.standard} barSize={24} />
                                <Bar dataKey="promoRev" name="Promo" stackId="a" fill={colors.promo} barSize={24} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white dark:bg-sle-darkCard rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                    <h3 className="text-lg font-bold mb-6 text-slate-800 dark:text-white">Comparativo Mensal (Volume)</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer>
                            <BarChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} tickFormatter={(v) => `${(v/1000).toFixed(0)}t`} />
                                <Tooltip content={<CustomTooltip format="weight" />} />
                                <Bar dataKey="stdVol" name="Padrão" stackId="a" fill={colors.standard} barSize={40} />
                                <Bar dataKey="promoVol" name="Promo" stackId="a" fill={colors.promo} barSize={40} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {compensationStats && (
               <div className="bg-white dark:bg-sle-darkCard rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="text-xl font-bold mb-4">Análise de Compensação Financeira</h3>
                  <div className="flex items-center gap-4 mb-6">
                      <div className={`p-4 rounded-xl flex-1 flex flex-col items-center justify-center border-2 ${compensationStats.isPositive ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                          <p className="text-xs uppercase font-bold text-slate-400 mb-1">Diferença de Faturamento (MoM)</p>
                          <p className={`text-3xl font-bold ${compensationStats.isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                             {compensationStats.isPositive ? '+' : ''}{formatCurrency(compensationStats.gap)}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium mt-2">Comparando {compensationStats.prev.name} com {compensationStats.current.name}</p>
                      </div>
                  </div>
                  <div className="h-[250px]">
                      <ResponsiveContainer>
                          <BarChart data={[
                              { name: compensationStats.prev.name, total: compensationStats.prev.totalRev, fill: colors.grid },
                              { name: compensationStats.current.name, std: compensationStats.current.stdRev, promo: compensationStats.current.promoRev, fill: colors.standard }
                          ]} barSize={80}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} />
                              <YAxis hide />
                              <Tooltip content={<CustomTooltip />} />
                              <Bar dataKey="total" stackId="a" name="Faturamento" radius={[4, 4, 0, 0]}>
                                  <LabelList dataKey="total" position="top" formatter={formatCurrency} style={{fontSize: 12, fontWeight: 'bold'}} />
                              </Bar>
                              <Bar dataKey="std" stackId="b" name="Padrão" fill={colors.standard} />
                              <Bar dataKey="promo" stackId="b" name="Promo" fill={colors.promo} radius={[4, 4, 0, 0]}>
                                  <LabelList dataKey="promo" position="top" formatter={() => ''} />
                              </Bar>
                              <ReferenceLine y={compensationStats.prev.totalRev} stroke={colors.danger} strokeDasharray="5 5" />
                          </BarChart>
                      </ResponsiveContainer>
                  </div>
               </div>
            )}
          </div>
        )}

        {activeTab === 'operational' && (
          <div className="space-y-6">
             <div className="bg-white dark:bg-sle-darkCard rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-5 bg-slate-50 dark:bg-slate-900/30 border-b dark:border-slate-800">
                    <h3 className="font-bold text-sm uppercase">Performance por Rota (Padrão vs Promo)</h3>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left">
                      <thead className="text-slate-500 dark:text-slate-400 border-b dark:border-slate-800 text-[11px] uppercase">
                         <tr>
                            <th className="px-6 py-4">Rota</th>
                            <th className="px-6 py-4 text-center">Part. Promo</th>
                            <th className="px-6 py-4 text-right">R$/kg Padrão</th>
                            <th className="px-6 py-4 text-right text-rose-500">R$/kg Promo</th>
                            <th className="px-6 py-4 text-center">Variação %</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                         {routePerformance.map((row: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                               <td className="px-6 py-3 font-bold">{row.route}</td>
                               <td className="px-6 py-3 text-center">
                                   <div className="w-20 mx-auto h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                       <div className="h-full bg-rose-500" style={{width: `${row.sharePromo * 100}%`}}></div>
                                   </div>
                                   <span className="text-[10px] text-slate-500">{(row.sharePromo * 100).toFixed(0)}%</span>
                               </td>
                               <td className="px-6 py-3 text-right">{formatCurrency(row.stdYield)}</td>
                               <td className="px-6 py-3 text-right text-rose-500">{formatCurrency(row.promoYield)}</td>
                               <td className="px-6 py-3 text-center">
                                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600">
                                     {((row.promoYield - row.stdYield) / (row.stdYield || 1) * 100).toFixed(0)}%
                                  </span>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
             <ShipmentList data={filteredData} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
