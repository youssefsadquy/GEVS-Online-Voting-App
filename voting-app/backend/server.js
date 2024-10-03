const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
const axios = require("axios");

// Initialize Express
const app = express();
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

// Firebase REST API key
const FIREBASE_API_KEY = "AIzaSyBYAYDE7X6lUbhYuCg_XldUHLHk7WGkg5w";

// Firebase admin setup
const serviceAccount = require("./gevs-votingwebapp-firebase-adminsdk-afw73-b00ae1b4ca.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Securing endpoints
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) {
    return res
      .status(401)
      .json("Authentication token not provided");
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Error verifying token:", error);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Check Email Exists Endpoint
app.post("/checkEmailExists", async (req, res) => {
  const { email } = req.body;

  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    if (userRecord) {
      res.json({ emailExists: true });
    }
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      res.json({ emailExists: false });
    } else {
      res.status(500).send("Internal Server Error");
    }
  }
});

// Validate Token Endpoint
app.get("/validateToken", authenticate, async (req, res) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    if (decodedToken) {
      res.json({
        isValid: true,
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
        },
      });
    } else {
      res.json({ isValid: false });
    }
  } catch (error) {
    console.error("Error verifying token:", error);
    res.status(500).json({ message: "Error verifying token" });
  }
});

// Login Endpoint
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Make a request to Firebase REST API for authentication
    const firebaseResponse = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        email,
        password,
        returnSecureToken: true,
      }
    );

    const userData = firebaseResponse.data;

    res.json({
      message: "Login successful",
      user: {
        uid: userData.localId,
        email: userData.email,
        token: userData.idToken,
      },
    });
  } catch (error) {
    if (error.response) {
      // Firebase errors are returned
      const message = error.response.data.error.message;
      res.status(401).json({ message: `Authentication failed: ${message}` });
    } else {
      // For non-Firebase errors
      console.error("Server Error", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
});

// Signup Endpoint
app.post("/signup", async (req, res) => {
  const { email, password, fullName, dateOfBirth, constituency, uvc } =
    req.body;

  try {
    // Create user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
    });

    // Additional user data to store in Firestore
    const userData = {
      voter_id: userRecord.uid,
      full_name: fullName,
      DOB: dateOfBirth,
      constituency: constituency,
      UVC: uvc,
      hasVoted: false,
      votedFor: null,
    };

    // Store user data in Firestore
    await admin.firestore().collection("voters").doc(userRecord.uid).set(userData);

    // Update the UVC 'used'
    const uvcRef = admin.firestore().collection("uvc_codes").where("UVC", "==", uvc);
    const uvcSnapshot = await uvcRef.get();

    if (!uvcSnapshot.empty) {
      // If the UVC exists
      const uvcDocRef = uvcSnapshot.docs[0].ref;
      await uvcDocRef.update({ used: true });
      res.status(201).send("User created successfully");
    } else {
      res.status(400).send("UVC not found or already used");
    }

  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      ``
      res.status(400).send("Email already in use");
    } else {
      res.status(500).send("Internal Server Error");
    }
  }
});

app.post("/validateUVC", async (req, res) => {
  const { uvc } = req.body;

  try {
    // Firestore uvc_codes collection where the UVC field matches the provided UVC
    const uvcQuerySnapshot = await admin
      .firestore()
      .collection("uvc_codes")
      .where("UVC", "==", uvc)
      .get();

    if (uvcQuerySnapshot.empty) {
      // UVC not found
      res.json({
        isValid: false,
        message: "Invalid UVC. Please check your code.",
      });
    } else {
      // UVC found
      const uvcDocData = uvcQuerySnapshot.docs[0].data();

      if (uvcDocData.used) {
        // UVC has already been used
        res.json({
          isValid: false,
          message: "This UVC has already been used.",
        });
      } else {
        // UVC is valid and has not been used
        res.json({ isValid: true, message: "" });
      }
    }
  } catch (error) {
    console.error("Error validating UVC:", error);
    res.status(500).send("Error validating UVC. Please try again.");
  }
});

// VOTER DASHBOARD

app.post("/logout", authenticate, (req, res) => {
  // Clear the Authorization from requests
  delete axios.defaults.headers.common["Authorization"];

  // Logout successful
  res.status(200).send({ message: "Logout successful" });
});

app.get("/electionDetails", authenticate, async (req, res) => {
  try {
    const electionRef = admin.firestore().doc("election/15RuHKXAhOG6omd7ARR7");
    const docSnap = await electionRef.get();
    if (docSnap.exists) {
      const data = docSnap.data();
      const startTime = data.start_time
        ? data.start_time.toDate().toLocaleString()
        : "Not started";
      const endTime = data.end_time
        ? data.end_time.toDate().toLocaleString()
        : "Not ended";
      res.json({
        electionStatus: data.electionStatus,
        startTime: startTime,
        endTime: endTime,
      });
    } else {
      res.status(404).send("Election details not found");
    }
  } catch (error) {
    console.error("Error fetching election details:", error);
    res.status(500).send("Internal Server Error: " + error.message);
  }
});

