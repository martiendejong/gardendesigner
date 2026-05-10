import { Router, Request, Response } from 'express';
import { analyzeAndDesign, refreshInsights, applyInstruction, segmentObjects, placeObjectInGarden, generateSuggestions } from '../services/aiService';

export const gardenRouter = Router();

gardenRouter.post('/design', async (req: Request, res: Response): Promise<void> => {
  const { imageDataUrl, preferences } = req.body;

  if (!imageDataUrl || !preferences) {
    res.status(400).json({ error: 'imageDataUrl and preferences are required' });
    return;
  }

  try {
    const result = await analyzeAndDesign(imageDataUrl, preferences);
    res.json(result);
  } catch (err) {
    console.error('[/api/design]', err);
    const message = err instanceof Error ? err.message : 'Failed to generate design';
    res.status(500).json({ error: message });
  }
});

gardenRouter.post('/apply', async (req: Request, res: Response): Promise<void> => {
  const { imageDataUrl, instruction } = req.body;

  if (!imageDataUrl || !instruction) {
    res.status(400).json({ error: 'imageDataUrl and instruction are required' });
    return;
  }

  try {
    const imageUrl = await applyInstruction(imageDataUrl, instruction);
    res.json({ imageUrl });
  } catch (err) {
    console.error('[/api/apply]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to apply instruction' });
  }
});

gardenRouter.post('/segment', async (req: Request, res: Response): Promise<void> => {
  const { imageDataUrl } = req.body;
  if (!imageDataUrl) { res.status(400).json({ error: 'imageDataUrl required' }); return; }
  try {
    const objects = await segmentObjects(imageDataUrl);
    res.json({ objects });
  } catch (err) {
    console.error('[/api/segment]', err);
    res.status(500).json({ error: 'Segmentation failed' });
  }
});

gardenRouter.post('/place-image', async (req: Request, res: Response): Promise<void> => {
  const { gardenImageDataUrl, objectImageDataUrl, context } = req.body;
  if (!gardenImageDataUrl || !objectImageDataUrl) {
    res.status(400).json({ error: 'gardenImageDataUrl and objectImageDataUrl are required' });
    return;
  }
  try {
    const b64 = await placeObjectInGarden(gardenImageDataUrl, objectImageDataUrl, context);
    const imageUrl = b64 ? `data:image/jpeg;base64,${b64}` : '';
    res.json({ imageUrl });
  } catch (err) {
    console.error('[/api/place-image]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Placement failed' });
  }
});

gardenRouter.post('/suggestions', async (req: Request, res: Response): Promise<void> => {
  const { imageDataUrl } = req.body;
  if (!imageDataUrl) { res.status(400).json({ error: 'imageDataUrl required' }); return; }
  try {
    const suggestions = await generateSuggestions(imageDataUrl);
    res.json({ suggestions });
  } catch (err) {
    console.error('[/api/suggestions]', err);
    res.status(500).json({ error: 'Suggestions failed' });
  }
});

gardenRouter.post('/insights', async (req: Request, res: Response): Promise<void> => {
  const { imageDescription, preferences } = req.body;

  if (!preferences) {
    res.status(400).json({ error: 'preferences required' });
    return;
  }

  try {
    const result = await refreshInsights(imageDescription || 'a residential garden', preferences);
    res.json(result);
  } catch (err) {
    console.error('[/api/insights]', err);
    res.status(500).json({ error: 'Failed to refresh insights' });
  }
});
