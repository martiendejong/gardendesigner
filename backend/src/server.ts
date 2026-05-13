import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { getDb } from './db/database';
import { gardenRouter } from './routes/garden';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';
import { projectsRouter } from './routes/projects';
import { productGroupsRouter } from './routes/productGroups';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Init DB on startup
getDb();

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/product-groups', productGroupsRouter);
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
