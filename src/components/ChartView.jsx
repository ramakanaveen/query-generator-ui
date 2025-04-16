import React, { useState } from 'react';
import {
  LineChart, BarChart, Area, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, PieChart, Pie, Cell
} from 'recharts';
import './ChartView.css';
import * as LucideIcons from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

const ChartView = ({ data, columns }) => {
  const [chartType, setChartType] = useState('bar');
  const [xAxis, setXAxis] = useState(columns[0] || '');
  const [yAxis, setYAxis] = useState(() => {
    // Try to find a numeric column for y-axis
    const numericColumn = columns.find(col => 
      data.some(row => typeof row[col] === 'number')
    );
    return numericColumn || columns[1] || '';
  });
  
  // Only show numeric columns for Y-axis
  const numericColumns = columns.filter(col => {
    return data.some(row => typeof row[col] === 'number');
  });
  
  // Prepare data for chart - take at most 100 records for performance
  const chartData = data.slice(0, 100).map(row => {
    const newRow = { ...row };
    // Convert date strings to better labels
    if (typeof row[xAxis] === 'string' && 
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(row[xAxis])) {
      try {
        newRow[xAxis] = new Date(row[xAxis]).toLocaleString();
      } catch(e) {}
    }
    return newRow;
  });

  // For pie chart, we need to aggregate data
  const getPieData = () => {
    const aggregated = {};
    
    data.forEach(row => {
      const key = String(row[xAxis] || 'Unknown');
      if (!aggregated[key]) {
        aggregated[key] = 0;
      }
      // Use numeric value for the size
      const value = typeof row[yAxis] === 'number' ? row[yAxis] : 1;
      aggregated[key] += value;
    });
    
    return Object.entries(aggregated).map(([name, value]) => ({ name, value }));
  };

  // Check if we have valid data for the selected axes
  const hasValidData = chartData.length > 0 && xAxis && yAxis;
  
  return (
    <div className="chart-view">
      <div className="chart-controls">
        <div className="control-group">
          <label>Chart Type:</label>
          <select 
            value={chartType} 
            onChange={(e) => setChartType(e.target.value)}
          >
            <option value="bar">Bar Chart</option>
            <option value="line">Line Chart</option>
            <option value="area">Area Chart</option>
            <option value="pie">Pie Chart</option>
          </select>
        </div>
        
        <div className="control-group">
          <label>X-Axis:</label>
          <select 
            value={xAxis} 
            onChange={(e) => setXAxis(e.target.value)}
          >
            {columns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>
        
        <div className="control-group">
          <label>Y-Axis:</label>
          <select 
            value={yAxis} 
            onChange={(e) => setYAxis(e.target.value)}
            disabled={chartType === 'pie'}
          >
            {numericColumns.length > 0 ? 
              numericColumns.map(col => (
                <option key={col} value={col}>{col}</option>
              )) : 
              columns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))
            }
          </select>
        </div>

        <div className="chart-info">
          {data.length > 100 && (
            <div className="chart-notice">
              <LucideIcons.Info size={14} />
              <span>Showing first 100 records for performance</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="chart-container">
        {!hasValidData ? (
          <div className="empty-chart">
            <LucideIcons.BarChart2 size={32} />
            <p>No valid data for selected chart configuration</p>
          </div>
        ) : chartType === 'bar' ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={yAxis} fill="#0277bd" />
            </BarChart>
          </ResponsiveContainer>
        ) : chartType === 'line' ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={yAxis} stroke="#0277bd" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        ) : chartType === 'area' ? (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey={yAxis} fill="#0277bd" stroke="#0277bd" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={getPieData()}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={150}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {getPieData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => value.toLocaleString()} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default ChartView;