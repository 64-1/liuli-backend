const express = require('express');
const basicAuth = require('express-basic-auth');
const cors = require('cors');
const fs = require('fs');
const {Storage} = require('@google-cloud/storage');

// Initialize Express app
const app = express();
app.use(cors());
const port = process.env.PORT || 3000; 


// Setup Google Cloud Storage
const storage = new Storage({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const bucketName = 'liulishisuo-novel-storage';

app.use(basicAuth({
  users: { [process.env.BASIC_AUTH_USER]: process.env.BASIC_AUTH_PASSWORD },
  challenge: true
}));

// Function to upload file to GCS
async function uploadFileToGCS(data) {
  const fileName = 'rankings/daily.json';
  const tempFilePath = `/tmp/${fileName}`;

  // Write data to a temp file
  fs.writeFileSync(tempFilePath, JSON.stringify(data));

  // Upload the file to the bucket
  await storage.bucket(bucketName).upload(tempFilePath, {
    destination: fileName,
  });

  console.log(`${fileName} uploaded to ${bucketName}.`);
}

// Define a route to fetch content
app.get('/content/:contentType', async (req, res) => {
  try {
    const { contentType } = req.params;
    const fileName = contentType === 'novel' ? 'novels/data.json' : 'artwork/data.json';
    const file = storage.bucket(bucketName).file(fileName);
    const [fileContents] = await file.download();
    const data = JSON.parse(fileContents.toString('utf8'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/rankings/daily', async (req, res) => {
  try {
    const fileName = 'rankings/daily.json'; // Path to your daily rankings file in the GCS bucket
    const file = storage.bucket(bucketName).file(fileName);
    const [fileContents] = await file.download();
    const rankings = JSON.parse(fileContents.toString('utf8'));
    res.json(rankings);
  } catch (error) {
    console.error('Error fetching daily rankings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Optionally, an endpoint to trigger rankings update manually or through a scheduled job
app.post('/update-rankings', async (req, res) => {
  // Example rankings data
  const rankingsData = {
    "rankings": [
      { "title": "Novel A", "metric": 100 },
      { "title": "Novel B", "metric": 90 },
      { "title": "Novel C", "metric": 85 },
      // Add more rankings as needed
    ]
  };

  try {
    await uploadFileToGCS(rankingsData);
    res.send("Rankings updated successfully");
  } catch (error) {
    console.error("Failed to update rankings:", error);
    res.status(500).send("Error updating rankings");
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
