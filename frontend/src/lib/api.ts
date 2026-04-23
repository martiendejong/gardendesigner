import type { GardenPreferences, DesignResult, SuggestedObject, SegmentedObject } from './types';

const API = '/api';

export async function generateDesign(
  imageDataUrl: string,
  preferences: GardenPreferences
): Promise<DesignResult> {
  const res = await fetch(`${API}/design`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageDataUrl, preferences }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error((err as { error: string }).error || 'Generation failed');
  }
  return res.json() as Promise<DesignResult>;
}

export async function applyInstruction(imageDataUrl: string, instruction: string): Promise<string> {
  const res = await fetch(`${API}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageDataUrl, instruction }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error((err as { error: string }).error || 'Apply failed');
  }
  const data = await res.json() as { imageUrl: string };
  return data.imageUrl;
}

export async function segmentImage(imageDataUrl: string): Promise<SegmentedObject[]> {
  const res = await fetch(`${API}/segment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageDataUrl }),
  });
  if (!res.ok) return [];
  const data = await res.json() as { objects: SegmentedObject[] };
  return data.objects ?? [];
}

export async function refreshInsights(
  imageDescription: string,
  preferences: GardenPreferences
): Promise<{ harmonyLevel: number; suggestions: string[]; cornerNote: string; suggestedObject: SuggestedObject }> {
  const res = await fetch(`${API}/insights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageDescription, preferences }),
  });
  if (!res.ok) throw new Error('Insights refresh failed');
  return res.json();
}
