import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import PoliceRoute from './components/PoliceRoute';
import VantaBackground from './components/VantaBackground';

import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import AddEmployee from './pages/AddEmployee';
import FileUploadPage from './pages/FileUploadPage';
import PoliceVerificationPage from './pages/PoliceVerificationPage';
import PoliceSubmissionsPage from './pages/PoliceSubmissionsPage';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <VantaBackground>
          <div className="App">
            <Navbar />
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route
                path="/dashboard"
                element={
                  <AdminRoute>
                    <Dashboard />
                  </AdminRoute>
                }
              />
              
              <Route
                path="/register"
                element={
                  <AdminRoute>
                    <Register />
                  </AdminRoute>
                }
              />
              
              <Route
                path="/add-employee"
                element={
                  <AdminRoute>
                    <AddEmployee />
                  </AdminRoute>
                }
              />
              
              <Route 
                path="/profile" 
                element={
                  <PrivateRoute>
                    <Profile />
                  </PrivateRoute>
                } 
              />
              
              <Route 
                path="/file-upload" 
                element={
                  <PrivateRoute>
                    <FileUploadPage />
                  </PrivateRoute>
                } 
              />
              
              <Route 
                path="/police-verification" 
                element={
                  <PoliceRoute>
                    <PoliceVerificationPage />
                  </PoliceRoute>
                } 
              />
              
              <Route 
                path="/police-submissions" 
                element={
                  <PoliceRoute>
                    <PoliceSubmissionsPage />
                  </PoliceRoute>
                } 
              />
              
              <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
          </div>
        </VantaBackground>
      </Router>
    </AuthProvider>
  );
}

export default App;
