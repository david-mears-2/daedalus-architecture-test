# simulate rich's API

This directory (pretending-to-be-the-api-by-rich) stands in for the API that Rich is going to build. It is intended to simulate the following behavior in a 'black-box' (i.e., the actual implementation isn't important) manner:
* server.js: It can be told, via HTTP request, to run some jobs, which stand in for running the R model. (Currently, an arbitrary number of jobs can be requested with each request, but a realistic range for what a user might ask for in a single request would be up to about half a dozen runs.) In this request, a webhook url should be sent, which will be used later to keep the job-requester up-to-date with the latest data from the job.
* It creates some ids for those jobs, and writes those down in RAM (Redis), and replies to the original HTTP request straight away with the list of ids.
* It also tracks which job ids correspond to which webhook urls (it stores a list of job ids under each webhook url in Redis).
* It goes away and runs the 'jobs', concurrently. (It simulates the actual job by just writing to a file every 10ms: analysis.py). In Redis, we track the status of the job, which can be 'unstarted', 'processing', 'completed', or 'completed_and_sent'.
* In data_pusher.py, it frequently (currently every 15ms - this is probably a lot more frequent than we need it to be, users wouldn't begrudge another 50ms) (and it's not really every 15ms, that's just the amount I told it to sleep for between each burst of activity) checks for any jobs that might have new data to send (that is, jobs with a status other than 'unstarted' or 'completed_and_sent'), and sends off (pushes) all the output info for all those jobs, back to the corresponding webhook url(s). (That's what "long-polling" refers to = A sends a request, and B doesn’t send a response until something changes.) This is done dumbly: it doesn't limit itself only to 'new data'. Since this can be a large amount of data to send, we chunk these pushes into HTTP requests of maximum 100KB each.
* Ways this could be optimized if we wanted to:
  * If we wanted to optimize the data-pushing part, we could add 'multiplexing', an HTTP/2 feature that means we can reuse the same connection instead of creating and closing a new one for every chunk.
  * If Redis is a bottleneck, we could maybe listen (pub/sub) to Redis for updates, rather than directly querying it?
  * If scale of data is a bottleneck, we could do different levels of granularity and send coarser versions, even adaptively for those connections that seem to be struggling

requestIndexPrinter.js is just used as a simple way to catch and monitor these data pushes so we can see if they made it.

## install deps

```
pip install -r requirements.txt
npm install
```

## run

You need a redis server up and running first. Then you can start the API server and it's data-pusher job using:

```
npm run start
```

## to empty redis (careful!) and the outputs directory

```
npm run refresh
```

## Example of how to send a query to the API from Node CLI

When load-testing, make sure to try varying the number of analyses up to about half a dozen.


```js
const axios = require('axios');
const doQuery = async (numberOfAnalyses) => {
  // try {
    const response = await axios.post('http://localhost:3000/start-analysis', {
      analyses: numberOfAnalyses,
      webhookUrl: 'http://localhost:3001/'
    });
    console.log(response.data);
  // } catch (error) {
  //   console.error(error);
  // }
};

doQuery(1)

// Alternatively, simulate sending many separate requests for different numbers of analyses:

let concurrentAnalysesCounter = 0
const sendConcurrentRequests = async (numberOfRequests) => {
  const promiseFunctions = [];
  for (let i = 0; i < numberOfRequests; i++) {
    const numberOfAnalyses = Math.floor(Math.random() * 6) + 1;
    concurrentAnalysesCounter += numberOfAnalyses;
    promiseFunctions.push(() => doQuery(numberOfAnalyses));
  }

  const startTime = new Date()

  await Promise.all(promiseFunctions.map(func => func()));

  const endTime = new Date()

  console.log(`Time taken to send ${numberOfRequests} 'concurrent' requests: ${endTime - startTime} ms.`)

  console.log('Expected number of analyses running concurrently: ' + concurrentAnalysesCounter)
  
}

sendConcurrentRequests(1000)
```

## Benchmarking

| Number of 'concurrent' requests to API (= number of clicks from users) | Time taken to send 'concurrent' API requests | Analysis runs triggered (should be 1-6 per request) | Configured frequency of pushing data from API (ms) (these are chunked) (should not be less than frequency of run output writes) | HTTP requests received from API (chunked into max 100KB per request) | Time till all run data received | Average frequency of receiving requests from API (can exceed configured frequency due to chunking)
| :--: | :--: | :--: | :--: | :--: | :--: | :--: |
| 1000 | 50s  | 3566 | 50   | 1539 | 60s   | 39ms  |
| Repeating the same experiment again:
| 1000 |  55s | 'Server' requested 3503 but only heard back about 3358 of these (seems like some were dropped?) | 50   | 1495 | 64s   |  43ms |
| Repeating the same experiment again:
| 1000 | 57s | 3526 | 50 | 1427 | 66s | 46ms
| 1000 | 54s | requested 3558 but only heard about 3349... | 25   | 1342 |  64s  |  47ms |
| Repeating the same experiment again:
| 1000 |  55s   |  requested 3463 but only heard about 3423...  | 25  |  1493  | 65s  |  43.5ms  |
| 1000 |  54s   |  requested 3508, got 3223   | 40 | 1408 | 64s |  45ms |
| 500 | 18s | 1767 | 15 | 1949 | 75s | 38ms
| 200  | 7.4s | 673 | 50  | 894 | 17s | 19ms |
| 200  | 7.8s | 650 | 25  | 866 | 18s | 21ms |
| 200 | 10.5s | 681 | 15   | 930 | 20s   |  21.5ms |




## Cheatsheet for looking up stuff in redis

List jobs under webhook urls:
```
LRANGE daedalus_tryout:webhookUrl:http%3A%2F%2Flocalhost%3A3001%2F:jobs 0 -1
```

Look up job status:
```
GET daedalus_tryout:jobs:{jobId}:status
```

Count jobs under webhook urls:
```
LLEN daedalus_tryout:webhookUrl:http%3A%2F%2Flocalhost%3A3001%2F:jobs
```

Count jobs:
```bash
redis-cli KEYS "daedalus_tryout:jobs:*" | wc -l
```



### original, outdated prompt for chatgpt when I asked it to build this simulated API

I'm testing out my idea for the architecture of a system by quickly prototyping it, so I can do some load testing. Please could you write me up the minimal, simplest thing that achieves the below requirements (this is to mimic an external API). You may of course use multiple files. Please stick to JS and Python for any high-level languages.

It should act as a server with an API. The API can receive requests which ask for between 1 and 6 'analyses', and which pass in a webhook endpoint url. Instead of conducting these analyses for real (in real life we would use workers), the server should simulate this, e.g. by delegating to (up to) 6 other processes that operate in parallel, and which take somewhere between 3 and 10 seconds each to complete. After delegating, our server should respond to the original request by sending a list of job ids for each analysis run that's needed. The simulated analyses should each write to data output files every 10ms, as if they are writing the interim results of their calculations as they go. Every 50ms, the server should package up the interim output data across all the analyses (well, all of the ones pertaining to the original request), and send it back to the server's webhook url endpoint.

Let me know which files and file structures need to be created (and give me copyable commands creating these files/dirs). If you need to, split your response across multiple replies to me. Don't write ellipses, but rather write the complete code needed.