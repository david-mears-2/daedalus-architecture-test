const express = require('express');
const app = express();
const port = 3001;

let requestIndex = 0;

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

app.post('/', (req, res) => {
    requestIndex++;
    console.log(`Received request #${requestIndex}`);
    res.status(200).send(`Request #${requestIndex} received`);
    const jobsData = req.body;
    replaceOutputWithLineCount(jobsData); // Modify jobsData before logging
    console.log(jobsData);
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});