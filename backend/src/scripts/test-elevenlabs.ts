import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function listElevenLabsVoices() {
  try {
    console.log('🎤 Fetching available ElevenLabs voices...\n');
    
    const response = await axios.get(
      'https://api.elevenlabs.io/v1/voices',
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!
        }
      }
    );
    
    console.log('Available Voices:');
    console.log('=================\n');
    
    response.data.voices.forEach((voice: any) => {
      console.log(`Name: ${voice.name}`);
      console.log(`Voice ID: ${voice.voice_id}`);
      console.log(`Category: ${voice.category || 'premade'}`);
      if (voice.labels) {
        console.log(`Characteristics: ${Object.entries(voice.labels).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
      }
      if (voice.description) {
        console.log(`Description: ${voice.description}`);
      }
      console.log('---\n');
    });
    
    console.log(`\nTotal voices available: ${response.data.voices.length}`);
    
    // Recommend best voices for sales calls
    console.log('\n🌟 Recommended for Sales Calls:');
    console.log('================================');
    console.log('Professional Male Voices:');
    console.log('- Adam (pNInz6obpgDQGcFmaJgB) - Deep, confident');
    console.log('- Antoni (ErXwobaYiN019PkySvjV) - Well-rounded, friendly');
    console.log('- Clyde (2EiwWnXFnvU5JabPnv8n) - War veteran, trustworthy');
    console.log('\nProfessional Female Voices:');
    console.log('- Rachel (21m00Tcm4TlvDq8ikWAM) - Calm, mature');
    console.log('- Domi (AZnzlk1XvdvUeBnXmlld) - Strong, confident');
    console.log('- Nicole (piTKgcLEGmPE4e6mEKli) - Whispery, seductive (might be too soft)');
    
  } catch (error: any) {
    console.error('Error fetching voices:', error.response?.data || error.message);
  }
}

async function testVoiceSample(voiceId: string, voiceName: string) {
  try {
    console.log(`\n🎙️ Testing ${voiceName} voice...`);
    
    const text = "Hello! This is KC Media Team. We specialize in professional drone photography for commercial real estate. I noticed you have several properties in the Kansas City area that could really benefit from aerial showcasing. Do you have a moment to discuss how we can help your properties lease faster?";
    
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      },
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        responseType: 'arraybuffer'
      }
    );
    
    console.log(`✅ ${voiceName} voice generated successfully!`);
    console.log(`   Audio size: ${(response.data.length / 1024).toFixed(2)} KB`);
    
  } catch (error: any) {
    console.error(`❌ Error testing ${voiceName}:`, error.response?.data || error.message);
  }
}

async function main() {
  await listElevenLabsVoices();
  
  // Test recommended voices
  console.log('\n\n🧪 Testing Voice Samples...');
  console.log('============================');
  
  await testVoiceSample('pNInz6obpgDQGcFmaJgB', 'Adam');
  await testVoiceSample('ErXwobaYiN019PkySvjV', 'Antoni');
  await testVoiceSample('21m00Tcm4TlvDq8ikWAM', 'Rachel');
  await testVoiceSample('2EiwWnXFnvU5JabPnv8n', 'Clyde');
}

main();