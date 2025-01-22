import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, Calendar, Database, Cloud, Upload } from 'lucide-react';
import Papa from 'papaparse';
import _ from 'lodash';

const formatCurrency = (value) => {
  if (value == null) return '$0.00';
  return `$${value.toFixed(2)}`;
};

const formatPercentage = (value, total) => {
  if (!value || !total || total === 0) return '0.0%';
  return `${((value / total) * 100).toFixed(1)}%`;
};

const AzureCostDashboard = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);

  const processCSVData = (results) => {
    try {
      const data = results.data || [];
      
      // Calculate total costs with default value
      const totalCost = _.sumBy(data, 'costInBillingCurrency') || 0;
      
      // Daily costs for trend and average
      const dailyCosts = _(data)
        .groupBy('date')
        .map((items, date) => ({
          date: date || 'Unknown',
          cost: _.sumBy(items, 'costInBillingCurrency') || 0
        }))
        .orderBy(['date'])
        .value();

      // Calculate daily average with safety check
      const dailyAverage = dailyCosts.length > 0 ? totalCost / dailyCosts.length : 0;

      // Find peak usage date with default values
      const peakUsage = _.maxBy(dailyCosts, 'cost') || { date: 'N/A', cost: 0 };

      // Service type breakdown with null checks
      const serviceBreakdown = _(data)
        .groupBy('serviceFamily')
        .map((items, name) => ({
          name: name || 'Others',
          value: _.sumBy(items, 'costInBillingCurrency') || 0
        }))
        .filter(item => item.name !== 'null' && item.name !== 'undefined' && item.value > 0)
        .orderBy(['value'], ['desc'])
        .value();

      // Resource costs with safety checks
      const resourceCosts = _(data)
        .groupBy('resourceId')
        .map((items, resource) => ({
          name: (resource?.split('/').pop() || 'Unnamed').substring(0, 30),
          cost: _.sumBy(items, 'costInBillingCurrency') || 0
        }))
        .filter(item => item.cost > 0)
        .orderBy(['cost'], ['desc'])
        .value();

      // Resource group costs with null checks
      const resourceGroupCosts = _(data)
        .groupBy('resourceGroupName')
        .map((items, name) => ({
          name: (name || 'Unassigned').substring(0, 30),
          cost: _.sumBy(items, 'costInBillingCurrency') || 0
        }))
        .filter(item => 
          item.name !== 'null' && 
          item.name !== 'undefined' && 
          item.cost > 0
        )
        .orderBy(['cost'], ['desc'])
        .take(5)
        .value();

      setDashboardData({
        totalCost,
        dailyAverage,
        serviceBreakdown,
        dailyCosts,
        peakUsage,
        resourceCosts: resourceCosts[0] || { name: 'N/A', cost: 0 },
        resourceGroupCosts,
        topService: serviceBreakdown[0] || { name: 'N/A', value: 0 }
      });
    } catch (err) {
      setError('Error processing data: ' + err.message);
      // Set default data structure in case of error
      setDashboardData({
        totalCost: 0,
        dailyAverage: 0,
        serviceBreakdown: [],
        dailyCosts: [],
        peakUsage: { date: 'N/A', cost: 0 },
        resourceCosts: { name: 'N/A', cost: 0 },
        resourceGroupCosts: [],
        topService: { name: 'N/A', value: 0 }
      });
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setIsLoading(true);
      setError(null);

      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: (results) => {
          processCSVData(results);
          setIsLoading(false);
        },
        error: (error) => {
          setError('Error parsing CSV: ' + error.message);
          setIsLoading(false);
        }
      });
    }
  };

  if (!dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Azure Cost Analysis Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center space-y-4">
              <Upload className="w-16 h-16 text-blue-500" />
              <p className="text-center text-gray-600">
                Upload your Azure usage CSV file to view the cost analysis dashboard
              </p>
              <label className="flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-md cursor-pointer hover:bg-blue-600 transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                Select CSV File
              </label>
              {isLoading && (
                <p className="text-blue-500">Processing file...</p>
              )}
              {error && (
                <p className="text-red-500">{error}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Azure Cost Analysis Dashboard</h1>
        <label className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md cursor-pointer hover:bg-blue-600 transition-colors">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          Upload New File
        </label>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">Monthly Spend</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboardData.totalCost)}</p>
              </div>
              <DollarSign className="text-blue-500" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">Daily Average</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboardData.dailyAverage)}</p>
              </div>
              <TrendingUp className="text-blue-500" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">Top Service</p>
                <p className="text-xl font-bold">{dashboardData.topService?.name || 'N/A'}</p>
                <p className="text-sm text-gray-500">{formatCurrency(dashboardData.topService?.value)}</p>
              </div>
              <Cloud className="text-blue-500" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">Peak Usage Date</p>
                <p className="text-xl font-bold">{dashboardData.peakUsage?.date || 'N/A'}</p>
                <p className="text-sm text-gray-500">{formatCurrency(dashboardData.peakUsage?.cost)}</p>
              </div>
              <Calendar className="text-blue-500" size={24} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">Highest Cost Resource</p>
                <p className="text-xl font-bold">{dashboardData.resourceCosts?.name || 'N/A'}</p>
                <p className="text-sm text-gray-500">{formatCurrency(dashboardData.resourceCosts?.cost)}</p>
              </div>
              <Database className="text-blue-500" size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Daily Cost Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboardData.dailyCosts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="cost" stroke="#2563eb" name="Daily Cost ($)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Services by Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData.serviceBreakdown.slice(0, 5)}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                  >
                    {
                      dashboardData.serviceBreakdown.slice(0, 5).map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={[
                            '#2563eb', // Blue
                            '#16a34a', // Green
                            '#9333ea', // Purple
                            '#ea580c', // Orange
                            '#0d9488'  // Teal
                          ][index]}
                        />
                      ))
                    }
                  </Pie>
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resource Group Costs */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Resource Group Cost Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardData.resourceGroupCosts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="cost" fill="#2563eb" name="Cost ($)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Optimization Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Optimization Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-yellow-50 rounded-lg">
              <AlertTriangle className="text-yellow-500 mr-4" size={24} />
              <div>
                <p className="font-semibold">Resource Group Optimization</p>
                <p className="text-sm text-gray-600">
                  {dashboardData.resourceGroupCosts[0] ? 
                    `${dashboardData.resourceGroupCosts[0].name} has the highest spend at ${formatCurrency(dashboardData.resourceGroupCosts[0].cost)}. Review resource allocation and implement cost controls.` :
                    'No resource group data available for analysis.'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-blue-50 rounded-lg">
              <AlertTriangle className="text-blue-500 mr-4" size={24} />
              <div>
                <p className="font-semibold">Service Usage Analysis</p>
                <p className="text-sm text-gray-600">
                  {dashboardData.topService?.value ? 
                    `${dashboardData.topService.name} accounts for ${formatPercentage(dashboardData.topService.value, dashboardData.totalCost)} of total spend. Consider optimization strategies for this service.` :
                    'No service usage data available for analysis.'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center p-4 bg-green-50 rounded-lg">
              <AlertTriangle className="text-green-500 mr-4" size={24} />
              <div>
                <p className="font-semibold">Peak Usage Optimization</p>
                <p className="text-sm text-gray-600">
                  {dashboardData.peakUsage?.cost ? 
                    `Peak daily cost of ${formatCurrency(dashboardData.peakUsage.cost)} on ${dashboardData.peakUsage.date}. Review workload scheduling and resource scaling policies.` :
                    'No peak usage data available for analysis.'
                  }
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AzureCostDashboard;