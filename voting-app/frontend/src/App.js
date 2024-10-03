import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './LandingPage';
import VoterDashboard from './VoterDashboard';
import ElectionCommissionDashboard from './ElectionCommissionDashboard';
import ConstituencyResults from './ConstituencyResults';
import ElectionResults from './ElectionResults';
import 'bootstrap/dist/css/bootstrap.min.css';

import { AuthProvider, useAuth } from './AuthContext';

// Routes declaration with protection
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/voter-dashboard" element={<ProtectedRoute component={VoterDashboard} />} />
          <Route path="/election-commission-dashboard" element={<ProtectedRoute component={ElectionCommissionDashboard} isEcoRoute={true} />} />
          <Route path="/gevs/constituency/:constituencyName" element={<ConstituencyResults />} />
          <Route path="/gevs/results" element={<ElectionResults />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

// Protect routes and pass the currentUser's UID
function ProtectedRoute({ component: Component, isEcoRoute = false }) {
  const { currentUser, isElectionOfficer } = useAuth(); 

  // If it's an election commission officer route, only the ECO can access it
  if (isEcoRoute && !isElectionOfficer()) {
    return <LandingPage />;
  }
  
  // Non-ECO routes any logged-in user can access
  return currentUser ? <Component userId={currentUser.uid} /> : <LandingPage />;
}

export default App;