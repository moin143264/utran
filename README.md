# 🏆 Utran – Sports Tournament Manager Backend (Hosted on Vercel)

This is the backend API for **Utran**, a sports tournament management system that allows admins to create tournaments, register teams, auto-generate fixtures, update results, and track points. It is developed using Node.js, Express, and MongoDB, and is deployed on **Vercel** as serverless functions for scalability and ease of deployment.

💻 **GitHub Repo**: https://github.com/moin143264/utran

---

## 🛠️ Technologies Used

- **Node.js** – JavaScript runtime  
- **Express.js** – Web framework for APIs  
- **MongoDB** – NoSQL database for tournament data  
- **Mongoose** – MongoDB ODM for schema definitions  
- **JWT** – For secure authentication and route protection  
- **Vercel** – Serverless deployment platform  
- **CORS, Helmet** – Middleware for security and cross-origin access

---

## 📂 Key Features

✅ RESTful APIs for tournament creation and updates  
✅ Team and player registration APIs  
✅ Auto-generation of round-robin or knockout fixtures  
✅ Score submission and live points table generation  
✅ Admin authentication using JWT  
✅ Public APIs to view fixtures, teams, and results  
✅ Deployed on Vercel for scalability and ease of use

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/moin143264/utran

# Navigate to the project directory
cd utran

# Install dependencies
npm install

# Start development server locally
npm run dev

MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key

/📁 Folder Structure

├── api/                # Vercel function-based API routes
├── models/             # Mongoose models (Tournament, Team, Match)
├── controllers/        # API route logic
├── middleware/         # JWT auth middleware
├── utils/              # Fixture generation, points table logic
├── .env                # Environment variables
📡 API Highlights

| Method | Endpoint                | Function                 |
| ------ | ----------------------- | ------------------------ |
| POST   | `/api/register`         | Admin registration/login |
| POST   | `/api/tournaments`      | Create a new tournament  |
| GET    | `/api/tournaments/:id`  | Get tournament details   |
| POST   | `/api/teams`            | Register a new team      |
| POST   | `/api/fixtures`         | Generate fixtures        |
| PUT    | `/api/results/:matchId` | Submit match result      |
