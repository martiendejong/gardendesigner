export interface GardenSliders {
  tranquilVibrant: number;
  openSheltered: number;
  lightMass: number;
  socialSolitary: number;
}

export interface GardenPreferences {
  mood: 'tranquil' | 'social' | 'intimate';
  timeOfUse: 'morning' | 'daytime' | 'evening';
  visibility: 'visible' | 'hidden';
  sliders: GardenSliders;
}

export interface SuggestedObject {
  name: string;
  description: string;
  reason: string;
}

export interface SuggestedPlacement {
  name: string;
  emoji: string;
  description: string;
  instruction: string; // ready-to-use chat instruction e.g. "Add a stone bench near the right tree"
}

export interface SegmentedObject {
  id: string;
  label: string;
  emoji: string;
  x: number;   // center x as % of image width (0-100)
  y: number;   // center y as % of image height (0-100)
  width: number;  // bounding box width as % (5-60)
  height: number; // bounding box height as % (5-60)
}

export interface DesignResponse {
  imageUrl: string;
  harmonyLevel: number;
  generationMessage: string;
  suggestions: string[];
  cornerNote: string;
  suggestedObject: SuggestedObject;
  imageDescription: string;
  suggestedPlacements: SuggestedPlacement[];
}
