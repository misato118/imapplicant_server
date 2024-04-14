import bodyParser from 'body-parser'; // related to Express. Middleware for incoming requests
import express from 'express'; // Like a small application. A back-end framework of node.js
import cors from 'cors'; // Cross-Origin Resource Sharing. This helps to get resources from external servers. e.g., get image that's referenced by another website
import mongoose from 'mongoose'; // Library that creates a connection between MongoDB and Node.js rutime environment
import dotenv from 'dotenv';

import applicationsRoutes from './routes/applications.js';
import researchRequirementsRoutes from './routes/research_requirements.js';
import userRoutes from './routes/users.js';

const app = express(); // Creates an express application
dotenv.config();

// This will be executed for every request to the application. Bring the middleware function to a path.
app.use(bodyParser.json({ limit: '30mb', extended: true })); // Parse only json
app.use(bodyParser.urlencoded({ limit: '30mb', extended: true })); // Parse only urlencoded bodies
app.use(cors()); // CORS is enabled here

app.use('/applications', applicationsRoutes);
app.use('/research_requirements', researchRequirementsRoutes);
app.use('/user', userRoutes);

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.CONNECTION_URL, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => app.listen(PORT, () => console.log(`Server running on port: ${PORT}`)))
    .catch((error) => console.log(error));