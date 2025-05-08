"use client"

import type React from "react"

import { useEffect, useState, useMemo } from "react"
import { format } from "date-fns"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Scatter,
  ScatterChart,
  ZAxis,
} from "recharts"
import { Clock, AlertTriangle, TrendingUp, PieChartIcon, BarChart2 } from "lucide-react"

// Define types for CSV row data
interface CsvRow {
  IDS_alert: string
  End_of_Block: string
  "Response Time": number
  Src_ip: string
  Dst_ip: string
  Signature: string
}

// Define type for summary data
type Summary = {
  signature: string
  count: number
  avg: number
  min: number
  max: number
}

// Define colors for charts
const COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#6366f1",
  "#84cc16",
]

export default function ResponseTimePage() {
  const [data, setData] = useState<CsvRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("dashboard")

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("http://127.0.0.1:5000/api/response-times")
        if (!response.ok) {
          throw new Error("Failed to fetch data")
        }
        const rows = await response.json()
        setData(rows)
      } catch (err) {
        setError("Failed to load data. Please try again later.")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Calculate summary statistics
  const summary: Summary[] = useMemo(() => {
    const groups: { [key: string]: number[] } = {}
    data.forEach((row) => {
      const sig = row.Signature
      const rt = Number(row["Response Time"])
      if (!sig || isNaN(rt)) return
      if (!groups[sig]) groups[sig] = []
      groups[sig].push(rt)
    })
    return Object.entries(groups).map(([signature, times]) => ({
      signature,
      count: times.length,
      avg: Number((times.reduce((a, b) => a + b, 0) / times.length).toFixed(2)),
      min: Math.min(...times),
      max: Math.max(...times),
    }))
  }, [data])

  // Prepare data for time series chart
  const timeSeriesData = useMemo(() => {
    return data
      .filter((row) => row.IDS_alert && row["Response Time"])
      .map((row) => ({
        time: new Date(row.IDS_alert).getTime(),
        responseTime: row["Response Time"],
        signature: row.Signature,
      }))
      .sort((a, b) => a.time - b.time)
  }, [data])

  // Prepare data for pie chart
  const pieChartData = useMemo(() => {
    return summary.map((item) => ({
      name: item.signature,
      value: item.count,
    }))
  }, [summary])

  // Prepare data for scatter plot
  const scatterData = useMemo(() => {
    return data.map((row) => ({
      x: new Date(row.IDS_alert).getTime(),
      y: row["Response Time"],
      z: 1,
      signature: row.Signature,
    }))
  }, [data])

  if (loading) {
    return <LoadingSkeleton />
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-600 font-semibold mb-2">
            <AlertTriangle className="h-5 w-5" />
            Error
          </div>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Clock className="h-8 w-8 text-blue-600" />
        Response Time Analysis
      </h1>

      {/* Custom Tabs */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200">
          <TabButton
            active={activeTab === "dashboard"}
            onClick={() => setActiveTab("dashboard")}
            icon={<BarChart2 className="h-4 w-4" />}
            label="Dashboard"
          />
          <TabButton
            active={activeTab === "details"}
            onClick={() => setActiveTab("details")}
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Alert Details"
          />
          <TabButton
            active={activeTab === "summary"}
            onClick={() => setActiveTab("summary")}
            icon={<TrendingUp className="h-4 w-4" />}
            label="Summary"
          />
          <TabButton
            active={activeTab === "charts"}
            onClick={() => setActiveTab("charts")}
            icon={<PieChartIcon className="h-4 w-4" />}
            label="Charts"
          />
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                title="Total Alerts"
                value={data.length.toString()}
                icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
                description="Total number of alerts detected"
              />
              <StatCard
                title="Avg Response Time"
                value={`${(data.reduce((acc, row) => acc + row["Response Time"], 0) / data.length).toFixed(2)}s`}
                icon={<Clock className="h-5 w-5 text-blue-500" />}
                description="Average time to respond to alerts"
              />
              <StatCard
                title="Unique Signatures"
                value={summary.length.toString()}
                icon={<PieChartIcon className="h-5 w-5 text-purple-500" />}
                description="Number of unique alert signatures"
              />
              <StatCard
                title="Max Response Time"
                value={`${Math.max(...data.map((row) => row["Response Time"]))}s`}
                icon={<TrendingUp className="h-5 w-5 text-red-500" />}
                description="Maximum response time recorded"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <CustomCard
                title="Response Time by Signature"
                description="Average response time for each signature type"
              >
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="signature" angle={-45} textAnchor="end" height={70} tick={{ fontSize: 12 }} />
                      <YAxis label={{ value: "Seconds", angle: -90, position: "insideLeft" }} />
                      <Tooltip formatter={(value) => [`${value}s`, "Avg Response Time"]} />
                      <Legend />
                      <Bar dataKey="avg" name="Avg Response Time" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CustomCard>

              <CustomCard title="Alert Distribution" description="Distribution of alerts by signature">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} alerts`, "Count"]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CustomCard>
            </div>

            <CustomCard title="Response Time Trend" description="Response time trend over time">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timeSeriesData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      type="number"
                      domain={["dataMin", "dataMax"]}
                      tickFormatter={(time) => format(new Date(time), "MM/dd HH:mm")}
                    />
                    <YAxis label={{ value: "Seconds", angle: -90, position: "insideLeft" }} />
                    <Tooltip
                      labelFormatter={(time) => format(new Date(time), "yyyy-MM-dd HH:mm:ss")}
                      formatter={(value) => [`${value}s`, "Response Time"]}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="responseTime"
                      name="Response Time"
                      stroke="#3b82f6"
                      dot={{ r: 3 }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CustomCard>
          </>
        )}

        {/* Details Tab */}
        {activeTab === "details" && (
          <CustomCard title="Response Time Details" description="Detailed information about each alert and response">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Alert Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Block Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Response Time (s)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Src IP
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Dst IP
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Signature
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {row.IDS_alert ? format(new Date(row.IDS_alert), "yyyy-MM-dd HH:mm:ss") : ""}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {row.End_of_Block ? format(new Date(row.End_of_Block), "yyyy-MM-dd HH:mm:ss") : ""}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {row["Response Time"]}s
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-mono">{row.Src_ip}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-mono">{row.Dst_ip}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">{row.Signature}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CustomCard>
        )}

        {/* Summary Tab */}
        {activeTab === "summary" && (
          <CustomCard title="Response Time Summary" description="Statistical summary of response times by signature">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Signature
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Average (s)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Min (s)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                      Max (s)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((row) => (
                    <tr key={row.signature} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{row.signature}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {row.count}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {row.avg}s
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {row.min}s
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {row.max}s
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CustomCard>
        )}

        {/* Charts Tab */}
        {activeTab === "charts" && (
          <div className="grid grid-cols-1 gap-6 mb-6">
            <CustomCard
              title="Response Time Distribution"
              description="Scatter plot showing response times for all alerts"
            >
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      name="Time"
                      domain={["dataMin", "dataMax"]}
                      tickFormatter={(time) => format(new Date(time), "MM/dd HH:mm")}
                      label={{ value: "Time", position: "insideBottomRight", offset: -10 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      name="Response Time"
                      label={{ value: "Response Time (s)", angle: -90, position: "insideLeft" }}
                    />
                    <ZAxis type="number" dataKey="z" range={[60, 400]} />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      formatter={(value, name) => {
                        if (name === "Time") return format(new Date(value as number), "yyyy-MM-dd HH:mm:ss")
                        if (name === "Response Time") return `${value}s`
                        return value
                      }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="bg-white p-2 border border-gray-200 shadow-md rounded-md">
                              <p className="text-sm font-medium">{data.signature}</p>
                              <p className="text-xs text-gray-600">
                                Time: {format(new Date(data.x), "yyyy-MM-dd HH:mm:ss")}
                              </p>
                              <p className="text-xs text-blue-600 font-medium">Response Time: {data.y}s</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Legend />
                    <Scatter name="Response Times" data={scatterData} fill="#3b82f6" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CustomCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CustomCard
                title="Min/Max/Avg Response Times"
                description="Comparison of min, max, and average response times by signature"
              >
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="signature" angle={-45} textAnchor="end" height={70} tick={{ fontSize: 12 }} />
                      <YAxis label={{ value: "Seconds", angle: -90, position: "insideLeft" }} />
                      <Tooltip formatter={(value) => [`${value}s`, ""]} />
                      <Legend />
                      <Bar dataKey="min" name="Min" fill="#10b981" />
                      <Bar dataKey="avg" name="Avg" fill="#3b82f6" />
                      <Bar dataKey="max" name="Max" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CustomCard>

              <CustomCard title="Alert Count by Signature" description="Number of alerts for each signature type">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary} margin={{ top: 20, right: 30, left: 20, bottom: 70 }} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="signature" type="category" width={150} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => [`${value} alerts`, "Count"]} />
                      <Legend />
                      <Bar dataKey="count" name="Alert Count" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CustomCard>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Custom Tab Button component
function TabButton({
  active,
  onClick,
  icon,
  label,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      className={`flex items-center gap-2 px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
        active
          ? "text-blue-600 bg-white border-t border-l border-r border-gray-200"
          : "text-gray-600 hover:text-blue-600 hover:bg-gray-100"
      }`}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  )
}

// Custom Card component
function CustomCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

// Stat card component
function StatCard({
  title,
  value,
  icon,
  description,
}: {
  title: string
  value: string
  icon: React.ReactNode
  description: string
}) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 transition-all duration-200 hover:shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </div>
  )
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-2 mb-6">
        <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
        <div className="h-8 w-64 bg-gray-200 animate-pulse rounded"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 w-24 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-5 w-5 bg-gray-200 animate-pulse rounded-full"></div>
            </div>
            <div className="h-8 w-20 bg-gray-200 animate-pulse rounded mb-2"></div>
            <div className="h-3 w-32 bg-gray-200 animate-pulse rounded"></div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="h-6 w-48 bg-gray-200 animate-pulse rounded mb-2"></div>
          <div className="h-4 w-64 bg-gray-200 animate-pulse rounded"></div>
        </div>
        <div className="p-6">
          <div className="h-80 w-full bg-gray-200 animate-pulse rounded"></div>
        </div>
      </div>
    </div>
  )
}
