import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type ChartDatum = {
  name: string
  value: number
  color: string
}

const AXIS = '#8b97a8'
const GRID = '#1a2330'
const TOOLTIP_STYLE = {
  background: '#131920',
  border: '1px solid #243041',
  borderRadius: 8,
  color: '#e8edf4',
  fontSize: 12,
}

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-56 items-center justify-center text-sm text-[var(--text-muted)]">
      {label}
    </div>
  )
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; payload?: ChartDatum }>
}) {
  if (!active || !payload?.length) return null
  const row = payload[0]
  const name = row.payload?.name ?? row.name ?? ''
  const value = row.value ?? 0
  return (
    <div style={TOOLTIP_STYLE} className="px-3 py-2 shadow-lg">
      <p className="font-medium text-[var(--text)]">{name}</p>
      <p className="text-[var(--text-muted)]">{value} task{value === 1 ? '' : 's'}</p>
    </div>
  )
}

export function StatusDonutChart({ data }: { data: ChartDatum[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (total === 0) return <ChartEmpty label="No tasks to chart yet." />

  return (
    <div className="relative h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-display text-3xl font-bold tracking-tight text-[var(--text)]">{total}</p>
        <p className="text-xs tracking-wide text-[var(--text-muted)] uppercase">Total</p>
      </div>
    </div>
  )
}

export function PriorityBarChart({ data }: { data: ChartDatum[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (total === 0) return <ChartEmpty label="No priority data yet." />

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <XAxis
            dataKey="name"
            tick={{ fill: AXIS, fontSize: 11 }}
            axisLine={{ stroke: GRID }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: AXIS, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip cursor={{ fill: 'rgba(46, 196, 182, 0.06)' }} content={<ChartTooltip />} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function WorkloadBarChart({ data }: { data: ChartDatum[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (total === 0) return <ChartEmpty label="No workload signal yet." />

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
        >
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: AXIS, fontSize: 11 }}
            axisLine={{ stroke: GRID }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={88}
            tick={{ fill: AXIS, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip cursor={{ fill: 'rgba(46, 196, 182, 0.06)' }} content={<ChartTooltip />} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ChartLegend({ data }: { data: ChartDatum[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
      {data.map((d) => (
        <li key={d.name} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span className="size-2.5 rounded-sm" style={{ background: d.color }} />
          <span>
            {d.name} · {d.value}
          </span>
        </li>
      ))}
    </ul>
  )
}
