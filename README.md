# GradeVault

GradeVault is a sleek, dark-themed dashboard designed to track your academic performance, manage your courses, and calculate target CGPAs. It is built with a **React** frontend and a **FastAPI** Python backend.

---

## 🛠️ First-Time Setup

Follow these steps if you are running the project for the very first time. These instructions are compatible with **Windows**, **Ubuntu**, **Fedora**, and **macOS**.

### Prerequisites
- You must have **Python 3.8+** installed on your system.

### 1. Create a Virtual Environment (Highly Recommended)
Open your terminal/command prompt, navigate to the main `GradeVault` project folder, and run:

**Windows:**
```cmd
python -m venv venv
venv\Scripts\activate
```

**macOS / Linux (Ubuntu/Fedora):**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 2. Install Dependencies
With your virtual environment activated, install the required libraries:
```bash
pip install -r requirements.txt
```

*(Note: On some Linux distributions like Ubuntu, you may need to use `pip3` instead of `pip` if you are not using a virtual environment).*

---

## 🚀 Normal Everyday Use Running

Once you have completed the initial setup, you only need to perform these steps whenever you want to start the app.

### 1. Activate the Virtual Environment
Navigate to the project folder and activate your environment:

**Windows:**
```cmd
venv\Scripts\activate
```

**macOS / Linux:**
```bash
source venv/bin/activate
```

### 2. Start the Server
Navigate into the `backend` directory and start the server:
```bash
cd backend
uvicorn main:app --reload
```

### 3. Open the App
The backend FastAPI server is configured to automatically serve the frontend web application. 
Simply open your web browser and navigate to:
**[http://localhost:8000](http://localhost:8000)**

That's it! Your dashboard is up and running.

---

## Features
- **Modern UI:** Built with Tailwind CSS logic and a beautiful custom glassmorphism design.
- **SGPA & CGPA Tracking:** Dynamic interactive charts visualising your progression over semesters.
- **Grade Simulator:** Easily experiment with different grades for your ungraded courses to see how they impact your overall CGPA.
- **Data Export:** Download a complete JSON backup of your database with one click.
