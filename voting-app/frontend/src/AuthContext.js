import React, { useContext, useState, useEffect } from 'react';
import { auth } from './firebase';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import axios from "axios";

const AuthContext = React.createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    async function signup(email, password) {
        return createUserWithEmailAndPassword(auth, email, password);
    }

    // Handle login 
    async function login(email, password) {
        try {
            const response = await axios.post('http://localhost:5000/login', {
                email,
                password
            });
            const { user } = response.data;
            localStorage.setItem('token', user.token);

            // Check if the user is an election commission officer
            const electionOfficerDocRef = doc(db, 'electionCommissionOfficers', user.uid);
            const electionOfficerDocSnapshot = await getDoc(electionOfficerDocRef);

            if (electionOfficerDocSnapshot.exists()) {
                // User is an election commission officer
                setCurrentUser({
                    uid: user.uid,
                    email: user.email,
                    isElectionOfficer: true,
                });
            } else {
                // User is a normal user
                setCurrentUser({
                    uid: user.uid,
                    email: user.email,
                    isElectionOfficer: false,
                });
            }

            axios.defaults.headers.common['Authorization'] = `Bearer ${user.token}`;
            return user;
        } catch (error) {
            const errorMessage = error.response?.data?.error || 'Unable to log in with provided credentials.';
            throw new Error(errorMessage);
        }
    }

    // Logout Endpoint 
    async function logout() {
        try {
            await axios.post('http://localhost:5000/logout', {}, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];

            if (auth && signOut) {
                await signOut(auth);
            }

            setCurrentUser(null);
        } catch (error) {
            console.error('Error during logout:', error);
        }
    }

    function isElectionOfficer() {
        return currentUser && currentUser.isElectionOfficer === true;
    }

    // Authentication Token Endpoint
    useEffect(() => {
        const checkAuthState = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const response = await axios.get('http://localhost:5000/validateToken', {
                        headers: {"Authorization" : `Bearer ${token}`}
                    });
                    if (response.data.isValid) {
                        setCurrentUser({
                            uid: response.data.user.uid,
                            email: response.data.user.email,
                        });
                        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    } else {
                        localStorage.removeItem('token');
                        delete axios.defaults.headers.common['Authorization'];
                        setCurrentUser(null);
                    }
                } catch (error) {
                    console.error("Error validating token:", error);
                    localStorage.removeItem('token');
                    delete axios.defaults.headers.common['Authorization'];
                    setCurrentUser(null);
                }
            }
            setLoading(false);
        };

        checkAuthState();
    }, []);

    const value = {
        currentUser,
        signup,
        login,
        logout,
        isElectionOfficer
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}