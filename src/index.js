import dotenv from 'dotenv'
import connectDB from './db/index.js';
import app from './app.js';

dotenv.config({
    path: './env'
});

// CONNECTING TO DATABASE
connectDB()
    .then(() => {
        const port = 4000 || process.env.PORT;
        app.listen(port, () => {
            console.log(`Listening on port ${port}`);
        })
    })
    .catch((err) => { console.log(err.message); });