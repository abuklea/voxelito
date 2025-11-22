/**
 * @file index.ts
 * @description A simple Express server intended for backend purposes.
 * Note: The main backend logic for the Voxel Agent is currently handled by the Python FastAPI application in `index.py`.
 */
import express, { Request, Response } from 'express';

const app = express();
const port = process.env.PORT || 3001;

app.get('/api', (req: Request, res: Response) => {
  res.status(200).send('API is healthy');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
