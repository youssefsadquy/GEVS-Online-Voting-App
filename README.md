# GEVS - General Election Voting System

## Overview
The **General Election Voting System (GEVS)** is an online platform designed for the citizens of Shangri-La to facilitate voter registration and enable the casting of votes during elections. Developed in response to the Shangri-La Election Commission's decision to allow online voting, GEVS aims to provide a secure and accessible voting experience for all eligible voters.

Historically, voters were required to present photo ID at polling stations, but many lacked the necessary identification. To address this, GEVS enables online voting, ensuring that all citizens can participate in the democratic process.

## Features
- **Voter Registration**: Users can register by providing their Voter ID, Full Name, Date of Birth, Password, Constituency, and a Unique Voter Code (UVC).
- **Voting**: Once registered, users can cast their vote for a candidate in their constituency. Each voter can only vote once.
- **Election Commission Dashboard**: For authorized personnel to monitor elections and announce results.
- **REST API**: Provides open access to election data and statistics.


## UVC Code List

| Code      | Code      | Code      | Code      | Code      |
|-----------|-----------|-----------|-----------|-----------|
| HH64FWPE  | WL3K3YPT  | ZSRBTK9S  | D5BG6FDH  | 2LJFM6PM  |
| BBMNS9ZJ  | JA9WCMAS  | B7DMPWCQ  | 38NWLPY3  | 2TEHRTHJ  |
| KYMK9PUH  | Z93G7PN9  | YADA47RL  | 556JTA32  | G994LD9T  |
| WPC5GEHA  | RXLNLTA6  | 9GTZQNKB  | LUFKZAHW  | Q452KVQE  |
| 7XUFD78Y  | DBP4GQBQ  | KSM9NB5L  | 75NKUXAH  | 9FCV9RMT  |
| BQCRWTSG  | JF2QD3UF  | BKMKJN5S  | DHKVCU8T  | TH9A6HUB  |
| ML5NSKKG  | 8TEXF2HD  | N6HBFD2X  | PFXB8QXM  | UVE5M7FR  |
| K96JNSXY  | K3EVS3NM  | 5492AC6V  | U5LGC65X  | 7983XU4M  |

## Usage Examples

### For Regular Users:
- **If registered**: Enter your **email address** and **password** to log in.
- **If not registered**: Create an account by filling out the registration form with the following fields:
     - **Email Address**
     - **Full Name**
     - **Date of Birth**
     - **Password**
     - **Constituency** (choose from 4 available options)
     - **Unique Voter Code (UVC)** (you can either enter it manually or scan a QR code)
- Once logged in, you can cast your vote for your selected candidate in your constituency.
- After voting, you can:
   - **View candidate statistics** for your constituency.
   - **Review your account information** and ensure everything is accurate.

### For Admins:
- Log in using the **default admin credentials**:
   - **Username**: election@shangrila.gov.sr
   - **Password**: shangrila2024$
- After logging in, access the **Admin Dashboard**, where you can:
   - Use the **Election Control Panel** to:
     - **Start or end elections**.
     - **Erase party seats** or **reset candidates' votes**.
   - View the **Election Winner** once the voting period concludes.
   - Check the **Election Graph Results** for a visual representation of votes.
   - Monitor **Real-time Election Results** as votes are cast.



## GEVS Open Data REST API
The following HTTP requests are available for accessing election data:

- **Get Constituency Information**:  
  `GET /gevs/constituency/northern-kunlun-mountain`
  
- **Get Election Results**:  
  `GET /gevs/results`

## Prerequisites
Before running the application, ensure you have the following installed:

- Node.js
- npm (Node Package Manager)

## Installation
To install the required dependencies, navigate to the root of the project directory and run the following command:

```bash
npm install
```

## Running the Application
The GEVS application consists of a frontend and a backend, which can be run concurrently or individually, depending on your preference.

### Running Concurrently
To run both the frontend and backend concurrently from the root directory (./voting-app), use the following command:

```bash
npm start
```

This command uses the "concurrently" package to run both parts of the application, starting the frontend (React app) and the backend (Node.js server) simultaneously.

### Running Individually
If you prefer to run the frontend and backend separately, follow these steps:

#### Frontend
Navigate to the ./frontend directory and start the React application:

```bash
cd frontend
npm start
```

#### Backend
In a separate terminal, navigate to the backend directory and start the Node.js server:

```bash
cd backend
node server.js
```

## Additional Information
This project was developed using the following versions of Node.js and npm:

- Node.js: v21.1.0
- npm: v10.2.5