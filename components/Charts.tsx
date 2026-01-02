import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell, ReferenceLine } from 'recharts';
import { Trade } from '../utils/analytics';

interface EquityChartProps {
  data: Trade[];
}

export const EquityChart: React.FC<EquityChartProps> = ({ data }) => {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00f3ff" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#00f3ff" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis 
            dataKey="id" 
            tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} 
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} 
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(5, 5, 17, 0.9)', borderColor: '#00f3ff', color: '#fff', borderRadius: '8px', backdropFilter: 'blur(4px)' }}
            itemStyle={{ color: '#00f3ff', fontFamily: 'monospace' }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'EQUITY']}
            labelFormatter={(label) => `TRADE #${label}`}
          />
          <Area 
            type="monotone" 
            dataKey="cumulativeProfit" 
            stroke="#00f3ff" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorEquity)" 
            activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

interface PnLHistogramProps {
  data: Trade[];
}

export const PnLHistogram: React.FC<PnLHistogramProps> = ({ data }) => {
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis hide />
          <YAxis 
            tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} 
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{ backgroundColor: 'rgba(5, 5, 17, 0.9)', borderColor: '#bc13fe', color: '#fff', borderRadius: '8px', backdropFilter: 'blur(4px)' }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'PROFIT']}
            labelFormatter={(label) => `TRADE #${label + 1}`}
          />
          <ReferenceLine y={0} stroke="#475569" />
          <Bar dataKey="profit">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#00ff9f' : '#ff3366'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};