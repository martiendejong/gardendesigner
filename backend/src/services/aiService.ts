import OpenAI, { toFile } from 'openai';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import type { GardenPreferences, DesignResponse, SegmentedObject } from '../types/garden';

const LOG_FILE = 'C:\\projects\\gardendesigner\\prompt.log';

function log(label: string, content: string) {
  try {
    const line = `[${new Date().toISOString()}] ${label}:\n${content}\n${'─'.repeat(80)}\n`;
    fs.appendFileSync(LOG_FILE, line, 'utf8');
  } catch (e) {
    console.error('log write failed:', e);
  }
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_PX = 1536;

// ─── helpers ────────────────────────────────────────────────────────────────

function describeSliders(sliders: GardenPreferences['sliders']): string {
  const parts: string[] = [];

  if (sliders.tranquilVibrant < 0.33) parts.push('calm tranquil atmosphere');
  else if (sliders.tranquilVibrant > 0.66) parts.push('vibrant energetic atmosphere');
  else parts.push('balanced atmosphere');

  if (sliders.openSheltered < 0.33) parts.push('open layout');
  else if (sliders.openSheltered > 0.66) parts.push('sheltered spaces');
  else parts.push('semi-open layout');

  if (sliders.lightMass < 0.33) parts.push('light minimal elements');
  else if (sliders.lightMass > 0.66) parts.push('heavy architectural features');
  else parts.push('balanced elements');

  if (sliders.socialSolitary < 0.33) parts.push('social areas');
  else if (sliders.socialSolitary > 0.66) parts.push('private retreat');
  else parts.push('flexible zones');

  return parts.join(', ');
}

async function resolveImageBuffer(src: string): Promise<Buffer> {
  if (src.startsWith('http://') || src.startsWith('https://')) {
    const resp = await fetch(src);
    if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
    return Buffer.from(await resp.arrayBuffer());
  }

  const match = src.match(/^data:[^;]+;base64,(.+)$/);
  if (!match) throw new Error('Invalid image source');

  return Buffer.from(match[1], 'base64');
}

/** Resize to fit within MAX_PX on longest edge, preserving aspect ratio. No crop. */
async function resizeForAPI(imageBuffer: Buffer): Promise<string> {
  const resized = await sharp(imageBuffer)
    .resize(MAX_PX, MAX_PX, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 92 })
    .toBuffer();

  return `data:image/jpeg;base64,${resized.toString('base64')}`;
}

