import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./LandingPage.css";
import { useAuth } from "./AuthContext";
import "bootstrap/dist/css/bootstrap.min.css";
import Cookies from 'js-cookie';

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera } from "@fortawesome/free-solid-svg-icons";

import QrScanner from "qr-scanner";

export default function LandingPage() {
  // State for login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // State for signup
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [constituency, setConstituency] = useState("");
  const [uvc, setUVC] = useState("");
  const [signupError, setSignupError] = useState("");
  const [emailValid, setEmailValid] = useState(true);
  const [emailErrorMessage, setEmailErrorMessage] = useState("");
  const [isSignUpEnabled, setIsSignUpEnabled] = useState(true);
  const { login, isElectionOfficer } = useAuth(); // Destructure the login function from useAuth
  const [uvcValid, setUVCValid] = useState(true);
  const [uvcErrorMessage, setUVCErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(true);
  const [showUVCError, setShowUVCError] = useState(false);
  const [showConsentBanner, setShowConsentBanner] = useState(false);


  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);

  const { currentUser } = useAuth();

  const navigate = useNavigate();

  // Function to toggle between login and sign-up forms
  const toggleForm = () => {
    setShowLoginForm(!showLoginForm);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };


  // Function to toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  function toggleScanning() {
    if (!isScanning) {
      // Reset UVC error states when scanning starts
      setUVCErrorMessage("");
      setShowUVCError(false);

      // Start scanning only if qrScanner is available
      qrScannerRef.current
        ?.start()
        .then(() => {
          videoRef.current.style.display = "block";
          setIsScanning(true);
        })
        .catch((error) => {
          console.error("Could not start QR scanner", error);
        });
    } else {
      // Stop scanning
      qrScannerRef.current?.stop();
      videoRef.current.style.display = "none";
      setIsScanning(false);
    }
  }

  useEffect(() => {
    if (uvc && !isScanning) {
      validateUVC(uvc);
    }
  }, [uvc, isScanning]);


  // useEffect for QR Scanner
  useEffect(() => {
    if (!showLoginForm) {
      qrScannerRef.current = new QrScanner(videoRef.current, (result) => {
        setUVC(result);
        setIsScanning(false);
        qrScannerRef.current.stop();
      });

      return () => {
        if (qrScannerRef.current) {
          qrScannerRef.current.stop();
          qrScannerRef.current.destroy();
          qrScannerRef.current = null;
        }
      };
    }
  }, [showLoginForm]);

  // Email field validation
  async function validateEmail(email) {
    setEmailValid(true);
    setEmailErrorMessage("");

    if (!email) {
      setEmailValid(false);
      setEmailErrorMessage("Email address is required.");
      setIsSignUpEnabled(false);
      return;
    }

    // Check if email includes '@'
    if (!email.includes("@")) {
      setEmailValid(false);
      setEmailErrorMessage("Email address must include '@'.");
      setIsSignUpEnabled(false);
      return;
    }

    // Check if email has characters before '@'
    if (email.startsWith("@")) {
      setEmailValid(false);
      setEmailErrorMessage("Please enter part before '@'.");
      setIsSignUpEnabled(false);
      return;
    }

    // Check if email has characters after '@'
    const parts = email.split("@");
    if (parts.length > 1 && parts[1].length === 0) {
      setEmailValid(false);
      setEmailErrorMessage("Please enter part after '@'.");
      setIsSignUpEnabled(false);
      return;
    }

    // Check for a valid domain with a dot
    if (!parts[1].includes(".")) {
      setEmailValid(false);
      setEmailErrorMessage("Domain must include '.'");
      setIsSignUpEnabled(false);
      return;
    }

    // Final regex check for email pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailValid(false);
      setEmailErrorMessage("Please enter a valid email address.");
      setIsSignUpEnabled(false);
      return;
    }

    try {
      // Check Email Exists
      const response = await axios.post(
        "http://localhost:5000/checkEmailExists",
        { email }
      );

      if (response.data.emailExists) {
        setEmailValid(false);
        setEmailErrorMessage(
          "The provided email is already linked to another account."
        );
        setIsSignUpEnabled(false);
      } else {
        setEmailValid(true);
        setEmailErrorMessage("");
        setIsSignUpEnabled(true);
      }
    } catch (error) {
      setEmailValid(false);
      setEmailErrorMessage("Unable to validate email address.");
      setIsSignUpEnabled(false);
    }
  }

  // Check Signup Form Password Min. Lenght
  const handlePasswordChange = (e) => {
    const newSignupPassword = e.target.value;
    setSignupPassword(newSignupPassword);

    // Check password length
    if (newSignupPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
      setIsSignUpEnabled(false); // Disable the Sign Up button if password is too short
    } else {
      setPasswordError(""); // Clear password error if length is sufficient
      setIsSignUpEnabled(confirmPassword === newSignupPassword); // Enable Sign Up button only if passwords match
    }
  };

  // Check Signup Form Password Match
  const handleConfirmPasswordChange = (e) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);

    // Check if the confirm password matches the signup password field
    if (signupPassword && signupPassword !== newConfirmPassword) {
      setPasswordError("Passwords do not match.");
      setIsSignUpEnabled(false); // Disable the Sign Up button if passwords do not match
    } else {
      setPasswordError(""); // Clear password error if passwords match
      setIsSignUpEnabled(true); // Enable the Sign Up button
    }
  };

  // Check if UVC is valid and not used
  async function validateUVC(uvc) {
    try {
      const response = await axios.post("http://localhost:5000/validateUVC", {
        uvc,
      });
      const isValid = response.data.isValid;
      setUVCValid(isValid);

      // Check if the UVC is invalid and update states accordingly
      if (!isValid) {
        setUVCErrorMessage(response.data.message);
        setShowUVCError(true); // Show error if UVC is invalid
        setIsSignUpEnabled(false); // Disable Sign Up if UVC is invalid
      } else {
        setUVCErrorMessage('');
        setShowUVCError(false); // Hide error if UVC is valid
        setIsSignUpEnabled(true); // Enable Sign Up if UVC is valid
      }
      return { isValid: response.data.isValid, message: response.data.message };
    } catch (error) {
      const message = "Error while checking UVC.";
      setUVCValid(false);
      setUVCErrorMessage(message);
      setShowUVCError(true); // Show error on exception
      setIsSignUpEnabled(false);
      return { isValid: false, message: error.message || "Error while checking UVC." };
    }
  }


  // Signup form fields validation
  async function handleSignUpSubmit(e) {
    e.preventDefault();
    setSignupError("");

    // Basic validation checks
    if (signupPassword.length < 6) {
      setSignupError("Password must be at least 6 characters long.");
      setIsSignUpEnabled(false);
      return;
    }

    if (signupPassword !== confirmPassword) {
      setSignupError("Passwords do not match.");
      setIsSignUpEnabled(false);
      return;
    }

    if (!emailValid) {
      setSignupError("Please enter a valid email.");
      setIsSignUpEnabled(false);
      return;
    }

    // Validate the UVC code
    const uvcValidationResponse = await validateUVC(uvc);
    if (!uvcValidationResponse.isValid) {
      setSignupError(uvcValidationResponse.message);
      setIsSignUpEnabled(false);
      return;
    }


    // Continue with the signup process if all validations are passed
    try {
      const signupResponse = await axios.post("http://localhost:5000/signup", {
        email: signupEmail,
        password: signupPassword,
        fullName: fullName,
        dateOfBirth: dateOfBirth,
        constituency: constituency,
        uvc: uvc,
        votedFor: null,
      });

      if (signupResponse.status === 201) {
        // After successful signup, perform login
        try {
          await login(signupEmail, signupPassword);
          navigate("/voter-dashboard"); // Navigate to the dashboard
        } catch (loginError) {
          setLoginError(
            "Failed to log in after signup. Please log in manually."
          );
        }
      } else {
        // Handle any other responses or errors from the signup process
        setSignupError("Failed to create an account. Please try again.");
      }
    } catch (error) {
      // If errors occur during the signup process
      const errorMessage =
        error.response?.data?.error || "An error occurred during signup.";
      setSignupError(errorMessage);
    }
  }

  // Function to handle the login form submission
  async function handleLoginSubmit(e) {
    e.preventDefault();
    setLoginError("");

    try {
      await login(loginEmail, loginPassword);
      Cookies.set('lastLoginName', loginEmail, { expires: 7 });
    } catch (error) {
      setLoginError(
        "Login failed. Please check your credentials and try again."
      );
    }
  }

  // Cookies
  useEffect(() => {
    const consent = Cookies.get('cookieConsent');
    if (!consent) {
      setShowConsentBanner(true);
    } else if (consent === 'true') {
      const lastLoginName = Cookies.get('lastLoginName');
      if (lastLoginName) {
        setLoginEmail(lastLoginName);
      }
    }
  }, []);

  const handleConsent = () => {
    Cookies.set('cookieConsent', 'true', { expires: 365 });
    setShowConsentBanner(false);
  };


  // Effect to handle redirection after login
  useEffect(() => {
    if (currentUser) {
      if (isElectionOfficer()) {
        navigate("/election-commission-dashboard"); // Redirect to the ECO dashboard
      } else {
        navigate("/voter-dashboard"); // Redirect regular users to the voter dashboard
      }
    }
  }, [currentUser, navigate, isElectionOfficer]);

  return (
    <div className="container-sm my-5">
      <header>
        <div className="jumbotron jumbotron-fluid bg-primary text-white text-center py-5">
          <div className="container">
            <h1 className="display-3">GEVS - Online Voting Platform</h1>
          </div>
        </div>
      </header>
      <div className="row mt-3">
        {showLoginForm ? (
          <div className="col-12">
            <div className="card shadow p-4">
              <h2 className="text-center mb-4">Login</h2>
              {loginError && (
                <div className="alert alert-danger">{loginError}</div>
              )}
              <form onSubmit={handleLoginSubmit}>
                <div className="mb-3 input-group">
                  <span className="input-group-text">
                    <i className="bi bi-envelope-fill"></i>
                  </span>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-4 input-group">
                  <span className="input-group-text">
                    <i className="bi bi-lock-fill"></i>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control"
                    placeholder="Password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={togglePasswordVisibility}
                  >
                    <i
                      className={`bi ${showPassword ? "bi-eye-slash-fill" : "bi-eye-fill"
                        }`}
                    ></i>
                  </button>
                </div>
                <button type="submit" className="btn btn-success w-100">
                  Log In
                </button>
              </form>
              <div className="text-center">
                <button
                  className="btn mt-3 btn-primary"
                  onClick={toggleForm}
                >
                  Create Account
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="col-12">
            <div className="card shadow p-4">
              <h2 className="text-center mb-3">Sign Up</h2>
              {signupError && (
                <div className="alert alert-danger">{signupError}</div>
              )}
              <form onSubmit={handleSignUpSubmit}>
                <div className="mb-3 input-group">
                  <span className="input-group-text">
                    <i className="bi bi-envelope-fill"></i>
                  </span>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="Email"
                    value={signupEmail}
                    onChange={(e) => {
                      setSignupEmail(e.target.value);
                      validateEmail(e.target.value);
                    }}
                    required
                  />
                </div>
                {emailErrorMessage && (
                  <p className="alert mt-2 alert-danger">{emailErrorMessage}</p>
                )}
                <div className="mb-3 input-group">
                  <span className="input-group-text">
                    <i className="bi bi-person-fill"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3 input-group">
                  <label htmlFor="dateOfBirth" className="input-group-text">
                    <i className="bi bi-calendar-fill"></i>‎ Date Of Birth
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    id="dateOfBirth"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3 input-group">
                  <span className="input-group-text">
                    <i className="bi bi-lock-fill"></i>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control"
                    placeholder="Password"
                    value={signupPassword}
                    onChange={handlePasswordChange}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={togglePasswordVisibility}
                  >
                    <i className={`bi ${showPassword ? "bi-eye-slash-fill" : "bi-eye-fill"}`}></i>
                  </button>
                </div>
                <div className="mb-3 input-group">
                  <span className="input-group-text">
                    <i className="bi bi-lock-fill"></i>
                  </span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="form-control"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={toggleConfirmPasswordVisibility}
                  >
                    <i className={`bi ${showConfirmPassword ? "bi-eye-slash-fill" : "bi-eye-fill"}`}></i>
                  </button>
                </div>
                {passwordError && (
                  <div className="alert mt-2 alert-danger">{passwordError}</div>
                )}
                <div className="mb-3">
                  <select
                    className="form-select"
                    value={constituency}
                    onChange={(e) => setConstituency(e.target.value)}
                    required
                  >
                    <option value="">Select Constituency</option>
                    <option value="Shangri-la-Town">Shangri-la-Town</option>
                    <option value="Northern-Kunlun-Mountain">
                      Northern-Kunlun-Mountain
                    </option>
                    <option value="Western-Shangri-la">
                      Western-Shangri-la
                    </option>
                    <option value="Naboo-Vallery">Naboo-Vallery</option>
                    <option value="New-Felucia">New-Felucia</option>
                  </select>
                </div>
                <div className="mb-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="UVC"
                    value={uvc}
                    onChange={(e) => {
                      setUVC(e.target.value);
                      validateUVC(e.target.value);
                    }}
                    required
                  />
                  {showUVCError && (
                    <div className="alert mt-2 alert-danger">{uvcErrorMessage}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={toggleScanning}
                  className={`btn ${isScanning ? "btn-danger" : "btn-warning"
                    } w-100 mb-3`}
                >
                  <FontAwesomeIcon icon={faCamera} className="me-2" />
                  {isScanning ? "Stop Scanning" : "Scan QR Code"}
                </button>
                <div
                  className="video-container"
                  style={{ display: isScanning ? "block" : "none" }}
                >
                  <video ref={videoRef} playsInline></video>
                </div>
                <button
                  type="submit"
                  disabled={!isSignUpEnabled}
                  className={`btn btn-success w-100 ${!isSignUpEnabled ? "disabled" : ""
                    }`}
                >
                  Sign Up
                </button>
              </form>
              <div className="text-center">
                <button className="btn mt-3 btn-primary" onClick={toggleForm}>
                  Login Instead
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {showConsentBanner && (
        <div className="modal show d-block" tabIndex="-1" style={{ background: "rgba(0, 0, 0, 0.5)" }}>
          <div className="modal-dialog fixed-bottom mb-0">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Cookie Consent</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" onClick={() => setShowConsentBanner(false)}></button>
              </div>
              <div className="modal-body">
                <p>We use cookies to remember your login information and provide a personalized experience.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary" onClick={handleConsent}>Accept Cookies</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
