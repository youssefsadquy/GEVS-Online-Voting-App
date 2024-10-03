import React, { useEffect, useState } from 'react';
import axios from 'axios';

// Open data API 
function ElectionResults() {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get('/gevs/results')
      .then(response => setData(response.data))
      .catch(error => console.error(error));
  }, []);

  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}

export default ElectionResults;