# HostelMate

HostelMate is a comprehensive hostel management system that simplifies accommodation and resource management. It provides dedicated portals for both administrators and students.

## Project Structure

The repository contains two main directories:
- `client/`: The React frontend application (built with Vite)
- `server/`: The Node.js/Express backend API

## Tech Stack

### Frontend
- **React 18**
- **Vite**
- **React Router** for navigation
- **Heroicons** for UI icons
- **Cypress** for frontend testing

### Backend
- **Node.js & Express**
- **MongoDB & Mongoose** for database
- **JWT (JSON Web Tokens)** for authentication
- **Bcrypt.js** for password hashing
- **Express Rate Limit** and **Helmet.js** for API security
- **Nodemailer** for email notifications

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher recommended)
- MongoDB running locally or a MongoDB Atlas URI

### 1. Server Setup

Navigate to the server directory:
```bash
cd server
```

Install dependencies:
```bash
npm install
```

Set up your `.env` file in the server directory. At a minimum, you'll need:
```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/hostelmate
JWT_SECRET=your_jwt_secret
```

Optionally, you can seed the database with initial data:
```bash
npm run seed
```

Start the development server:
```bash
npm run dev
```

### 2. Client Setup

Open a new terminal and navigate to the client directory:
```bash
cd client
```

Install dependencies:
```bash
npm install
```

Start the frontend development server:
```bash
npm run dev
```

The frontend application will run on Vite's default port (`http://localhost:5173`).

## Features

### Student Features
- Register an account (requires admin approval)
- Submit and track maintenance requests (e.g., Plumbing, Electrical)
- Make and track resource bookings
- Update profile information

### Admin Features
- Manage and approve pending student registrations
- View and manage all system maintenance requests
- Oversee resource bookings across the hostel
- Secure admin login flow

## API & Guides

For detailed information on the specific endpoints, please refer to the [API Documentation](./API_DOCUMENTATION.md).

Additional documentation:
- [Testing Report](./TESTING_REPORT.md)
- [Manual Testing Guide](./MANUAL_TESTING_GUIDE.md)
- [Validation Guide](./VALIDATION_GUIDE.md)
- [System Improvements](./SYSTEM_IMPROVEMENTS.md)
- [Login Credentials](./LOGIN_CREDENTIALS.md)

---
*Developed for the IT3040 - ITPM assignment.*
