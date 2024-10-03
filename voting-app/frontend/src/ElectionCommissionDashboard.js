import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";
import { collection, query, onSnapshot, updateDoc, doc, } from "firebase/firestore";
import axios from "axios";
import { useAuth } from "./AuthContext";
import ResultsChart from "./ResultsChart";
import ConstituencyWinnersChart from './ConstituencyWinnersChart';

function ElectionCommissionDashboard() {
  const [electionStatus, setElectionStatus] = useState("");
  const [candidates, setCandidates] = useState([]);
  const navigate = useNavigate();
  const [winner, setWinner] = useState(null);
  const { logout } = useAuth();

  useEffect(() => {
    // Fetch candidates initially from the server
    const fetchCandidatesFromServer = async () => {
      try {
        const response = await axios.get("http://localhost:5000/getCandidates");
        const candidatesData = response.data;
        setCandidates(candidatesData);
        localStorage.setItem("candidates", JSON.stringify(candidatesData));
      } catch (error) {
        console.error("Error fetching candidates:", error);
      }
    };

    // Stored ordered candidates
    const storedCandidates = localStorage.getItem("candidates");
    if (storedCandidates) {
      setCandidates(JSON.parse(storedCandidates));
    } else {
      fetchCandidatesFromServer();
    }

    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(
      collection(db, "candidates"),
      (querySnapshot) => {
        const updatedCandidates = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCandidates(updatedCandidates);
        localStorage.setItem("candidates", JSON.stringify(updatedCandidates));
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch candidates and subscribe to their vote count updates
  useEffect(() => {
    const candidatesQuery = query(collection(db, "candidates"));
    const unsubscribe = onSnapshot(candidatesQuery, (querySnapshot) => {
      const candidatesData = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort((a, b) => b.vote_count - a.vote_count); // Sort by vote count in descending order
      setCandidates(candidatesData);
    });
    return unsubscribe;
  }, []);

  // Group candidates by constituency
  const groupedCandidates = candidates.reduce((group, candidate) => {
    const { constituency } = candidate;
    group[constituency] = group[constituency] || [];
    group[constituency].push(candidate);
    return group;
  }, {});

  // Sort the grouped candidates by vote_count within each constituency
  const sortedGroupedCandidates = Object.keys(groupedCandidates).reduce(
    (sortedGroup, constituency) => {
      sortedGroup[constituency] = groupedCandidates[constituency].sort(
        (a, b) => b.vote_count - a.vote_count
      );
      return sortedGroup;
    },
    {}
  );

  // Function to fetch election details from the server
  const fetchElectionDetailsFromServer = async () => {
    try {
      const response = await axios.get("http://localhost:5000/electionDetails");
      const data = response.data;
      setElectionStatus(data.electionStatus || "pending");
      // Set the winner from the response if available
      if (data.winner) {
        setWinner(data.winner);
        localStorage.setItem("winner", data.winner);
      }
    } catch (error) {
      console.error("Error fetching election details: ", error);
    }
  };

  useEffect(() => {
    // Check localStorage for the winner
    const storedWinner = localStorage.getItem("winner");
    if (storedWinner) {
      setWinner(storedWinner);
    }

    // Fetch initial election details from the server
    fetchElectionDetailsFromServer();

    // Subscribe to real-time updates for election status
    const electionDocRef = doc(db, "election", "15RuHKXAhOG6omd7ARR7");
    const unsubscribe = onSnapshot(electionDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setElectionStatus(data.electionStatus || "Pending");
        setWinner(data.winner || "Pending");
      }
    });

    return () => unsubscribe();
  }, []);

  const updatePartySeats = async (constituencyWinners) => {
    try {
      // Make an API call to update the party seats
      await axios.post("http://localhost:5000/updatePartySeats", {
        constituencyWinners,
      });
      console.log("Party seats updated successfully");
    } catch (error) {
      console.error("Error updating party seats:", error);
    }
  };

  const determineOverallWinner = async () => {
    try {
      // Make an API call to determine the overall winner
      const response = await axios.get(
        "http://localhost:5000/determineOverallWinner"
      );
      const winner = response.data.overallWinner;
      return winner;
    } catch (error) {
      console.error("Error determining overall winner:", error);
      return "Error determining winner";
    }
  };

  // Function to tally votes and determine the election outcome
  const tallyVotesAndDetermineOutcome = async () => {
    // Determine constituency winners, ignoring constituencies with ties or no votes
    const constituencyWinners = candidates.reduce((acc, candidate) => {
      const { constituency, vote_count, party } = candidate;
      // Skip if no votes have been cast
      if (vote_count === 0) {
        return acc;
      }
      // If the constituency already has a candidate with votes, compare the vote counts
      if (acc[constituency]) {
        if (acc[constituency].vote_count < vote_count) {
          // New winner found, update the record
          acc[constituency] = { vote_count, party };
        } else if (acc[constituency].vote_count === vote_count) {
          // It's a tie, remove the winner
          delete acc[constituency];
        }
      } else {
        // No candidate recorded yet, add the current candidate
        acc[constituency] = { vote_count, party };
      }
      return acc;
    }, {});

    // Update the party seats based on constituency winners
    await updatePartySeats(constituencyWinners);

    // Determine the overall winner based on the updated party seats
    const newWinner = await determineOverallWinner();

    // Update the election winner in the database and state
    const electionRef = doc(db, "election", "15RuHKXAhOG6omd7ARR7");
    await updateDoc(electionRef, {
      winner: newWinner,
      electionStatus: "ended",
    });
    setWinner(newWinner);
  };

  // Starting the election
  const handleStartElection = async () => {
    try {
      await axios.post("http://localhost:5000/startElection");
      console.log("Election started successfully");
      setWinner("Pending");
      setElectionStatus("active");
    } catch (error) {
      console.error("Error starting the election: ", error);
      // Handle this error appropriately in your UI
    }
  };

  // Ending election and calling function to calculate winner
  const handleEndElection = async () => {
    try {
      const response = await axios.post("http://localhost:5000/endElection");
      console.log("Election ended successfully");
      setWinner(response.data.winner); // Set the winner based on server response
      await tallyVotesAndDetermineOutcome();
    } catch (error) {
      console.error("Error ending the election: ", error);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem("token");
      navigate("/");
    } catch (error) {
      console.error("Error logging out: ", error);
    }
  };

  const erasePartySeats = async () => {
    const confirmReset = window.confirm(
      "Are you sure you want to reset all party seats to 0?"
    );
    if (confirmReset) {
      try {
        // Make an API call to reset the party seats
        await axios.post("http://localhost:5000/resetPartySeats");
        console.log("Party seats reset successfully");
      } catch (error) {
        console.error("Error resetting party seats: ", error);
      }
    }
  };

  // Resetting all candidates votes
  const eraseCandidateVotes = async () => {
    const confirmReset = window.confirm(
      "Are you sure you want to reset all candidate votes to 0?"
    );
    if (confirmReset) {
      try {
        // Make an API call to reset the votes
        await axios.post("http://localhost:5000/resetVotes");
        console.log("Votes reset successfully");
      } catch (error) {
        console.error("Error resetting votes: ", error);
      }
    }
  };

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
        <div className="container-fluid d-flex justify-content-between">
          <span className="navbar-brand mb-2 mt-2 h1 d-flex justify-content-center flex-grow-1 flex-lg-grow-0">
            Election Commission Dashboard
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
      <div className="container-lg my-4">
        <div className="row g-3">
          <div className="col-sm-6">
            <div className="card shadow">
              <div className="card-header bg-primary text-white">
                <h3 className="card-title mb-2">Election Control Panel</h3>
              </div>
              <div className="card-body">
                <h4 className="mb-3">
                  Current Status: <span className={`badge ${electionStatus === "ended" ? "bg-success" : "bg-secondary"}`}>{electionStatus}</span>
                </h4>
                <div className="d-grid gap-2 d-md-flex justify-content-md-start">
                  <button
                    className={`btn w-100 ${electionStatus === "ended" ? "btn-success" : "btn-outline-secondary"}`}
                    onClick={handleStartElection}
                    disabled={electionStatus === "active"}
                  >
                    Start Election
                  </button>
                  <button
                    className={`btn w-100 ${electionStatus === "active" ? "btn-danger" : "btn-outline-secondary"}`}
                    onClick={handleEndElection}
                    disabled={electionStatus === "Pending" || electionStatus === "ended"}
                  >
                    End Election
                  </button>
                </div>
                <div className="d-grid gap-2 mt-2 d-md-flex justify-content-md-start">
                  <button className="btn w-100 btn-warning" onClick={erasePartySeats}>
                    Erase Party Seats
                  </button>
                  <button className="btn w-100 btn-warning" onClick={eraseCandidateVotes}>
                    Erase Candidates Votes
                  </button>
                </div>
                <div className="card mt-3">
                  <div className="card-body">
                    <h4>Election Outcome:</h4>
                    <h5>Winner: <span className={`badge ${winner ? "bg-info" : "bg-secondary"}`}>{winner || "Pending"}</span></h5>
                  </div>
                </div>
                {electionStatus === "ended" && (
                  <div className="card mt-3">
                    <div className="card-body">
                      <h3 className="text-center mb-4">Election Results</h3>
                      <ResultsChart />
                      <ConstituencyWinnersChart />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="col-sm-6">
            <div className="card shadow">
              <div className="card-header bg-primary text-white">
                <h3 className="card-title mb-2">Real-time Results</h3>
              </div>
              <div className="card-body">
                {Object.entries(sortedGroupedCandidates).map(
                  ([constituency, candidates]) => (
                    <div key={constituency} className="mt-3 card p-3">
                      <h4 className="text-primary">{constituency}</h4>
                      {candidates.map((candidate) => (
                        <div key={candidate.id} className="py-2 d-flex align-items-center justify-content-between border-bottom">
                          <div>
                            <strong className="me-2">{candidate.name}</strong>
                            <span className="badge bg-secondary">{candidate.party}</span>
                          </div>
                          <span className="badge bg-success ms-2">
                            {candidate.vote_count} votes
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ElectionCommissionDashboard;
