import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

// Open data Endpoint
function ConstituencyResults() {
  const [data, setData] = useState(null);
  const { constituencyName } = useParams();

  useEffect(() => {
    axios.get(`/gevs/constituency/${constituencyName}`)
      .then(response => setData(response.data))
      .catch(error => console.error(error));
  }, [constituencyName]);

  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}

export default ConstituencyResults;