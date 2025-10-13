import dotenv from 'dotenv';

dotenv.config();

let openaiInstance: any = null;

function getOpenAI() {
  if (!openaiInstance) {
    // Check for API key in environment variables first, then check settings
    let apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      // Try to load from settings file
      try {
        const fs = require('fs');
        const os = require('os');
        const path = require('path');
        const settingsPath = path.join(os.homedir(), '.commonbase-electron', 'settings.json');

        if (fs.existsSync(settingsPath)) {
          const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
          apiKey = settings.openaiApiKey;
        }
      } catch (error) {
        // Settings file doesn't exist or is invalid
      }
    }

    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please configure it in the Settings page.');
    }

    // Lazy import to avoid bundling issues
    const OpenAI = require('openai');
    openaiInstance = new OpenAI({ apiKey });
  }
  return openaiInstance;
}

// Reset the OpenAI instance when settings change
export function resetOpenAI() {
  openaiInstance = null;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const openai = getOpenAI();
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.replace(/\n/g, ' '),
      dimensions: 1536,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

export async function describeImage(imagePath: string, mimeType?: string): Promise<string> {
  try {
    const openai = getOpenAI();
    const fs = require('fs');
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const imageMimeType = mimeType || 'image/jpeg';

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please provide a detailed description of this image, including any text, objects, people, scenes, or other relevant details that would be useful for semantic search and knowledge management."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${imageMimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
    });

    return response.choices[0]?.message?.content || 'Unable to describe image.';
  } catch (error) {
    console.error('Error describing image:', error);
    throw error;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

  return dotProduct / (magnitudeA * magnitudeB);
}