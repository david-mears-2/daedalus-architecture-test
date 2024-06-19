// This is the server for the API.

const express = require('express');
const { exec } = require('child_process');
const redis = require('redis');
const { randomUUID } = require('crypto');
const app = express();
const port = 3000;

let requestIndex = 0;
let analysesIndex = 0;

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
    requestIndex++;
    const { analyses, webhookUrl } = req.body;
    // analysesIndex += analyses;
    const encodedWebhookUrl = encodeURIComponent(webhookUrl);
    const jobIds = [];
    for (let i = 0; i < analyses; i++) {
        const jobId = `job_${Date.now()}_${randomUUID()}_${i}`;
        jobIds.push(jobId);
        try {
            // We must set the status before adding to the list, because otherwise data_pusher.py
            // may try to look up the job's status before it's set.
            await redisClient.set(`${redisPrefix}:jobs:${jobId}:status`, 'unstarted');
            await redisClient.rPush(`${redisPrefix}:webhookUrl:${encodedWebhookUrl}:jobs`, jobId);
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
            analysesIndex++;
        } catch (error) {
            console.error('Redis error:', error);
            res.status(500).send('Internal Server Error');
            throw error; // Terminate the program so we can realise we broke Redis
            return;
        }
    }

    res.json(
        {
            jobIds,
            jobIdsCount: jobIds.length,
            numberOfRequestsToAPISoFar: requestIndex,
            numberOfAnalysesSoFar: analysesIndex,
        });
});

app.listen(port, async () => {
    await redisClient.connect() 
    console.log(`Server listening at http://localhost:${port}`);
});