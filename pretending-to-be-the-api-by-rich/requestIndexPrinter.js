// Temporary stand-in for the part of the application server that receives data pushed from the API.

const express = require('express');
const app = express();
const port = 3001;

let requestIndex = 0;
let jobsDataAccumulator = {};
let startTime = null;

app.use(express.json()); // Middleware to parse JSON bodies

function replaceOutputWithLineCount(obj) {
    for (const key in obj) {
        if (typeof obj[key] === 'object') {
            replaceOutputWithLineCount(obj[key]);
        } else if (key === 'output') {
            // Assuming the value is a string and using split to count lines
            obj[key] = obj[key].split('\n').length;
        }
    }
}

function analyseJobsDataAccumulator() {
    
    console.log(`Number of jobs (that we've heard about): ${Object.keys(jobsDataAccumulator).length}`);
    const numberOfJobsByEachStatus = {};
    for (const jobId in jobsDataAccumulator) {
        const status = jobsDataAccumulator[jobId].status;
        if (numberOfJobsByEachStatus[status]) {
            numberOfJobsByEachStatus[status]++;
        } else {
            numberOfJobsByEachStatus[status] = 1;
        }
    }
    console.log(`Number of jobs (that we've heard about) by each status: ${JSON.stringify(numberOfJobsByEachStatus)}`);

    if (Object.keys(jobsDataAccumulator).length === numberOfJobsByEachStatus['completed']) {
        const endTime = new Date()
        console.log(`All jobs have status 'completed'. Time taken: ${endTime - startTime} ms`)
    }
}

app.post('/', (req, res) => {
    if (!startTime) {
        startTime = new Date();
    }
    requestIndex++;
    console.log(`Received request #${requestIndex}`);
    res.status(200).send(`Request #${requestIndex} received`);
    const jobsData = req.body;
    replaceOutputWithLineCount(jobsData); // Modify jobsData before logging
    jobsDataAccumulator = { ...jobsDataAccumulator, ...jobsData };
    analyseJobsDataAccumulator();
    console.log(jobsData);
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});