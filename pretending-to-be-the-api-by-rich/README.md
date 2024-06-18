# simulate rich's API

## install deps

```
pip install -r requirements.txt
npm install
```

## run

```
npm run start
```

## Example of how to send a query to the API from Node CLI

When load-testing, make sure to try varying the number of analyses up to about half a dozen.


```
(async () => {
   const axios = require('axios');
   try {
     const response = await axios.post('http://localhost:3000/start-analysis', {
       analyses: 1,
       webhookUrl: 'http://localhost:3001/'
     });
     console.log(response.data);
   } catch (error) {
     console.error(error);
   }
 })();
```

### original outdated prompt for gpt

I'm testing out my idea for the architecture of a system by quickly prototyping it, so I can do some load testing. Please could you write me up the minimal, simplest thing that achieves the below requirements (this is to mimic an external API). You may of course use multiple files. Please stick to JS and Python for any high-level languages.

It should act as a server with an API. The API can receive requests which ask for between 1 and 6 'analyses', and which pass in a webhook endpoint url. Instead of conducting these analyses for real (in real life we would use workers), the server should simulate this, e.g. by delegating to (up to) 6 other processes that operate in parallel, and which take somewhere between 3 and 10 seconds each to complete. After delegating, our server should respond to the original request by sending a list of job ids for each analysis run that's needed. The simulated analyses should each write to data output files every 10ms, as if they are writing the interim results of their calculations as they go. Every 50ms, the server should package up the interim output data across all the analyses (well, all of the ones pertaining to the original request), and send it back to the server's webhook url endpoint.

Let me know which files and file structures need to be created (and give me copyable commands creating these files/dirs). If you need to, split your response across multiple replies to me. Don't write ellipses, but rather write the complete code needed.