const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const axios = require('axios');
const bodyParser = require('body-parser');
const { join } = require('node:path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(bodyParser.json());

// Store a map of jobIds by socketId to know where to forward the job updates
const socketToJobMap = {};

// HTTP
// ====

// Serve the index.html file
app.get('/', (_req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// Endpoint for the API server to send job updates
app.post('/job-update', (req, res) => {
    data = req.body;

    console.log(socketToJobMap);

    Object.entries(socketToJobMap).forEach(([socketId, jobIds], _index) => {
        let dataForThisUser = {}
        jobIds.forEach(jobId => {
            dataForThisUser[jobId] = data[jobId]
        });
        const sortedDataForThisUser = {};
        Object.keys(dataForThisUser).sort().forEach((key) => {
            sortedDataForThisUser[key] = dataForThisUser[key];
        });
        io.to(socketId).emit('job update', sortedDataForThisUser);
    });

    res.status(200).send();
});

// WebSockets
// ==========
io.on('connection', (socket) => {
    console.log('a user connected:', socket.id);
    console.log(`Current number of users connected: ${io.engine.clientsCount}`)

    socket.on('start job', async (data) => {
        try {
            const response = await axios.post('http://localhost:3000/start-analysis', data);
            const jobIds = response.data.jobIds;
            jobIds.forEach(jobId => {
                socketToJobMap[socket.id] ||= [];
                socketToJobMap[socket.id].push(jobId);
            });
            socket.emit('job started', { jobIds });
        } catch (error) {
            console.error('Error starting job:', error);
            socket.emit('error', 'Failed to start job');
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected:', socket.id);
        console.log(`Current number of users connected: ${io.engine.clientsCount}`)

        // Cleanup jobToSocketMap on disconnect
        delete socketToJobMap[socket.id];
    });

    socket.on('job update received by client', (data) => {
        console.log('Job update received by client:', data);
    });
});


server.listen(4000, () => {
    console.log('Application server listening on port 4000');
});