app.get("/getVoterInfo/:userId", authenticate, async (req, res) => {
  const { userId } = req.params;
  try {
    const votersQuery = admin
      .firestore()
      .collection("voters")
      .where("voter_id", "==", userId);
    const querySnapshot = await votersQuery.get();
    if (!querySnapshot.empty) {
      const voterData = querySnapshot.docs[0].data();
      let responseData = {
        constituency: voterData.constituency,
        hasVoted: voterData.hasVoted,
        full_name: voterData.full_name,
        selectedCandidateName: null,
      };

      // If the voter has voted, fetch the candidate's name
      if (voterData.hasVoted && voterData.votedFor) {
        const candidateDocRef = admin
          .firestore()
          .doc("candidates/" + voterData.votedFor);
        const candidateDocSnap = await candidateDocRef.get();
        if (candidateDocSnap.exists) {
          responseData.selectedCandidateName = candidateDocSnap.data().name;
        }
      }

      res.json(responseData);
    } else {
      res.status(404).send("Voter information not found");
    }
  } catch (error) {
    console.error("Error fetching voter info:", error);
    res.status(500).send("Internal Server Error: " + error.message);
  }
});

app.get("/getCandidates/:constituency", authenticate, async (req, res) => {
  const { constituency } = req.params;
  try {
    const candidatesQuery = admin
      .firestore()
      .collection("candidates")
      .where("constituency", "==", constituency);
    const querySnapshot = await candidatesQuery.get();
    const candidates = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(candidates);
  } catch (error) {
    console.error("Error fetching candidates:", error);
    res.status(500).send("Internal Server Error: " + error.message);
  }
});

app.post("/castVote", authenticate, async (req, res) => {
  const { userId, selectedCandidate } = req.body;
  try {
    // Update the candidate vote count
    const candidateRef = admin
      .firestore()
      .doc(`candidates/${selectedCandidate}`);
    await candidateRef.update({
      vote_count: admin.firestore.FieldValue.increment(1),
    });

    // Update the voter
    const votersQuery = admin
      .firestore()
      .collection("voters")
      .where("voter_id", "==", userId);
    const querySnapshot = await votersQuery.get();
    if (!querySnapshot.empty) {
      const voterDocRef = querySnapshot.docs[0].ref;
      await voterDocRef.update({ hasVoted: true, votedFor: selectedCandidate });

      // Return the name of the selected candidate
      const selectedCandidateDoc = await candidateRef.get();
      const selectedCandidateName = selectedCandidateDoc.exists
        ? selectedCandidateDoc.data().name
        : "";

      res.json({ message: "Vote cast successfully", selectedCandidateName });
    } else {
      res.status(404).send("Voter not found");
    }
  } catch (error) {
    console.error("Error casting vote:", error);
    res.status(500).send("Internal Server Error: " + error.message);
  }
});

// ECO DASHBOARD