async function prepareImageForEdit(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .resize(MAX_PX, MAX_PX, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
}

/**
 * Same function name kept for compatibility.
 * Internally changed from Responses API image_generation tool to direct gpt-image-2 edit.
 */
async function editWithGPT4o(imageDataUrl: string, instruction: string): Promise<string | null> {
  log('GPT-IMAGE-2 direct edit instruction', instruction);

  const originalBuffer = await resolveImageBuffer(imageDataUrl);
  const imagePng = await prepareImageForEdit(originalBuffer);

  const imageFile = await toFile(imagePng, 'garden.png', {
    type: 'image/png',
  });

  const prompt = `
Edit the provided real garden photo.

This is a photo-preserving garden edit, not a full image regeneration.

Preserve exactly:
- camera angle
- crop and framing
- perspective
- lens look
- daylight and shadows
- shed
- fences
- chairs
- table/storage box
- barbecue
- bicycle
- background houses
- sky
- patio tiles
- existing walls and hardscape
- all existing objects unless directly mentioned

Only change the garden ground, soil, lawn, planting beds, borders, path edges, mulch, gravel, low plants, flowers, and small decorative garden elements needed for this instruction:

${instruction}

The result must look like the same amateur real phone photo after a realistic garden improvement.
Do not make it look like a CGI render, AI concept art, real-estate render, luxury stock photo, or fantasy garden.
Keep imperfections, realistic scale, original materials, and the same ordinary residential setting.
  `.trim();

  const result = await openai.images.edit({
    model: 'gpt-image-2',
    image: imageFile,
    prompt,
    size: 'auto',
    quality: 'medium',
  } as any);

  const b64 = result.data?.[0]?.b64_json ?? null;

  if (b64) log('GPT-IMAGE-2 got image', `length: ${b64.length}`);
  else log('GPT-IMAGE-2', 'No image returned');

  return b64;
}

// ─── exported functions ──────────────────────────────────────────────────────

export async function analyzeAndDesign(
  imageDataUrl: string,
  preferences: GardenPreferences
): Promise<DesignResponse> {
  log('REQUEST', `mood=${preferences.mood} time=${preferences.timeOfUse}`);

  const sliderDesc = describeSliders(preferences.sliders);
  const buffer = await resolveImageBuffer(imageDataUrl);
  const resizedDataUrl = await resizeForAPI(buffer);

  const analysisRes = await openai.chat.completions.create({
    model: 'gpt-5.5',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a professional landscape architect and photo-preserving image edit director. Study the photo carefully and produce a realistic, limited garden edit instruction. Valid JSON only.',
      },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: resizedDataUrl, detail: 'high' } },
          {
            type: 'text',
            text: `Study this garden photo in detail.

Intentions:
- feeling=${preferences.mood}
- time=${preferences.timeOfUse}
- privacy=${preferences.visibility}
- character=${sliderDesc}

Important:
The final image edit must preserve the original photo identity. Do not describe a new perfect garden. Do not describe a luxury render. Only describe realistic, limited changes to ground cover, planting beds, borders, paths, edging, gravel, mulch, and small decorative elements.

Respond with JSON:
{
  "harmonyLevel": <0-100>,
  "generationMessage": "<evocative phrase, max 6 words>",
  "imageDescription": "<2-3 factual sentences: exactly what is visible in the current photo>",
  "suggestions": ["<specific design suggestion 1>", "<specific design suggestion 2>"],
  "cornerNote": "<one specific observation about a feature or opportunity visible in THIS photo>",
  "suggestedObject": { "name": "<object>", "description": "<one line>", "reason": "<why it fits THIS garden>" },
  "suggestedPlacements": [
    { "name": "<object name>", "emoji": "<single emoji>", "description": "<one line description>", "instruction": "Place/Plant ... in/along/near [specific location], keeping everything else exactly as it is." },
    { "name": "<object name>", "emoji": "<single emoji>", "description": "<one line description>", "instruction": "Place/Plant ... in/along/near [specific location], keeping everything else exactly as it is." },
    { "name": "<object name>", "emoji": "<single emoji>", "description": "<one line description>", "instruction": "Place/Plant ... in/along/near [specific location], keeping everything else exactly as it is." },
    { "name": "<object name>", "emoji": "<single emoji>", "description": "<one line description>", "instruction": "Place/Plant ... in/along/near [specific location], keeping everything else exactly as it is." }
  ],
  "designInstruction": "<One short surgical image-edit instruction. Max 90 words. Describe only realistic changes to the rough ground, lawn, soil, planting beds, borders, paths, edging, gravel, mulch, and small garden elements. Do not mention camera, lighting, shed, fences, chairs, barbecue, bicycle, background houses, sky, or full-scene atmosphere.>"
}`,
          },
        ],
      },
    ],
    max_completion_tokens: 900,
  });

  let analysis: {
    harmonyLevel: number;
    generationMessage: string;
    imageDescription: string;
    suggestions: string[];
    cornerNote: string;
    suggestedObject: { name: string; description: string; reason: string };
    suggestedPlacements: { name: string; emoji: string; description: string; instruction: string }[];
    designInstruction: string;
  };

  try {
    const raw = analysisRes.choices[0].message.content || '{}';
    log('GPT-5.5 raw response', raw.slice(0, 2000));
    analysis = JSON.parse(raw);
  } catch {
    analysis = {
      harmonyLevel: 72,
      generationMessage: 'Designing Your Garden...',
      imageDescription:
        'A residential garden with patio tiles, wooden fencing, a shed, seating, a barbecue, a bicycle, and a rough grass and soil area.',
      suggestions: [
        'Improve the rough grass and soil area with a modest realistic lawn.',
        'Add low planting borders along the patio and fence edges.',
      ],
      cornerNote:
        'The unfinished ground area on the right is the clearest opportunity for a realistic improvement.',
      suggestedObject: {
        name: 'Lavender Border',
        description: 'Low purple flowering border',
        reason: 'Adds colour and softness without changing the structure of the garden.',
      },
      suggestedPlacements: [
        {
          name: 'Lavender Border',
          emoji: '💜',
          description: 'Fragrant purple flowering border',
          instruction:
            'Plant a lavender border along the patio edge, keeping everything else exactly as it is.',
        },
        {
          name: 'Ornamental Grass',
          emoji: '🌾',
          description: 'Soft natural texture',
          instruction:
            'Plant small ornamental grasses along the right-side fence border, keeping everything else exactly as it is.',
        },
        {
          name: 'Stepping Stones',
          emoji: '🪨',
          description: 'Simple practical walking route',
          instruction:
            'Add a short stepping-stone path through the rough ground area, keeping everything else exactly as it is.',
        },
        {
          name: 'Low Flowering Shrubs',
          emoji: '🌼',
          description: 'Small white flowering plants',
          instruction:
            'Plant low white flowering shrubs near the garden border, keeping everything else exactly as it is.',
        },
      ],
      designInstruction:
        'Replace the rough grass and bare soil with a realistic modest lawn area, add low curved dark edging, and plant small lavender, ornamental grasses, and white flowering shrubs along the patio and fence borders. Keep all hardscape and objects unchanged.',
    };
  }

  log('GPT-5.5 imageDescription', analysis.imageDescription);
  log('GPT-5.5 designInstruction', analysis.designInstruction);

  const b64 = await editWithGPT4o(resizedDataUrl, analysis.designInstruction);

  const imageUrl = b64 ? `data:image/png;base64,${b64}` : '';

  return {
    imageUrl,
    harmonyLevel: analysis.harmonyLevel,
    generationMessage: analysis.generationMessage,
    suggestions: analysis.suggestions,
    cornerNote: analysis.cornerNote,
    suggestedObject: analysis.suggestedObject,
    imageDescription: analysis.imageDescription,
    suggestedPlacements: analysis.suggestedPlacements ?? [],
  };
}

