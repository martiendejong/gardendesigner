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

export interface DesignResult {
  imageUrl: string;
  harmonyLevel: number;
  generationMessage: string;
  suggestions: string[];
  cornerNote: string;
  suggestedObject: SuggestedObject;
  imageDescription: string;
}
