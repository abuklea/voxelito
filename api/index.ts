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