export async function applyInstruction(
  imageDataUrl: string,
  instruction: string
): Promise<string> {
  const buffer = await resolveImageBuffer(imageDataUrl);
  const resizedDataUrl = await resizeForAPI(buffer);

  const b64 = await editWithGPT4o(resizedDataUrl, instruction);
  if (!b64) return '';

  return `data:image/png;base64,${b64}`;
}

export async function segmentObjects(imageDataUrl: string): Promise<SegmentedObject[]> {
  const buffer = await resolveImageBuffer(imageDataUrl);
  const resizedDataUrl = await resizeForAPI(buffer);

  const res = await openai.chat.completions.create({
    model: 'gpt-5.5',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a computer vision system. Identify distinct objects and areas in garden photos and return their positions as percentages. Respond with valid JSON only.',
      },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: resizedDataUrl, detail: 'high' } },
          {
            type: 'text',
            text: `Identify all distinct objects and areas visible in this garden photo. For each object, estimate its center position and bounding box as percentages of the image dimensions (0-100).

Look for: trees, paths, seating, planters, water features, lawn areas, borders, structures, fences, flower beds, hedges, ornaments, patio, shed, barbecue, bicycle.

Return up to 15 objects as JSON:
{
  "objects": [
    {
      "id": "obj_1",
      "label": "<descriptive name>",
      "emoji": "<single relevant emoji>",
      "x": <center x as % of width, 0-100>,
      "y": <center y as % of height, 0-100>,
      "width": <bounding box width as %, 5-60>,
      "height": <bounding box height as %, 5-60>
    }
  ]
}

Be precise with positions. Use the full image coordinate space.`,
          },
        ],
      },
    ],
    max_completion_tokens: 1500,
  });

  try {
    const parsed = JSON.parse(res.choices[0].message.content || '{}') as {
      objects?: SegmentedObject[];
    };
    return (parsed.objects ?? []).slice(0, 15);
  } catch {
    return [];
  }
}

