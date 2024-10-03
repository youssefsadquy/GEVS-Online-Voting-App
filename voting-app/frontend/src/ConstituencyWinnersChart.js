import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';
import axios from 'axios';

// Create chart using candidates info and constituencies
const ConstituencyWinnersChart = () => {
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [],
    tooltipLabels: []
  });

  // Endpoint to fetch candidates
  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const response = await axios.get('http://localhost:5000/getCandidates');
        const candidates = response.data;
        processCandidateData(candidates);
      } catch (error) {
        console.error("Error fetching candidates data:", error);
      }
    };

    fetchCandidates();
  }, []);

  // Calculate winner
  const processCandidateData = (candidates) => {
    const constituencyWinners = {};
    // Determine the winner for each constituency
    candidates.forEach(candidate => {
      const { constituency, name, vote_count } = candidate;
      if (!constituencyWinners[constituency] || constituencyWinners[constituency].vote_count < vote_count) {
        constituencyWinners[constituency] = { name, vote_count };
      }
    });

    const chartLabels = Object.keys(constituencyWinners);
    const chartVotes = chartLabels.map(label => constituencyWinners[label].vote_count);
    const tooltipLabels = chartLabels.map(label => constituencyWinners[label].name);

    // Create chart
    setChartData({
      labels: chartLabels,
      datasets: [{
        label: 'Votes',
        data: chartVotes,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      }],
      tooltipLabels: tooltipLabels,
    });
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: function (tooltipItems) {
            // Return the name of the winner on hover item
            return chartData.tooltipLabels[tooltipItems[0].dataIndex];
          },
          label: function (tooltipItem) {
            // Return the vote count for the hovered item
            return `Votes: ${tooltipItem.raw}`;
          }
        }
      },
      title: {
        display: true,
        text: 'Winners in Each Constituency',
      },
    },
    scales: {
      x: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="card">
      <div className="card-header">Constituency Winners</div>
      <div className="card-body">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

export default ConstituencyWinnersChart;