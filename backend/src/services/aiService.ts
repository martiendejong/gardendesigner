import OpenAI from 'openai';
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

const MAX_PX = 1536; // longest edge sent to API — preserves aspect ratio

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

/**
 * Edit an image using the OpenAI Responses API — gpt-4o + image_generation tool.
 * This is the same pipeline ChatGPT uses when you send it a photo and ask for a change.
 * The model sees the original, understands it fully, and produces a targeted edit.
 */
async function editWithGPT4o(imageDataUrl: string, instruction: string): Promise<string | null> {
  log('RESPONSES API instruction', instruction);

  const response = await openai.responses.create({
    model: 'gpt-4o',
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_image', image_url: imageDataUrl, detail: 'high' },
          {
            type: 'input_text',
            text: `You are looking at a real garden photo. Generate a photorealistic image that shows this EXACT garden with a beautiful landscape design applied. Critical requirements:
- Keep the exact same camera angle, perspective, and framing as the photo
- Keep every existing tree, its trunk character, canopy shape, and position exactly as in the photo
- Keep the same garden boundaries, fences, walls, and neighboring structures visible in the background
- Keep the natural daylight conditions and photographic style
- The result must be immediately recognizable as the same garden/space from the same viewpoint
- Only change: ground cover, planting beds, borders, paths, and smaller decorative elements

Design to apply: ${instruction}`,
          },
        ],
      },
    ],
    tools: [{ type: 'image_generation' }],
    tool_choice: 'required',
  });

  log('RESPONSES API output types', response.output.map((o) => o.type).join(', '));

  for (const item of response.output) {
    if (item.type === 'image_generation_call' && item.result) {
      log('RESPONSES API got image', `length: ${item.result.length}`);
      return item.result;
    }
  }

  log('RESPONSES API', 'No image_generation_call found in response');
  return null;
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

  // 1. GPT-4o vision: analyse this specific garden and produce a targeted edit instruction
  const analysisRes = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are a professional landscape architect and photography director. Study the photo carefully and produce a full garden redesign description that preserves the exact trees, structures and spatial layout of the original photo. Valid JSON only.',
      },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: resizedDataUrl, detail: 'high' } },
          {
            type: 'text',
            text: `You are a professional landscape architect and photography director. Study this garden photo in detail.

Intentions: feeling=${preferences.mood}, time=${preferences.timeOfUse}, privacy=${preferences.visibility}, character=${sliderDesc}

Respond with JSON:
{
  "harmonyLevel": <0-100>,
  "generationMessage": "<evocative phrase, max 6 words>",
  "imageDescription": "<2-3 sentences: exactly what is visible — tree species, surfaces, structures, colours, background>",
  "suggestions": ["<specific design suggestion 1>", "<specific design suggestion 2>"],
  "cornerNote": "<one specific observation about a feature or opportunity visible in THIS photo>",
  "suggestedObject": { "name": "<object>", "description": "<one line>", "reason": "<why it fits THIS garden>" },
  "suggestedPlacements": [
    { "name": "<object name>", "emoji": "<single emoji>", "description": "<one line description>", "instruction": "Add/Place/Plant ... in/along/near [specific location], keeping everything else exactly as it is." },
    { "name": "<object name>", "emoji": "<single emoji>", "description": "<one line description>", "instruction": "Add/Place/Plant ... in/along/near [specific location], keeping everything else exactly as it is." },
    { "name": "<object name>", "emoji": "<single emoji>", "description": "<one line description>", "instruction": "Add/Place/Plant ... in/along/near [specific location], keeping everything else exactly as it is." },
    { "name": "<object name>", "emoji": "<single emoji>", "description": "<one line description>", "instruction": "Add/Place/Plant ... in/along/near [specific location], keeping everything else exactly as it is." }
  ],
  "designInstruction": "<Write a vivid scene description of the redesigned garden AS A PHOTOGRAPH. Start by anchoring the scene: describe the camera angle, what trees are visible (species, trunk character, canopy positions in frame), what background elements are visible, as they appear in THIS photo. Then weave in the design additions seamlessly: describe the ground materials, planting beds, border plants by species name, path surface, any lighting or furniture. The entire description must sound like you are describing a single coherent photograph — not instructions, not a list. Every design choice must match Mood=${preferences.mood}, Time=${preferences.timeOfUse}, Character=${sliderDesc}. Write 5-7 detailed sentences. Use NO instruction words (add, keep, transform, change) — only descriptive scene language.>"
}`,
          },
        ],
      },
    ],
    max_tokens: 900,
  });

  let analysis: {
    harmonyLevel: number; generationMessage: string; imageDescription: string;
    suggestions: string[]; cornerNote: string;
    suggestedObject: { name: string; description: string; reason: string };
    suggestedPlacements: { name: string; emoji: string; description: string; instruction: string }[];
    designInstruction: string;
  };

  try {
    analysis = JSON.parse(analysisRes.choices[0].message.content || '{}');
  } catch {
    analysis = {
      harmonyLevel: 72,
      generationMessage: 'Designing Your Garden...',
      imageDescription: 'A residential garden with existing plantings.',
      suggestions: ['Add layered border planting for depth.', 'A focal point would enhance the mood.'],
      cornerNote: 'The space has strong potential for a designed landscape.',
      suggestedObject: { name: 'Natural Stone Birdbath', description: 'Weathered limestone pedestal', reason: 'Calm focal point that invites wildlife.' },
      suggestedPlacements: [
        { name: 'Stone Bench', emoji: '🪑', description: 'Weathered stone seating for contemplation', instruction: 'Add a stone bench near the largest tree, keeping everything else exactly as it is.' },
        { name: 'Lavender Border', emoji: '💜', description: 'Fragrant purple flowering border', instruction: 'Plant a lavender border along the main path edge, keeping everything else exactly as it is.' },
        { name: 'Garden Lantern', emoji: '🏮', description: 'Warm ambient lighting post', instruction: 'Place a garden lantern at the path entrance, keeping everything else exactly as it is.' },
        { name: 'Water Feature', emoji: '💧', description: 'Small bubbling stone fountain', instruction: 'Add a small stone water feature in the center of the lawn area, keeping everything else exactly as it is.' },
      ],
      designInstruction: `Transform this garden into a beautiful ${preferences.mood} landscape. Keep the existing trees and structural elements. Add lush planting beds, a winding path, flowering borders, and garden lighting suited to ${preferences.timeOfUse} use.`,
    };
  }

  log('GPT-4o imageDescription', analysis.imageDescription);
  log('GPT-4o designInstruction', analysis.designInstruction);

  // 2. Full redesign via Responses API — same pipeline as ChatGPT
  const b64 = await editWithGPT4o(resizedDataUrl, analysis.designInstruction);

  const imageUrl = b64 ? `data:image/jpeg;base64,${b64}` : '';

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
  return `data:image/jpeg;base64,${b64}`;
}

