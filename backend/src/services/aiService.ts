import OpenAI from 'openai';
import sharp from 'sharp';
import type { GardenPreferences, DesignResponse } from '../types/garden';

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
  console.log('\n─── Responses API edit ─────────────────────────────');
  console.log('instruction:', instruction);
  console.log('────────────────────────────────────────────────────\n');

  const response = await openai.responses.create({
    model: 'gpt-4o',
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_image', image_url: imageDataUrl, detail: 'high' },
          { type: 'input_text',  text: instruction },
        ],
      },
    ],
    tools: [{ type: 'image_generation' }],
  });

  console.log('Response output types:', response.output.map((o) => o.type));

  for (const item of response.output) {
    if (item.type === 'image_generation_call' && item.result) {
      console.log('Got image_generation_call result, length:', item.result.length);
      return item.result; // base64 string
    }
  }

  console.log('No image_generation_call found in response');
  return null;
}

// ─── exported functions ──────────────────────────────────────────────────────

export async function analyzeAndDesign(
  imageDataUrl: string,
  preferences: GardenPreferences
): Promise<DesignResponse> {
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
        content: 'You are a professional landscape architect. Study the photo carefully and suggest one specific, small addition to the border areas only. Valid JSON only.',
      },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: resizedDataUrl, detail: 'high' } },
          {
            type: 'text',
            text: `Look at this specific garden photo. Suggest ONE small, realistic addition to the edges or border areas only — do not change the centre.

Intentions: feeling=${preferences.mood}, time=${preferences.timeOfUse}, privacy=${preferences.visibility}, character=${sliderDesc}

Respond with JSON:
{
  "harmonyLevel": <0-100>,
  "generationMessage": "<evocative phrase, max 6 words>",
  "imageDescription": "<2-3 sentences describing exactly what is visible in this photo>",
  "suggestions": ["<suggestion 1>", "<suggestion 2>"],
  "cornerNote": "<one specific observation about an edge or corner in THIS photo>",
  "suggestedObject": { "name": "<object>", "description": "<one line>", "reason": "<why it fits THIS garden>" },
  "editInstruction": "<One specific instruction for editing this photo. Start with an action verb. Describe exactly WHERE to add something (e.g. 'along the left fence', 'in the bottom-right corner'). End with: keeping everything else in the photo exactly as it is. Max 2 sentences. Match mood=${preferences.mood}.>"
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
    editInstruction: string;
  };

  try {
    analysis = JSON.parse(analysisRes.choices[0].message.content || '{}');
  } catch {
    analysis = {
      harmonyLevel: 72,
      generationMessage: 'Enhancing Your Garden...',
      imageDescription: 'A residential garden with existing plantings.',
      suggestions: ['Add layered border planting for depth.', 'A focal point would enhance the mood.'],
      cornerNote: 'The boundary areas offer space for structural planting.',
      suggestedObject: { name: 'Natural Stone Birdbath', description: 'Weathered limestone pedestal', reason: 'Calm focal point that invites wildlife.' },
      editInstruction: `Add a small cluster of ${preferences.mood} flowering plants along the left border, keeping everything else in the photo exactly as it is.`,
    };
  }

  console.log('\n─── GPT-4o analysis ───────────────────────────────');
  console.log('imageDescription:', analysis.imageDescription);
  console.log('editInstruction :', analysis.editInstruction);
  console.log('────────────────────────────────────────────────────\n');

  // 2. Edit the photo via Responses API — same pipeline as ChatGPT
  const b64 = await editWithGPT4o(resizedDataUrl, analysis.editInstruction);

  const imageUrl = b64 ? `data:image/jpeg;base64,${b64}` : '';

  return {
    imageUrl,
    harmonyLevel: analysis.harmonyLevel,
    generationMessage: analysis.generationMessage,
    suggestions: analysis.suggestions,
    cornerNote: analysis.cornerNote,
    suggestedObject: analysis.suggestedObject,
    imageDescription: analysis.imageDescription,
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

export async function refreshInsights(
  imageDescription: string,
  preferences: GardenPreferences
): Promise<Omit<DesignResponse, 'imageUrl' | 'generationMessage' | 'imageDescription'>> {
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
