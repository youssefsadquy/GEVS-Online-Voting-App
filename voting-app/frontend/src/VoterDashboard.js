import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "./AuthContext";
import "bootstrap/dist/css/bootstrap.min.css";

function VoterDashboard({ userId }) {
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [selectedCandidateName, setSelectedCandidateName] = useState("");
  const [hasVoted, setHasVoted] = useState(false);
  const [voterConstituency, setVoterConstituency] = useState("");
  const [voterName, setVoterName] = useState("");
  const navigate = useNavigate();
  const [electionStatus, setElectionStatus] = useState("pending");
  const [electionStartTime, setElectionStartTime] = useState(null);
  const [electionEndTime, setElectionEndTime] = useState(null);
  const { logout } = useAuth();

  // Election details
  useEffect(() => {
    const fetchElectionDetailsFromServer = async () => {
      try {
        const response = await axios.get(
          "http://localhost:5000/electionDetails"
        );
        const data = response.data;
        setElectionStatus(data.electionStatus);
        setElectionStartTime(data.startTime);
        setElectionEndTime(data.endTime);
      } catch (error) {
        console.error("Error fetching election details: ", error);
      }
    };

    fetchElectionDetailsFromServer();
  }, []);

  // Voter info
  const fetchVoterInfoFromServer = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/getVoterInfo/${userId}`
      );
      const voterData = response.data;
      if (voterData) {
        setVoterConstituency(voterData.constituency);
        setHasVoted(voterData.hasVoted);
        setVoterName(voterData.full_name);
        setSelectedCandidateName(
          voterData.selectedCandidateName ||
          "You did not vote in this election."
        );
      }
    } catch (error) {
      console.error("Error fetching voter info: ", error);
    }
  };

  // Data persist
  useEffect(() => {
    if (userId) {
      fetchVoterInfoFromServer();
    }
  }, [userId]);

  // Find constituency candidates
  useEffect(() => {
    const fetchCandidatesFromServer = async () => {
      if (voterConstituency) {
        try {
          const response = await axios.get(
            `http://localhost:5000/getCandidates/${voterConstituency}`
          );
          setCandidates(response.data);
        } catch (error) {
          console.error("Error fetching candidates: ", error);
        }
      }
    };

    if (voterConstituency) {
      fetchCandidatesFromServer();
    }
  }, [voterConstituency]);

  // Cast vote 
  const castVote = async () => {
    if (selectedCandidate && !hasVoted) {
      const isConfirmed = window.confirm("Are you sure you want to cast your vote? The vote cannot be amended.");
      if (isConfirmed) {
        try {
          const response = await axios.post("http://localhost:5000/castVote", {
            userId,
            selectedCandidate,
          });
          const data = response.data;
          setHasVoted(true);
          setSelectedCandidateName(data.selectedCandidateName);
        } catch (error) {
          console.error("Error casting vote: ", error);
        }
      }
    }
  };

  // Cast vote
  const handleLogout = async () => {
    try {
      await axios.post("http://localhost:5000/logout", { userId });

      await logout();
      localStorage.removeItem("token");
      navigate("/");
    } catch (error) {
      console.error("Error logging out: ", error);
    }
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container-fluid d-flex justify-content-between">
          <span className="navbar-brand mb-2 mt-2 h1 d-flex justify-content-center flex-grow-1 flex-lg-grow-0">
            Voter Dashboard
          </span>
          <button
            className="btn mb-1 mt-1 btn-light d-lg-none"
            onClick={handleLogout}
          >
            Logout
          </button>
          <button
            className="btn mb-2 mt-2 btn-light d-none d-lg-block"
            style={{ maxWidth: "200px" }}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </nav>
      <div className="container mt-4">
        <div className="row">
          <aside className="col-lg-6 mb-4">
            <div className="card shadow">
              <div className="card-header">
                <h3 className="card-title d-flex align-items-center">
                  <i className="bi bi-person-circle me-2"></i> Your Info
                </h3>
              </div>
              <ul className="list-group list-group-flush">
                <li className="list-group-item">
                  <i className="bi bi-person-fill me-2"></i>
                  <strong>Name:</strong> {voterName || "Loading..."}
                </li>
                <li className="list-group-item">
                  <i className="bi bi-map-fill me-2"></i>
                  <strong>Constituency:</strong> {voterConstituency}
                </li>
                <li className="list-group-item">
                  <i className="bi bi-check-circle-fill me-2"></i>
                  <strong>Voted for:</strong> {hasVoted ? <span className="badge bg-success">{selectedCandidateName}</span> : <span className="badge bg-secondary">You did not vote.</span>}
                </li>
              </ul>
            </div>
          </aside>
          <main className="col-lg-6">
            <div className="card shadow">
              <div className="card-header bg-primary text-white">
                <h2 className="card-title">Candidates</h2>
              </div>
              <div className="card-body">
                {electionStatus === "pending" && (
                  <p className="alert alert-warning" role="alert">
                    Election is yet to be started.
                  </p>
                )}
                {electionStatus === "active" && !hasVoted && (
                  <>
                    <p className="alert alert-info" role="alert">
                      The election is ongoing, please cast your vote. Start Time: {electionStartTime}
                    </p>
                    <div className="d-grid gap-2">
                      {candidates.map((candidate) => (
                        <button
                          key={candidate.id}
                          onClick={() => {
                            setSelectedCandidate(candidate.id);
                            setSelectedCandidateName(candidate.name);
                          }}
                          className={`btn ${selectedCandidate === candidate.id ? "btn-success" : "btn-outline-success"} my-1`}
                        >
                          {candidate.name} <span className="badge bg-secondary">{candidate.party}</span>
                        </button>
                      ))}
                      <button
                        onClick={castVote}
                        disabled={!selectedCandidate}
                        className="btn btn-primary mt-3"
                      >
                        Submit Vote
                      </button>
                    </div>
                  </>
                )}
                {electionStatus === "ended" && (
                  <>
                    <p className="alert alert-secondary" role="alert">
                      The election has ended. Thank you for participating! End Time: {electionEndTime}
                    </p>
                    <p className="text-center">
                      {hasVoted && selectedCandidateName ? (
                        <span className="badge bg-success">
                          You have voted for: {selectedCandidateName}
                        </span>
                      ) : (
                        <span className="badge bg-secondary">
                          You did not vote in this election.
                        </span>
                      )}
                    </p>
                  </>
                )}
                {electionStatus === "active" && hasVoted && (
                  <div className="alert alert-success" role="alert">
                    Thank you for voting! Your vote for {selectedCandidateName} has been recorded.
                  </div>
                )}
              </div>
            </div>
          </main>
          {electionStatus === "active" && hasVoted && (
            <section className="col-12 mt-4">
              <div className="card shadow">
                <div className="card-header bg-primary text-white">
                  <h3 className="card-title">Candidate Statistics - {voterConstituency}</h3>
                </div>
                <div className="card-body">
                  <div className="row">
                    {(() => {
                      const totalVotes = candidates.reduce((acc, candidate) => acc + candidate.vote_count, 0);
                      return candidates.map((candidate) => {
                        const votePercentage = totalVotes > 0 ? (candidate.vote_count / totalVotes * 100).toFixed(2) : 0;
                        return (
                          <div key={candidate.id} className="col-md-6 col-lg-4 mb-3">
                            <div className="card h-100">
                              <div className="card-body">
                                <h5 className="card-title">{candidate.name}</h5>
                                <h6 className="card-subtitle mb-2 text-muted">{candidate.party}</h6>
                                <div className="progress">
                                  <div
                                    className="progress-bar"
                                    role="progressbar"
                                    style={{ width: `${votePercentage}%` }}
                                    aria-valuenow={votePercentage}
                                    aria-valuemin="0"
                                    aria-valuemax="100">
                                    {votePercentage}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    })()}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

export default VoterDashboard;
