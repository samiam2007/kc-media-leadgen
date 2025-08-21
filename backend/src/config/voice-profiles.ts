export interface VoiceProfile {
  id: string;
  name: string;
  description: string;
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export const VOICE_PROFILES = {
  // Professional Male Voices
  eric: {
    id: 'cjVigY5qzO86Huf0OWal',
    name: 'Eric',
    description: 'Smooth tenor, professional and trustworthy',
    stability: 0.5,
    similarity_boost: 0.75,
    use_speaker_boost: true
  },
  roger: {
    id: 'CwhRBWXzGAHq8TQ4Fs17',
    name: 'Roger',
    description: 'Classy and easy-going, perfect for conversations',
    stability: 0.6,
    similarity_boost: 0.8,
    use_speaker_boost: true
  },
  chris: {
    id: 'iP95p4xoKVk53GoZ742B',
    name: 'Chris',
    description: 'Natural and down-to-earth, relatable',
    stability: 0.5,
    similarity_boost: 0.75,
    use_speaker_boost: true
  },
  brian: {
    id: 'nPczCjzI2devNBz1zQrb',
    name: 'Brian',
    description: 'Resonant and comforting, great for sales',
    stability: 0.55,
    similarity_boost: 0.8,
    use_speaker_boost: true
  },
  
  // Professional Female Voices
  sarah: {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Sarah',
    description: 'Professional, warm and reassuring',
    stability: 0.5,
    similarity_boost: 0.75,
    use_speaker_boost: true
  },
  rachel: {
    id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    description: 'Matter-of-fact and personable',
    stability: 0.6,
    similarity_boost: 0.7,
    use_speaker_boost: true
  },
  matilda: {
    id: 'XrExE9yKIg1WjnnlVkGX',
    name: 'Matilda',
    description: 'Professional with pleasing alto pitch',
    stability: 0.55,
    similarity_boost: 0.75,
    use_speaker_boost: true
  },
  alice: {
    id: 'Xb7hH8MSUJpSbSDYk0k2',
    name: 'Alice',
    description: 'Clear British accent, professional',
    stability: 0.5,
    similarity_boost: 0.8,
    use_speaker_boost: true
  }
};

// Default voice for KC Media Team
export const DEFAULT_VOICE = VOICE_PROFILES.eric;

// Get voice by campaign type
export function getVoiceForCampaign(campaignType: string): VoiceProfile {
  switch(campaignType) {
    case 'professional':
      return VOICE_PROFILES.eric;
    case 'friendly':
      return VOICE_PROFILES.roger;
    case 'casual':
      return VOICE_PROFILES.chris;
    case 'female_professional':
      return VOICE_PROFILES.sarah;
    default:
      return DEFAULT_VOICE;
  }
}