export async function placeObjectInGarden(
  gardenImageDataUrl: string,
  objectImageDataUrl: string,
  context?: string
): Promise<string> {
  const gardenBuffer = await resolveImageBuffer(gardenImageDataUrl);
  const objectBuffer = await resolveImageBuffer(objectImageDataUrl);

  const gardenPng = await sharp(gardenBuffer)
    .resize(MAX_PX, MAX_PX, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();

  const objectPng = await sharp(objectBuffer)
    .resize(MAX_PX, MAX_PX, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();

  const gardenFile = await toFile(gardenPng, 'garden.png', {
    type: 'image/png',
  });

  const objectFile = await toFile(objectPng, 'object.png', {
    type: 'image/png',
  });

  const instruction = context
    ? `Place the object from the second image naturally into the garden photo. Placement context: ${context}.`
    : `Place the main object from the second image naturally into the garden photo in the most realistic suitable location.`;

  const prompt = `
The first image is the real garden photo.
The second image is the object reference.

Task:
${instruction}

Preserve the first garden photo as much as possible.
Do not redesign the garden.
Do not change the camera angle, crop, perspective, lighting, shadows, sky, fences, plants, patio, buildings, furniture, bicycles, people, or existing objects.
Only add the referenced object from the second image.

The added object must match the garden photo's perspective, scale, lighting, shadows, and image quality.
The final image must look like the same real phone photo with one object added, not like CGI, stock photography, or a generated render.
  `.trim();

  log('placeObjectInGarden GPT-IMAGE-2 instruction', prompt);

  const result = await openai.images.edit({
    model: 'gpt-image-2',
    image: [gardenFile, objectFile],
    prompt,
    size: 'auto',
    quality: 'medium',
  } as any);

  const b64 = result.data?.[0]?.b64_json ?? '';

  if (b64) {
    log('placeObjectInGarden GPT-IMAGE-2 got image', `length: ${b64.length}`);
  } else {
    log('placeObjectInGarden GPT-IMAGE-2', 'No image returned');
  }

  return b64;
}

export async function refreshInsights(
  imageDescription: string,
  preferences: GardenPreferences
): Promise<Omit<DesignResponse, 'imageUrl' | 'generationMessage' | 'imageDescription' | 'suggestedPlacements'>> {
  const sliderDesc = describeSliders(preferences.sliders);

  const res = await openai.chat.completions.create({
    model: 'gpt-5.5',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are a professional landscape architect. Respond with valid JSON only.',
      },
      {
        role: 'user',
        content: `Garden: ${imageDescription}

Preferences:
- feeling=${preferences.mood}
- time=${preferences.timeOfUse}
- privacy=${preferences.visibility}
- character=${sliderDesc}

Respond:
{
  "harmonyLevel": <0-100>,
  "suggestions": ["<s1>", "<s2>"],
  "cornerNote": "<observation>",
  "suggestedObject": {
    "name": "<object>",
    "description": "<desc>",
    "reason": "<why>"
  }
}`,
      },
    ],
    max_completion_tokens: 500,
  });

  try {
    return JSON.parse(res.choices[0].message.content || '{}');
  } catch {
    return {
      harmonyLevel: 70,
      suggestions: [
        'Add native plants for seasonal interest.',
        'A pathway would improve flow.',
      ],
      cornerNote: 'The unfinished ground area could become a soft planting zone.',
      suggestedObject: {
        name: 'Bamboo Wind Chime',
        description: 'Natural bamboo acoustic element',
        reason: 'Adds sensory depth.',
      },
    };
  }
}