// Endpoint to reset all candidate votes to 0 and reset voters voting status
app.post("/resetVotes", authenticate, async (req, res) => {
  try {
    // Start a batch for candidates
    const candidatesQuery = admin.firestore().collection("candidates");
    const candidatesSnapshot = await candidatesQuery.get();
    const candidatesBatch = admin.firestore().batch();

    // Set each candidate vote_count to 0
    candidatesSnapshot.forEach((doc) => {
      candidatesBatch.update(doc.ref, { vote_count: 0 });
    });

    // Start a batch for voters
    const votersQuery = admin.firestore().collection("voters");
    const votersSnapshot = await votersQuery.get();
    const votersBatch = admin.firestore().batch();
    // Set each voter's hasVoted to false and votedFor to null
    votersSnapshot.forEach((doc) => {
      votersBatch.update(doc.ref, { hasVoted: false, votedFor: null });
    });

    await Promise.all([candidatesBatch.commit(), votersBatch.commit()]);

    res.status(200).send("Votes reset successfully");
  } catch (error) {
    console.error("Error resetting votes:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Endpoint to reset all party seats to 0
app.post('/resetPartySeats', authenticate, async (req, res) => {
  try {
    const partyQuery = admin.firestore().collection('parties');
    const querySnapshot = await partyQuery.get();
    const batch = admin.firestore().batch();

    querySnapshot.forEach((doc) => {
      batch.update(doc.ref, { seatsWon: 0 });
    });

    await batch.commit();
    res.status(200).send("Party seats reset successfully");
  } catch (error) {
    console.error("Error resetting party seats:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Endpoint to fetch candidates info
app.get('/getCandidates', authenticate, async (req, res) => {
  try {
    const candidatesSnapshot = await admin.firestore().collection('candidates').get();
    const candidates = candidatesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(candidates);
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Endpoint to update seatsWon

app.post('/updatePartySeats', authenticate, async (req, res) => {
  try {
    const { constituencyWinners } = req.body;
    const partySeatUpdates = {};

    // Calculate the seats won by each party
    Object.values(constituencyWinners).forEach(winner => {
      const { party } = winner;
      partySeatUpdates[party] = (partySeatUpdates[party] || 0) + 1;
    });

    // Update the seatsWon in the database for each party
    for (const [partyName, seatsWon] of Object.entries(partySeatUpdates)) {
      const partyQuery = admin.firestore().collection('parties').where('name', '==', partyName);
      const querySnapshot = await partyQuery.get();

      if (!querySnapshot.empty) {
        const partyDocRef = querySnapshot.docs[0].ref;
        await partyDocRef.update({ seatsWon });
      } else {
        console.log(`No party found with the name ${partyName}`);
      }
    }

    res.send('Party seats updated successfully');
  } catch (error) {
    console.error('Error updating party seats:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Endpoint to determine party winner on end election
app.get('/determineOverallWinner', authenticate, async (req, res) => {
  try {
    // Fetch the total number of constituencies
    const constituencySnapshot = await admin.firestore().collection('constituencies').get();
    const totalConstituencies = constituencySnapshot.size;

    // Fetch party data
    const partySnapshot = await admin.firestore().collection('parties').get();
    let maxSeats = 0;
    let overallWinner = 'Hung Parliament';

    partySnapshot.forEach(doc => {
      const partyData = doc.data();
      if (partyData.seatsWon > maxSeats) {
        maxSeats = partyData.seatsWon;
        overallWinner = partyData.name;
      }
    });

    // Check for majority
    const hasMajority = maxSeats > totalConstituencies / 2;
    const winner = hasMajority ? overallWinner : 'Hung Parliament';

    res.json({ overallWinner: winner });
  } catch (error) {
    console.error('Error determining overall winner:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Endpoint to start the election
app.post('/startElection', authenticate, async (req, res) => {
  try {
    const electionRef = admin.firestore().doc('election/15RuHKXAhOG6omd7ARR7');
    const currentTimestamp = admin.firestore.FieldValue.serverTimestamp();

    // Update election to start the election
    await electionRef.update({
      electionStatus: "active",
      start_time: currentTimestamp,
      end_time: null,
      winner: "Pending",
      status: "Pending",
    });

    res.send('Election started successfully');
  } catch (error) {
    console.error("Error starting the election: ", error);
    res.status(500).send('Internal Server Error');
  }
});

// Endpoint to end  the election
app.post('/endElection', authenticate, async (req, res) => {
  try {
    const electionRef = admin.firestore().doc('election/15RuHKXAhOG6omd7ARR7');
    const currentTimestamp = admin.firestore.FieldValue.serverTimestamp();

    // Update election to end the election
    await electionRef.update({
      electionStatus: "ended",
      end_time: currentTimestamp,
      status: "Completed",
    });

    res.send('Election ended successfully');
  } catch (error) {
    console.error("Error ending the election: ", error);
    res.status(500).send('Internal Server Error');
  }
});

// CHART ENDPOINT

// Endpoint to fetch parties data Firebase
app.get('/parties', authenticate, async (req, res) => {
  try {
    const partySnapshot = await admin.firestore().collection('parties').get();
    const parties = partySnapshot.docs.map(doc => doc.data());

    // Response with the parties data
    res.json(parties);
  } catch (error) {
    console.error('Error fetching parties:', error);
    res.status(500).send('Internal Server Error');
  }
});


// TASK 2 ENDPOINTS

async function getVoteCountByConstituency(constituencyName) {
  // Fetch all candidates and then filter
  const candidatesSnapshot = await admin
    .firestore()
    .collection("candidates")
    .get();
  const voteCounts = candidatesSnapshot.docs
    .map((doc) => {
      let candidate = doc.data();
      // Compare constituency names in a case-insensitive
      if (
        candidate.constituency.toLowerCase() === constituencyName.toLowerCase()
      ) {
        return {
          name: candidate.name,
          party: candidate.party,
          vote: candidate.vote_count.toString(),
        };
      }
    })
    .filter(Boolean);

  return {
    constituency: constituencyName.split("-").join("-"),
    result: voteCounts,
  };
}

app.get("/gevs/constituency/:constituencyName", async (req, res) => {
  const { constituencyName } = req.params;

  const formattedConstituencyName = decodeURIComponent(
    constituencyName
  ).replace(/_/g, "-");

  try {
    const results = await getVoteCountByConstituency(formattedConstituencyName);
    // Return a formatted JSON response
    res.json(results);
  } catch (error) {
    console.error("Error getting vote count by constituency: ", error);
    res.status(500).send(error);
  }
});

app.get("/gevs/results", async (req, res) => {
  try {
    // Query to get all parties and their seatsWon
    const partyQuerySnapshot = await admin
      .firestore()
      .collection("parties")
      .get();
    const seats = partyQuerySnapshot.docs.map((doc) => {
      return { party: doc.data().name, seat: doc.data().seatsWon.toString() };
    });

    // Query the election for status and winner
    const electionSnapshot = await admin
      .firestore()
      .collection("election")
      .get();
    const electionData = electionSnapshot.docs[0].data();

    // Response constructor
    const response = {
      status: electionData.status || "Ongoing",
      winner: electionData.winner || "Undetermined",
      seats: seats,
    };

    res.json(response);
  } catch (error) {
    console.error("Error getting election results: ", error);
    res.status(500).send(error);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});