export async function segmentObjects(imageDataUrl: string): Promise<SegmentedObject[]> {
  const buffer = await resolveImageBuffer(imageDataUrl);
  const resizedDataUrl = await resizeForAPI(buffer);

  const res = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'You are a computer vision system. Identify distinct objects and areas in garden photos and return their positions as percentages. Respond with valid JSON only.',
      },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: resizedDataUrl, detail: 'high' } },
          {
            type: 'text',
            text: `Identify all distinct objects and areas visible in this garden photo. For each object, estimate its center position and bounding box as percentages of the image dimensions (0-100).

Look for: trees, paths, seating, planters, water features, lawn areas, borders, structures, fences, flower beds, hedges, ornaments.

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
    },
    ...
  ]
}

Be precise with positions. Use the full image coordinate space.`,
          },
        ],
      },
    ],
    max_tokens: 1500,
  });

  try {
    const parsed = JSON.parse(res.choices[0].message.content || '{}') as { objects?: SegmentedObject[] };
    return (parsed.objects ?? []).slice(0, 15);
  } catch {
    return [];
  }
}

export async function refreshInsights(
  imageDescription: string,
  preferences: GardenPreferences
): Promise<Omit<DesignResponse, 'imageUrl' | 'generationMessage' | 'imageDescription' | 'suggestedPlacements'>> {
  const sliderDesc = describeSliders(preferences.sliders);

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You are a professional landscape architect. Respond with valid JSON only.' },
      {
        role: 'user',
        content: `Garden: ${imageDescription}
Preferences: feeling=${preferences.mood}, time=${preferences.timeOfUse}, privacy=${preferences.visibility}, character=${sliderDesc}
Respond: { "harmonyLevel": <0-100>, "suggestions": ["<s1>","<s2>"], "cornerNote": "<observation>", "suggestedObject": { "name": "<object>", "description": "<desc>", "reason": "<why>" } }`,
      },
    ],
    max_tokens: 500,
  });

  try {
    return JSON.parse(res.choices[0].message.content || '{}');
  } catch {
    return {
      harmonyLevel: 70,
      suggestions: ['Add native plants for seasonal interest.', 'A pathway would improve flow.'],
      cornerNote: 'The shaded corner could host a quiet seating alcove.',
      suggestedObject: { name: 'Bamboo Wind Chime', description: 'Natural bamboo acoustic element', reason: 'Adds sensory depth.' },
    };
  }
}
