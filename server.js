const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const connectDB = require('./config/db');
const http = require('http');
const socketIo = require('socket.io');

// Import models
require('./models/User');
require('./models/Team');
require('./models/Competition');
require('./models/Match');
require('./models/Feedback');

// Initialize express app
const app = express();
// TEMPORARY DEBUG MIDDLEWARE - ADD THIS AT THE VERY TOP
app.use((req, res, next) => {
    if (req.url.startsWith('/socket.io')) {
        console.log(`[SERVER_DEBUG] Incoming Socket.IO-related request: ${req.method} ${req.url}`);
        console.log(`[SERVER_DEBUG] Headers: ${JSON.stringify(req.headers)}`);
    }
    next();
});
// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(cors({credentials: true, origin: true}));
app.use(express.urlencoded({ extended: true }));

// This middleware will be added later after io is initialized

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Ensure uploads directory exists
const fs = require('fs');
if (!fs.existsSync('./uploads')){
    fs.mkdirSync('./uploads');
}

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/competitions', require('./routes/competitionRoutes'));
app.use('/api/matches', require('./routes/matchRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/teams', require('./routes/teamRoutes'));
app.use('/api/pdf', require('./routes/pdfRoutes'));


// Error handling middleware
app.use(require('./middleware/errorHandler'));

// Default route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Sports Tournament API' });
});

// Create HTTP server and Socket.IO instance
const server = http.createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS'],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000
});

// Main namespace for real-time updates
const mainNamespace = io.of('/main');

// Store namespace in app for use in routes
app.set('io', io);
app.set('mainNamespace', mainNamespace);

// Main namespace event handlers
mainNamespace.on('connection', (socket) => {
    console.log('Client connected to main namespace');

    socket.on('disconnect', (reason) => {
        console.log('Client disconnected from main namespace:', reason);
    });

    socket.on('error', (error) => {
        console.error('Socket error in main namespace:', error);
    });

    // Add socket to a room based on user ID if provided
    socket.on('join', (userId) => {
        if (userId) {
            socket.join(`user:${userId}`);
            console.log(`User ${userId} joined their room`);
            // Send confirmation back to client
            socket.emit('joined', { userId, room: `user:${userId}` });
        }
    });

    // Handle competition updates
    socket.on('competitionUpdate', (data) => {
        console.log('Competition update received:', data);
        if (data.organizerId) {
            mainNamespace.to(`user:${data.organizerId}`).emit('competitionUpdate', data);
        }
    });
});

// Socket.IO event handlers
io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });

    // Join competition room
    socket.on('joinCompetition', (competitionId) => {
        socket.join(`competition-${competitionId}`);
    });

    // Leave competition room
    socket.on('leaveCompetition', (competitionId) => {
        socket.leave(`competition-${competitionId}`);
    });
});

// Export io instance for use in other files
app.set('io', io);

// This middleware will be moved to before routes

// Start server
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Listen on all network interfaces

server.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
    // Log the actual IP addresses for easier connection
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    console.log('\nAvailable on:');
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip internal and non-IPv4 addresses
            if (net.family === 'IPv4' && !net.internal) {
                console.log(`  http://${net.address}:${PORT}`);
            }
        }
    }
});
