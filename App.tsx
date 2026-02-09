import React, { useState, useEffect, useMemo } from 'react';
import { fetchShipmentData } from './services/dataService';
import { Shipment } from './types';
import { formatCurrency, formatNumber } from './utils';
import { FilterPanel } from './components/FilterPanel';
import { ShipmentList } from './components/ShipmentList';
import { 
  IconTrendingUp, IconPackage, IconDollar, IconScale, 
  IconSun, IconMoon, IconList, IconTable
} from './components/Icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, Cell, ReferenceLine, Legend, LabelList
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
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'analytical' | 'operational'>('analytical');

  // --- FILTERS STATE ---
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>([]);
  
  // New Granular Date Filters
  const [selectedYears, setSelectedYears] = useState<string[]>(['2026']);
  const [selectedMonths, setSelectedMonths] = useState<string[]>(['Janeiro', 'Fevereiro']);
  const [selectedDays, setSelectedDays] = useState<string[]>(['1', '2', '3', '4', '5', '6']);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await fetchShipmentData();
      data.sort((a, b) => a.date.getTime() - b.date.getTime());
      setRawData(data);
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // --- DYNAMIC COLORS ---
  const colors = useMemo(() => {
    return darkMode ? {
        standard: '#818CF8', // Pastel Blue/Indigo for Dark Mode
        promo: '#F87171',    // Pastel Red for Dark Mode
        other: '#94A3B8',
        success: '#34D399',
        warning: '#FBBF24',
        danger: '#F87171',
        grid: '#1e293b',
        text: '#e2e8f0'
    } : {
        standard: '#2E31B4', // Brand Blue for Light Mode
        promo: '#EC1B23',    // Brand Red for Light Mode
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
      // 1. Date Filters
      const itemYear = String(item.date.getFullYear());
      if (selectedYears.length > 0 && !selectedYears.includes(itemYear)) return false;

      const itemMonthIndex = item.date.getMonth();
      const itemMonthName = MONTH_NAMES[itemMonthIndex];
      if (selectedMonths.length > 0 && !selectedMonths.includes(itemMonthName)) return false;

      const itemDay = String(item.date.getDate());
      if (selectedDays.length > 0 && !selectedDays.includes(itemDay)) return false;

      // 2. Standard Dimension Filters
      if (selectedTables.length > 0 && !selectedTables.includes(item.tableName)) return false;
      if (selectedRoutes.length > 0 && !selectedRoutes.includes(item.route)) return false;
      if (selectedOrigins.length > 0 && !selectedOrigins.includes(item.origin)) return false;
      
      return true;
    });
  }, [rawData, selectedTables, selectedRoutes, selectedOrigins, selectedYears, selectedMonths, selectedDays]);

  // --- AGGREGATION ENGINE ---

  // 1. Monthly Aggregation (MoM) - Used for volume charts and KPI cards
  const monthlyData = useMemo(() => {
    const months: Record<string, { 
      name: string, 
      dateObj: Date,
      totalRev: number, totalVol: number, totalDocs: number,
      stdRev: number, stdVol: number,
      promoRev: number, promoVol: number,
      otherRev: number, otherVol: number
    }> = {};

    filteredData.forEach(d => {
      const k = `${d.date.getFullYear()}-${d.date.getMonth()}`;
      if (!months[k]) {
        const monthName = d.date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
        months[k] = { 
          name: monthName, dateObj: d.date,
          totalRev: 0, totalVol: 0, totalDocs: 0,
          stdRev: 0, stdVol: 0, promoRev: 0, promoVol: 0, otherRev: 0, otherVol: 0 
        };
      }
      
      const m = months[k];
      m.totalRev += d.value;
      m.totalVol += d.weight;
      m.totalDocs += 1;

      const type = getTableType(d.tableName);
      if (type === 'standard') { m.stdRev += d.value; m.stdVol += d.weight; }
      else if (type === 'promo') { m.promoRev += d.value; m.promoVol += d.weight; }
      else { m.otherRev += d.value; m.otherVol += d.weight; }
    });

    return Object.values(months).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [filteredData]);

  // 2. Simple KPIs (for Cards)
  const kpis = useMemo(() => {
    const len = monthlyData.length;
    const current = monthlyData[len - 1] || { totalRev: 0, totalVol: 0, totalDocs: 0, stdRev: 0, promoRev: 0 };
    const prev = monthlyData[len - 2] || { totalRev: 0, totalVol: 0, totalDocs: 0 };
    const prev2 = monthlyData[len - 3] || { totalRev: 0, totalVol: 0, totalDocs: 0 };
    return { current, prev, prev2 };
  }, [monthlyData]);

  // 3. Daily Evolution
  const dailyEvolution = useMemo(() => {
    return filteredData.reduce((acc: any[], d) => {
      const dayKey = `${d.date.getDate()}/${d.date.getMonth()+1}`;
      const existing = acc.find(a => a.fullDate === d.date.getTime());
      const type = getTableType(d.tableName);
      
      if (existing) {
        if (type === 'standard') { existing.stdRev += d.value; }
        else if (type === 'promo') { existing.promoRev += d.value; }
        else { existing.otherRev += d.value; }
      } else {
        acc.push({
           day: dayKey,
           fullDate: d.date.getTime(),
           stdRev: type === 'standard' ? d.value : 0,
           promoRev: type === 'promo' ? d.value : 0,
           otherRev: type === 'other' ? d.value : 0,
        });
      }
      return acc;
    }, []);
  }, [filteredData]);

  // 4. Route Performance Matrix (Pivot)
  const routePerformance = useMemo(() => {
    const routes: Record<string, any> = {};

    filteredData.forEach(d => {
      if (!routes[d.route]) {
        routes[d.route] = { 
          route: d.route, 
          totalVol: 0, totalRev: 0, 
          stdVol: 0, stdRev: 0, stdYield: 0,
          promoVol: 0, promoRev: 0, promoYield: 0,
          sharePromo: 0
        };
      }
      const r = routes[d.route];
      r.totalVol += d.weight;
      r.totalRev += d.value;

      const type = getTableType(d.tableName);
      if (type === 'standard') { r.stdVol += d.weight; r.stdRev += d.value; }
      else if (type === 'promo') { r.promoVol += d.weight; r.promoRev += d.value; }
    });

    return Object.values(routes).map((r: any) => ({
      ...r,
      stdYield: r.stdVol > 0 ? r.stdRev / r.stdVol : 0,
      promoYield: r.promoVol > 0 ? r.promoRev / r.promoVol : 0,
      sharePromo: r.totalVol > 0 ? r.promoVol / r.totalVol : 0,
      avgTicket: (r.totalRev / (r.stdVol + r.promoVol)) * 100 
    })).sort((a: any, b: any) => b.totalRev - a.totalRev);
  }, [filteredData]);


  // 5. PRECISE COMPENSATION ANALYSIS
  const compensationStats = useMemo(() => {
    if (filteredData.length === 0) return { 
        chartData: [], 
        routeAnalysis: [], 
        gap: 0, 
        currentTotal: 0, 
        prevTotal: 0,
        currentLabel: '-',
        prevLabel: '-'
    };

    const latestDate = filteredData[filteredData.length - 1].date;
    const currentMonth = latestDate.getMonth();
    const currentYear = latestDate.getFullYear();

    const prevDateTarget = new Date(currentYear, currentMonth - 1, 1);
    const prevMonth = prevDateTarget.getMonth();
    const prevYear = prevDateTarget.getFullYear();

    const aggregatePeriod = (tMonth: number, tYear: number) => {
        const metrics: Record<string, { rev: number, stdRev: number, promoRev: number }> = {};
        let totalRev = 0;
        let totalStd = 0;
        let totalPromo = 0;

        rawData.forEach(d => {
            const dMonth = d.date.getMonth();
            const dYear = d.date.getFullYear();
            const dDay = String(d.date.getDate());

            if (dMonth === tMonth && dYear === tYear && selectedDays.includes(dDay)) {
                
                if (!metrics[d.route]) metrics[d.route] = { rev: 0, stdRev: 0, promoRev: 0 };
                metrics[d.route].rev += d.value;

                totalRev += d.value;
                const type = getTableType(d.tableName);
                if (type === 'standard') {
                    totalStd += d.value;
                    metrics[d.route].stdRev += d.value;
                } else if (type === 'promo') {
                    totalPromo += d.value;
                    metrics[d.route].promoRev += d.value;
                }
            }
        });
        return { metrics, totalRev, totalStd, totalPromo };
    };

    const currData = aggregatePeriod(currentMonth, currentYear);
    const prevData = aggregatePeriod(prevMonth, prevYear);

    const allRoutes = Array.from(new Set([...Object.keys(currData.metrics), ...Object.keys(prevData.metrics)]));
    const routeAnalysis = allRoutes.map(route => {
        const curr = currData.metrics[route]?.rev || 0;
        const prev = prevData.metrics[route]?.rev || 0;
        const delta = curr - prev;
        const growth = prev > 0 ? (delta / prev) * 100 : (curr > 0 ? 100 : 0);
        return { route, current: curr, prev, delta, growth };
    }).sort((a, b) => b.delta - a.delta);

    const chartData = [
        {
            name: 'Período Anterior',
            total: prevData.totalRev,
            stdRev: prevData.totalRev, 
            promoRev: 0, 
            label: `${MONTH_NAMES[prevMonth].substring(0,3)}/${prevYear.toString().substring(2)}`
        },
        {
            name: 'Período Atual',
            total: currData.totalRev,
            stdRev: currData.totalStd,
            promoRev: currData.totalPromo,
            label: `${MONTH_NAMES[currentMonth].substring(0,3)}/${currentYear.toString().substring(2)}`
        }
    ];

    return {
        chartData,
        routeAnalysis: routeAnalysis.slice(0, 8), 
        gap: currData.totalRev - prevData.totalRev,
        currentTotal: currData.totalRev,
        prevTotal: prevData.totalRev,
        currentLabel: `${MONTH_NAMES[currentMonth]}`,
        prevLabel: `${MONTH_NAMES[prevMonth]}`
    };

  }, [filteredData, rawData, selectedDays]);


  // --- CUSTOM COMPONENTS ---

  const KPICard = ({ title, value, prevVal, prev2Val, format = 'currency', icon }: any) => {
    const delta1 = prevVal > 0 ? (value - prevVal) / prevVal : 0;
    const delta2 = prev2Val > 0 ? (value - prev2Val) / prev2Val : 0;
    const fmt = format === 'currency' ? formatCurrency : (v: number) => format === 'weight' ? `${formatNumber(v/1000)}t` : formatNumber(v);

    return (
      <div className="bg-white dark:bg-sle-darkCard rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
         <div className="flex justify-between items-start mb-3">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{title}</p>
            <div className="text-sle-primary dark:text-sle-pastelBlue opacity-80">{icon}</div>
         </div>
         <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">{fmt(value)}</h3>
         
         <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 dark:border-slate-800 pt-3">
            <div>
               <span className="text-slate-400 block mb-0.5">vs Mês Ant.</span>
               <span className={`font-bold ${delta1 >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                 {delta1 >= 0 ? '▲' : '▼'} {(Math.abs(delta1) * 100).toFixed(1)}%
               </span>
            </div>
            <div>
               <span className="text-slate-400 block mb-0.5">vs 2 Meses</span>
               <span className={`font-bold ${delta2 >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                 {delta2 >= 0 ? '▲' : '▼'} {(Math.abs(delta2) * 100).toFixed(1)}%
               </span>
            </div>
         </div>
      </div>
    );
  };

  const CustomTooltip = ({ active, payload, label, format = 'currency' }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + (typeof entry.value === 'number' ? entry.value : 0), 0);
      return (
        <div className="bg-white dark:bg-sle-darkCard p-4 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg z-50 min-w-[220px]">
          <p className="text-sm font-bold text-slate-800 dark:text-white mb-2 pb-2 border-b border-slate-100 dark:border-slate-700">{label}</p>
          {payload.map((entry: any, index: number) => (
             <div key={index} className="flex items-center justify-between gap-4 mb-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color || entry.fill }}></span>
                  <span className="text-slate-600 dark:text-slate-300 font-medium">{entry.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-800 dark:text-white font-bold block">
                    {format === 'currency' ? formatCurrency(entry.value) : formatNumber(entry.value)}
                  </span>
                </div>
             </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const handleReset = () => {
    setSelectedTables([]);
    setSelectedRoutes([]);
    setSelectedOrigins([]);
    setSelectedYears(['2026']);
    setSelectedMonths(['Janeiro', 'Fevereiro']);
    setSelectedDays(['1', '2', '3', '4', '5', '6']);
  };

  const handleMultiSelect = (current: string[], item: string): string[] => {
    if (current.includes(item)) return current.filter(i => i !== item);
    return [...current, item];
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-sle-bgLight dark:bg-sle-dark">
        <div className="w-12 h-12 border-4 border-sle-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isPositive = compensationStats.gap >= 0;

  return (
    <div className="min-h-screen bg-sle-bgLight dark:bg-sle-dark text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
      
      {/* HEADER */}
      <header className="bg-white dark:bg-sle-darkCard shadow-sm sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3">
                 <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sle-primary to-sle-primaryDark flex items-center justify-center text-white font-bold shadow-soft">SL</div>
                 <div>
                   <h1 className="text-lg font-bold text-sle-primaryDark dark:text-white leading-tight">Analytics Comercial</h1>
                   <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Pricing & Performance</p>
                 </div>
             </div>

             <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

             {/* TABS */}
             <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg">
                <button onClick={() => setActiveTab('analytical')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'analytical' ? 'bg-white dark:bg-sle-primary text-sle-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-sle-primary'}`}>
                  <IconTrendingUp /> Visão Analítica
                </button>
                <button onClick={() => setActiveTab('operational')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'operational' ? 'bg-white dark:bg-sle-primary text-sle-primary dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-sle-primary'}`}>
                  <IconList /> Detalhamento Operacional
                </button>
             </div>
          </div>
          
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 text-slate-400 hover:text-sle-primary transition-colors">
             {darkMode ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto py-6 px-4 sm:px-6 space-y-6">
        
        {/* FILTERS */}
        <FilterPanel 
            availableYears={AVAILABLE_YEARS}
            availableMonths={MONTH_NAMES}
            availableDays={AVAILABLE_DAYS}
            tables={uniqueTables} routes={uniqueRoutes} origins={uniqueOrigins}
            
            selectedYears={selectedYears}
            selectedMonths={selectedMonths}
            selectedDays={selectedDays}
            selectedTables={selectedTables} selectedRoutes={selectedRoutes} selectedOrigins={selectedOrigins}
            
            onYearChange={(y) => setSelectedYears(prev => handleMultiSelect(prev, y))}
            onMonthChange={(m) => setSelectedMonths(prev => handleMultiSelect(prev, m))}
            onDayChange={(d) => setSelectedDays(prev => handleMultiSelect(prev, d))}
            
            onTableChange={(t) => setSelectedTables(prev => handleMultiSelect(prev, t))}
            onRouteChange={(r) => setSelectedRoutes(prev => handleMultiSelect(prev, r))}
            onOriginChange={(o) => setSelectedOrigins(prev => handleMultiSelect(prev, o))}
            
            onReset={handleReset}
        />

        {activeTab === 'analytical' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* KPI ROW */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
               <KPICard title="Faturamento Total" value={kpis.current.totalRev} prevVal={kpis.prev.totalRev} prev2Val={kpis.prev2.totalRev} format="currency" icon={<IconDollar />} />
               <KPICard title="Volume Total" value={kpis.current.totalVol} prevVal={kpis.prev.totalVol} prev2Val={kpis.prev2.totalVol} format="weight" icon={<IconScale />} />
               <KPICard title="Emissões" value={kpis.current.totalDocs} prevVal={kpis.prev.totalDocs} prev2Val={kpis.prev2.totalDocs} format="number" icon={<IconPackage />} />
               <KPICard title="Ticket Médio" value={kpis.current.totalDocs ? kpis.current.totalRev / kpis.current.totalDocs : 0} prevVal={kpis.prev.totalDocs ? kpis.prev.totalRev / kpis.prev.totalDocs : 0} prev2Val={kpis.prev2.totalDocs ? kpis.prev2.totalRev / kpis.prev2.totalDocs : 0} format="currency" icon={<IconTrendingUp />} />
               <KPICard title="Preço Médio (R$/kg)" value={kpis.current.totalVol ? kpis.current.totalRev / kpis.current.totalVol : 0} prevVal={kpis.prev.totalVol ? kpis.prev.totalRev / kpis.prev.totalVol : 0} prev2Val={kpis.prev2.totalVol ? kpis.prev2.totalRev / kpis.prev2.totalVol : 0} format="currency" icon={<IconTable />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* CHART 1: DAILY REVENUE MIX */}
                <div className="bg-white dark:bg-sle-darkCard rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="mb-6 flex justify-between items-end">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Evolução Diária (Mix de Tabela)</h3>
                            <p className="text-xs text-slate-500">Visualização sequencial dos dias selecionados</p>
                        </div>
                        <div className="flex gap-4 text-xs font-medium">
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{backgroundColor: colors.standard}}></span> Padrão</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{backgroundColor: colors.promo}}></span> Promo</div>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer>
                            <BarChart data={dailyEvolution} margin={{top: 0, right: 0, left: 0, bottom: 0}}>
                                <defs>
                                    <linearGradient id="gradStd" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={colors.standard} stopOpacity={1}/>
                                        <stop offset="95%" stopColor={colors.standard} stopOpacity={0.8}/>
                                    </linearGradient>
                                    <linearGradient id="gradPromo" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={colors.promo} stopOpacity={1}/>
                                        <stop offset="95%" stopColor={colors.promo} stopOpacity={0.8}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
                                <Tooltip content={<CustomTooltip format="currency" />} cursor={{fill: darkMode ? '#1E293B' : '#F1F5F9', opacity: 0.5}} />
                                <Bar dataKey="stdRev" name="Tabela Padrão" stackId="a" fill="url(#gradStd)" barSize={24} />
                                <Bar dataKey="promoRev" name="Promocional" stackId="a" fill="url(#gradPromo)" barSize={24} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* CHART 2: MONTHLY VOLUME COMPARISON */}
                <div className="bg-white dark:bg-sle-darkCard rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Comparativo de Volume (Filtro Atual)</h3>
                        <p className="text-xs text-slate-500">Total agregado por mês selecionado</p>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer>
                            <BarChart data={monthlyData} margin={{top: 0, right: 0, left: 0, bottom: 0}}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12, fontWeight: 500}} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 11}} tickFormatter={(v) => `${(v/1000).toFixed(0)}t`} />
                                <Tooltip content={<CustomTooltip format="weight" />} cursor={{fill: darkMode ? '#1E293B' : '#F1F5F9', opacity: 0.5}} />
                                <Bar dataKey="stdVol" name="Tabela Padrão" stackId="a" fill={colors.standard} barSize={48} />
                                <Bar dataKey="promoVol" name="Promocional" stackId="a" fill={colors.promo} barSize={48} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* NEW SECTION: CAMPAIGN EFFECTIVENESS ANALYSIS */}
            <div className="bg-white dark:bg-sle-darkCard rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                     <h3 className="text-xl font-bold text-slate-800 dark:text-white">Análise de Efetividade da Campanha</h3>
                     <p className="text-sm text-slate-500">Comparação estrita: <strong>{compensationStats.currentLabel}</strong> vs <strong>{compensationStats.prevLabel}</strong> (Dias Selecionados)</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                    
                    {/* LEFT: REVENUE BRIDGE */}
                    <div className="flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">Resultado Financeiro (Faturamento)</h4>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {isPositive ? '+' : ''}{formatCurrency(compensationStats.gap)} ({((compensationStats.gap / (compensationStats.prevTotal || 1)) * 100).toFixed(1)}%)
                            </span>
                        </div>
                        <div className="h-[250px] w-full bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 relative">
                            <ResponsiveContainer>
                                <BarChart data={compensationStats.chartData} barSize={60} margin={{ top: 30, right: 0, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontSize: 12}} dy={10} />
                                    <YAxis hide />
                                    <Tooltip content={<CustomTooltip format="currency" />} cursor={{fill: 'transparent'}} />
                                    <Bar dataKey="stdRev" stackId="a" fill={colors.standard} name="Tabela Padrão" />
                                    <Bar dataKey="promoRev" stackId="a" fill={colors.promo} name="Tabela Promo" radius={[4, 4, 0, 0]}>
                                      <LabelList dataKey="total" position="top" formatter={(v: number) => formatCurrency(v)} style={{fill: darkMode ? '#fff' : '#334155', fontWeight: 'bold', fontSize: '12px'}} />
                                    </Bar>
                                    {/* Reference Line for Target */}
                                    <ReferenceLine y={compensationStats.prevTotal} stroke={isPositive ? colors.success : colors.danger} strokeDasharray="5 5" />
                                </BarChart>
                            </ResponsiveContainer>
                            <div className="absolute top-2 right-4 text-xs font-bold text-slate-400">Meta ({compensationStats.prevLabel})</div>
                        </div>
                        <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-md border border-indigo-100 dark:border-indigo-800 text-xs text-indigo-800 dark:text-indigo-200">
                             <strong>Conclusão:</strong> {isPositive 
                                ? "Sucesso! O volume extra gerado pela promoção compensou a redução de preço e superou o faturamento do período anterior." 
                                : "Atenção. O aumento de volume ainda não foi suficiente para cobrir o desconto. É necessário aumentar a conversão nas rotas deficitárias."}
                        </div>
                    </div>

                    {/* RIGHT: IMPACT BY ROUTE */}
                    <div className="flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase">Impacto por Rota (Maiores Variações)</h4>
                            <span className="text-xs text-slate-400">Ordenado por variação de R$</span>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[300px]">
                            {compensationStats.routeAnalysis.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between mb-3 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-800">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-slate-800 dark:text-white">{item.route}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${item.delta >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                {item.delta >= 0 ? '▲' : '▼'} {Math.abs(item.growth).toFixed(0)}%
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            {compensationStats.prevLabel}: {formatCurrency(item.prev)} → {compensationStats.currentLabel}: {formatCurrency(item.current)}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-bold ${item.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {item.delta > 0 ? '+' : ''}{formatCurrency(item.delta)}
                                        </div>
                                        <div className="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-2 ml-auto overflow-hidden">
                                            <div 
                                                className={`h-full ${item.delta >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                                                style={{width: `${Math.min(Math.abs(item.growth), 100)}%`, backgroundColor: item.delta >= 0 ? colors.success : colors.danger}}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>

          </div>
        )}

        {activeTab === 'operational' && (
          <div className="space-y-6 animate-fadeIn">
             
             {/* PIVOT TABLE: ROUTES */}
             <div className="bg-white dark:bg-sle-darkCard rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/30">
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">Performance por Rota</h3>
                        <p className="text-xs text-slate-500">Comparativo direto: Tabela Padrão vs Promoção (Baseado nos filtros)</p>
                    </div>
                    <button className="text-xs font-bold text-sle-primary hover:underline">Exportar CSV</button>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-sm text-left">
                      <thead className="bg-white dark:bg-sle-darkCard text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider">
                         <tr>
                            <th className="px-6 py-4">Rota</th>
                            <th className="px-6 py-4 text-center bg-slate-50/50 dark:bg-slate-800/50">Part. Promo</th>
                            <th className="px-6 py-4 text-right">Vol Padrão</th>
                            <th className="px-6 py-4 text-right text-rose-600 dark:text-rose-400">Vol Promo</th>
                            <th className="px-6 py-4 text-right">R$/kg Padrão</th>
                            <th className="px-6 py-4 text-right text-rose-600 dark:text-rose-400">R$/kg Promo</th>
                            <th className="px-6 py-4 text-center">Var. Preço %</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                         {routePerformance.map((row: any, i: number) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                               <td className="px-6 py-3 font-bold text-slate-700 dark:text-slate-200">{row.route}</td>
                               <td className="px-6 py-3 text-center bg-slate-50/50 dark:bg-slate-800/50">
                                   <div className="w-20 mx-auto h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                       <div className="h-full bg-rose-500" style={{width: `${row.sharePromo * 100}%`}}></div>
                                   </div>
                                   <span className="text-[10px] text-slate-500 mt-1 block">{(row.sharePromo * 100).toFixed(0)}%</span>
                               </td>
                               <td className="px-6 py-3 text-right text-slate-600 dark:text-slate-400">{formatNumber(row.stdVol)}</td>
                               <td className="px-6 py-3 text-right font-medium text-rose-600 dark:text-rose-400">{formatNumber(row.promoVol)}</td>
                               <td className="px-6 py-3 text-right font-mono text-xs">{formatCurrency(row.stdYield)}</td>
                               <td className="px-6 py-3 text-right font-mono text-xs text-rose-600 dark:text-rose-400">{formatCurrency(row.promoYield)}</td>
                               <td className="px-6 py-3 text-center">
                                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                      (row.promoYield - row.stdYield) < -2 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                     {((row.promoYield - row.stdYield) / (row.stdYield || 1) * 100).toFixed(0)}%
                                  </span>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
             
             {/* RAW DATA LIST */}
             <ShipmentList data={rawData} />
          </div>
        )}

      </main>
    </div>
  );
}

export default App;