import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { gardenRouter } from './routes/garden';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json({ limit: '25mb' }));

app.use('/api', gardenRouter);

const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\nGarden Designer running on http://localhost:${PORT}`);
  console.log(`  API: http://localhost:${PORT}/api/design\n`);
});
