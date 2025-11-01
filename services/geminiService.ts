
import { GoogleGenAI, Type } from "@google/genai";
import { FormData, ListingData } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: 'Krátký, poutavý titulek inzerátu.' },
        description: { type: Type.STRING, description: 'Detailní a přesvědčivý popis nemovitosti.' },
        estimatedPrice: { type: Type.INTEGER, description: 'Odhad tržní ceny v CZK (celé číslo).' },
        location: {
            type: Type.OBJECT,
            properties: {
                lat: { type: Type.NUMBER, description: 'Zeměpisná šířka.' },
                lng: { type: Type.NUMBER, description: 'Zeměpisná délka.' }
            },
            required: ['lat', 'lng']
        },
        nearbyPois: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    type: { type: Type.STRING },
                    lat: { type: Type.NUMBER },
                    lng: { type: Type.NUMBER }
                },
                required: ['name', 'type', 'lat', 'lng']
            }
        }
    },
    required: ['title', 'description', 'estimatedPrice', 'location', 'nearbyPois']
};


export async function generateListing(formData: FormData, photoBase64s: string[], mimeTypes: string[]): Promise<ListingData> {
  const model = "gemini-2.5-flash";
  
  const textPrompt = `
Jsi expert na prodej nemovitostí v České republice. Tvým úkolem je vytvořit profesionální inzerát na základě poskytnutých informací a fotografií. Vrať odpověď VÝHRADNĚ ve formátu JSON podle zadaného schématu. Nepřidávej žádné další formátování jako markdown.

Poskytnuté informace:
- Adresa: ${formData.address}
- Typ nemovitosti: ${formData.propertyType}
${formData.size ? `- Velikost: ${formData.size} m²` : ''}
${formData.highlights ? `- Klíčové vlastnosti: ${formData.highlights}` : ''}

Na základě těchto informací a přiložených fotografií vygeneruj následující:
1.  **title**: Krátký, poutavý titulek inzerátu v češtině.
2.  **description**: Detailní a přesvědčivý popis nemovitosti v češtině. Přirozeně do něj zakomponuj uvedené klíčové vlastnosti. Popis by měl být členěn do několika odstavců pro lepší čitelnost.
3.  **estimatedPrice**: Odhad tržní ceny v CZK. Pokud je uvedena velikost, použij ji pro přesnější odhad. Formátuj jako celé číslo, bez měny.
4.  **location**: Objekt obsahující přesnou zeměpisnou šířku a délku dané adresy.
5.  **nearbyPois**: Pole 5-7 zajímavých míst v okolí (např. park, škola, obchod, restaurace, zastávka MHD).
`;

  const imageParts = photoBase64s.map((base64, index) => ({
    inlineData: {
      data: base64,
      mimeType: mimeTypes[index],
    }
  }));

  const parts = [{ text: textPrompt }, ...imageParts];

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.5,
      }
    });
    
    const jsonText = response.text.trim();
    const parsedData = JSON.parse(jsonText) as ListingData;
    
    return parsedData;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate listing from AI.");
  }
}
