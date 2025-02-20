const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const events = require('events');
const fetch = require('node-fetch');

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

    const urls = [
      'https://www.google.com',
      'http://www.iki.fi/index.html',
      'https://www.example.com'
    ];

    let responses = [];

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          redirect: 'manual' // Handle redirects manually
        });

        if (response.status === 301 || response.status === 302) {
          const redirectUrl = response.headers.get('location');
          console.log(`Redirected to: ${redirectUrl}`);
          const redirectedResponse = await fetch(redirectUrl);
          const redirectedData = await redirectedResponse.text();
          responses.push({ url, data: redirectedData });
        } else {
          const data = await response.text();
          responses.push({ url, data });
        }
      } catch (err) {
        console.error(`Error fetching URL ${url}:`, err);
