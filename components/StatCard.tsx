import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subValue, icon }) => {
  return (
    <div className="bg-white dark:bg-sle-darkCard rounded-xl p-5 shadow-soft dark:shadow-none border border-transparent dark:border-slate-800 transition-all hover:shadow-lg">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h3>
        <div className="text-slate-400 dark:text-sle-pastelBlue opacity-80">
          {icon}
        </div>
      </div>
      
      <div className="space-y-1">
        <p className="text-2xl font-bold text-sle-textMain dark:text-white tracking-tight">{value}</p>
        {subValue && (
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            {subValue}
          </p>
        )}
      </div>
    </div>
  );
};