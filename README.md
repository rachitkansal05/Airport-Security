# MERN Authentication App

A complete MERN (MongoDB, Express, React, Node.js) authentication application with login, registration, and profile management features.

## Features

- User Registration
- User Login
- JWT Authentication
- Profile Management
- Protected Routes
- Responsive UI

## Tech Stack

- **Frontend**: React, React Router, Formik, Yup, Styled Components
- **Backend**: Node.js, Express.js, MongoDB, Mongoose
- **Authentication**: JWT, bcrypt

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB (local or Atlas)

### Installation

1. Clone the repository
2. Install server dependencies:
   ```bash
   cd server
   npm install
   ```
3. Install client dependencies:
   ```bash
   cd ../client
   npm install
   ```

### Configuration

1. Create a `.env` file in the server directory with the following variables:
   ```
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   PORT=5000
   ```

### Running the Application

#### Development Mode

1. Start the server:
   ```bash
   cd server
   npm run dev
   ```

2. Start the client:
   ```bash
   cd client
   npm start
   ```

3. Access the application at `http://localhost:3000`

## Project Structure

```
mern-auth/
├── client/                 # React frontend
│   ├── public/             # Public assets
│   └── src/
│       ├── components/     # Reusable components
│       ├── context/        # Context API
│       ├── pages/          # Page components
│       ├── styles/         # CSS and styled components
│       └── utils/          # Utility functions
├── server/                 # Node.js backend
│   ├── config/             # Configuration files
│   ├── middleware/         # Express middleware
│   ├── models/             # Mongoose models
│   ├── routes/             # API routes
│   └── server.js           # Entry point
└── README.md
```