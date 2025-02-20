const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const events = require('events');
const fetch = require('node-fetch');
const fs = require('fs').promises; // Lisätään tiedoston käsittelyyn tarvittava moduuli

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.use((req, res, next) => {
  req.app.locals.eventEmitter = req.app.locals.eventEmitter || new events.EventEmitter();
  next();
});

app.post('/api/webhook', async (req, res) => {
  try {
    const body = req.body;
    console.log('Webhook event received:', body);

    // Fetch the updated content from the defined URLs
    const responseUrls = [
      'https://www.google.com/',
      'https://www.iki.fi/',
      'https://www.example.com/'
    ];

    let responseData = '';

    for (const url of responseUrls) {
      console.log(`Fetching from URL: ${url}`);
      const response = await fetch(url, { redirect: 'manual' }); // Handle redirects manually

      if (response.status === 301 || response.status === 302) {
        const redirectUrl = response.headers.get('location');
        console.log(`Redirected to: ${redirectUrl}`);
        const redirectedResponse = await fetch(redirectUrl);
        const redirectedData = await redirectedResponse.text();

        // Append redirected data to responseData
        responseData += redirectedData;
      } else {
        const data = await response.text();

        // Append fetched data to responseData
        responseData += data;
      }
    }

    // Save response data to response.txt
    await fs.writeFile('response.txt', responseData);
    console.log('Response data saved to response.txt');

    // Emit event with the updated content
    console.log(`Emitting newWebhook event with data: ${responseData}`);
    req.app.locals.eventEmitter.emit('newWebhook', responseData);
    console.log('Event emitted successfully with data');

    res.status(200).send(responseData);
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).send('Error handling webhook');
  }
});

// SSE endpoint with additional logging
app.get('/api/sse', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  console.log('SSE connection established');

  const listener = (data) => {
    console.log(`Listener received data: ${data}`);
    res.write(`data: ${data}\n\n`);
    console.log('Data sent to SSE client');
  };

  req.app.locals.eventEmitter.on('newWebhook', listener);

  if (req.app.locals.eventEmitter.listenerCount('newWebhook') > 0) {
    console.log(`Listener registered for newWebhook event, count: ${req.app.locals.eventEmitter.listenerCount('newWebhook')}`);
  } else {
    console.log('Failed to register listener for newWebhook event');
  }

  req.on('close', () => {
    req.app.locals.eventEmitter.removeListener('newWebhook', listener);
    console.log('SSE connection closed and listener removed');
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
