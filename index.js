import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './src/config/db.js';
import studentRoutes from './src/routes/studentRoutes.js';
import recruiterRoutes from './src/routes/recruiterRoutes.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors()); // Allows all origins (*), same as your Java config
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/student', studentRoutes);
app.use('/api/recruiter',recruiterRoutes);

// Start
const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully.');
        
        // Sync models (Safe mode: doesn't drop tables)
        await sequelize.sync(); 
        
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (err) {
        console.error('Unable to connect to the database:', err);
    }
};

startServer();