const express = require('express');
const { exec } = require('child_process');
const redis = require('redis');
const app = express();
const port = 3000;

app.use(express.json());

// Create a Redis client
const redisClient = redis.createClient({
    host: 'localhost',
    port: 6379
});

redisClient.on('connect', function() {
    console.log('Connected to Redis');
});

redisClient.on('error', function(error) {
    console.error('Redis error:', error);
});

const redisPrefix = 'daedalus_tryout'

app.post('/start-analysis', async (req, res) => {
    const { analyses, webhookUrl } = req.body;
    const encodedWebhookUrl = encodeURIComponent(webhookUrl);
    const jobIds = [];
    for (let i = 0; i < analyses; i++) {
        const jobId = `job_${Date.now()}_${i}`;
        jobIds.push(jobId);
        try {
            await redisClient.rPush(`${redisPrefix}:webhookUrl:${encodedWebhookUrl}:jobs`, jobId);
            await redisClient.set(`${redisPrefix}:jobs:${jobId}:status`, 'unstarted');
            exec(`python3 analysis.py ${jobId}`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    return;
                }
                if (stdout) {
                    console.log(`stdout: ${stdout}`);
                }
                if (stderr) {
                    console.error(`stderr: ${stderr}`);
                }
            });
        } catch (error) {
            console.error('Redis error:', error);
            res.status(500).send('Internal Server Error');
            return;
        }
    }

    res.json({ jobIds });
});

app.listen(port, async () => {
    await redisClient.connect() 
    console.log(`Server listening at http://localhost:${port}`);
});