import React, { useState, useEffect } from 'react';
import { Doughnut } from 'react-chartjs-2';
import 'chart.js/auto';
import axios from 'axios';

// Election dashboard doghnut chart
const ResultsChart = () => {
  const [chartData, setChartData] = useState({
    datasets: [],
  });
  const chartColors = ['#FF6384', '#36A2EB', '#FFCE56', '#E7E9ED', '#4BC0C0', '#9966FF', '#FF9F40'];

  // Fetch the party data
  useEffect(() => {
    const fetchPartyData = async () => {
      try {
        const response = await axios.get('http://localhost:5000/parties');
        const parties = response.data;

        const backgroundColors = parties.map((_, index) => chartColors[index % chartColors.length]);

        // Assign party data
        setChartData({
          labels: parties.map(p => p.name),
          datasets: [{
            label: 'Seats Won',
            data: parties.map(p => p.seatsWon),
            backgroundColor: backgroundColors,
            borderColor: backgroundColors,
            borderWidth: 1,
          }],
        });
      } catch (error) {
        console.error("Error fetching party data:", error);
      }
    };

    fetchPartyData();
  }, []);

  // Chart configuration
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          boxWidth: 20,
        },
      },
      title: {
        display: true,
        text: 'Election Results',
        font: {
          size: 18
        }
      },
    },
  };

  return (
    <div className="card mb-3">
      <div className="card-header">
        Seats Won By Party
      </div>
      <div className="card-body">
        <Doughnut data={chartData} options={options} />
      </div>
    </div>
  );
};

export default ResultsChart;