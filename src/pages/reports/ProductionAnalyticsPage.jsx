import { useMemo } from 'react';
import { Activity, Cpu, CheckCircle2, XCircle } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { PageHeader } from '../../components/layout/PageHeader';
import { StatCard } from '../../components/dashboard/StatCard';
import { ChartCard } from '../../components/charts/ChartCard';
import { useErpData } from '../../context/ErpDataContext';
import { monthlyProductionTrend } from '../../data/productionData';
import { formatNumber } from '../../utils/formatters';

export function ProductionAnalyticsPage() {
  const { machines, productionEntries } = useErpData();

  const metrics = useMemo(() => {
    const totalActual = productionEntries.reduce((s, e) => s + e.actualQty, 0);
    const totalGood = productionEntries.reduce((s, e) => s + e.goodOutput, 0);
    const totalRejected = productionEntries.reduce((s, e) => s + e.rejectedQty, 0);
    const yieldPct = totalActual > 0 ? ((totalGood / totalActual) * 100).toFixed(1) : '100.0';
    const activeMachines = machines.filter((m) => m.status === 'In Use' || m.status === 'Available');
    const avgEfficiency = activeMachines.length
      ? Math.round(activeMachines.reduce((s, m) => s + m.efficiency, 0) / activeMachines.length)
      : 0;

    return { totalActual, totalGood, totalRejected, yieldPct, avgEfficiency };
  }, [productionEntries, machines]);

  const machineOutputData = useMemo(() => {
    return machines.map((m) => {
      const entries = productionEntries.filter((e) => e.machineId === m.id);
      return {
        name: m.code,
        GoodOutput: entries.reduce((s, e) => s + e.goodOutput, 0),
        Rejected: entries.reduce((s, e) => s + e.rejectedQty, 0),
        Efficiency: m.efficiency,
      };
    });
  }, [machines, productionEntries]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Production Analytics"
        description="Shop floor throughput efficiency, machine yield rates, and monthly output performance."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Actual Output"
          value={formatNumber(metrics.totalActual)}
          sublabel="Across recorded shifts"
          icon={Activity}
          tone="blue"
        />
        <StatCard
          label="First-Pass Yield"
          value={`${metrics.yieldPct}%`}
          sublabel={`${formatNumber(metrics.totalGood)} good units`}
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          label="Avg Machine Efficiency"
          value={`${metrics.avgEfficiency}%`}
          sublabel="Active CNC work centers"
          icon={Cpu}
          tone="blue"
        />
        <StatCard
          label="Total Scrap / Rejected"
          value={formatNumber(metrics.totalRejected)}
          sublabel="Requires process review"
          icon={XCircle}
          tone="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Machine-wise Output & Scrap" subtitle="Good output vs rejected units per machine">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={machineOutputData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="GoodOutput" name="Good Output" fill="#2563EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Rejected" name="Rejected" fill="#DC2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="6-Month Plan vs Actual Trend" subtitle="Historical output trajectory">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyProductionTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line type="monotone" dataKey="planned" name="Planned" stroke="#64748B" strokeWidth={2} />
              <Line type="monotone" dataKey="actual" name="Actual Output" stroke="#2563EB" strokeWidth={2.5} />
              <Line type="monotone" dataKey="rejected" name="Rejected" stroke="#DC2626" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
