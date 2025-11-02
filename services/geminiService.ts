import { GoogleGenAI, Type, Modality } from "@google/genai";
import { FormData, ListingData } from '../types';
import { parseDataUrl } from '../utils/fileUtils';

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

const filesAreEqual = (file1: File, file2: File) => {
    return file1.name === file2.name &&
           file1.size === file2.size &&
           file1.lastModified === file2.lastModified;
};

const photoArraysAreEqual = (arr1: File[], arr2: File[]) => {
    if (arr1.length !== arr2.length) return false;
    const sortedArr1 = [...arr1].sort((a, b) => a.name.localeCompare(b.name));
    const sortedArr2 = [...arr2].sort((a, b) => a.name.localeCompare(b.name));
    
    for (let i = 0; i < sortedArr1.length; i++) {
        if (!filesAreEqual(sortedArr1[i], sortedArr2[i])) return false;
    }
    return true;
};

export async function generateListing(
    formData: FormData, 
    photoBase64s: string[], 
    mimeTypes: string[], 
    previousResult?: { formData: FormData; listingData: ListingData; } | null
): Promise<ListingData> {
  const model = "gemini-2.5-flash";
  
  let textPrompt: string;
  let parts: any[];
  let requiresImageAnalysis = true;
  let keepLocationData = false;
  
  if (previousResult) {
      const photosChanged = !photoArraysAreEqual(formData.photos, previousResult.formData.photos);
      const addressChanged = formData.address !== previousResult.formData.address;

      if (!photosChanged && !addressChanged) {
          requiresImageAnalysis = false;
          keepLocationData = true;

          const changes: string[] = [];
          if (formData.propertyType !== previousResult.formData.propertyType) {
              changes.push(`- Typ nemovitosti byl změněn z '${previousResult.formData.propertyType}' na '${formData.propertyType}'.`);
          }
          if (formData.layout !== previousResult.formData.layout) {
              changes.push(`- Dispozice byla upravena z '${previousResult.formData.layout || 'neuvedena'}' na '${formData.layout || 'neuvedena'}'.`);
          }
          if (formData.size !== previousResult.formData.size) {
              changes.push(`- Velikost byla upravena z '${previousResult.formData.size || 'neuvedena'}' na '${formData.size || 'neuvedena'} m²'.`);
          }
          if (formData.highlights !== previousResult.formData.highlights) {
              changes.push(`- Klíčové vlastnosti byly upraveny na: '${formData.highlights || 'Žádné'}'. Původní: '${previousResult.formData.highlights || 'Žádné'}'.`);
          }

          textPrompt = `Jsi expert na prodej nemovitostí v České republice. Tvým úkolem je upravit existující inzerát na základě změn od uživatele. Vrať odpověď VÝHRADNĚ ve formátu JSON podle zadaného schématu. Nepřidávej žádné další formátování jako markdown.

Původní inzerát:
- Titulek: ${previousResult.listingData.title}
- Popis: ${previousResult.listingData.description}
- Odhadovaná cena: ${previousResult.listingData.estimatedPrice} CZK
- Adresa: ${formData.address}

Uživatelem provedené změny:
${changes.length > 0 ? changes.join('\n') : 'Žádné textové změny nebyly provedeny.'}

Na základě těchto změn:
1.  **title**: Mírně uprav titulek, pokud je to relevantní ke změnám. Jinak ponech původní.
2.  **description**: Vylepši existující popis, aby reflektoval nové informace. Zachovej strukturu a tón.
3.  **estimatedPrice**: Přepočítej odhadovanou cenu na základě nových informací (zejména změny velikosti).
4.  **location**: POUŽIJ PŮVODNÍ DATA. Neměň zeměpisnou šířku a délku.
5.  **nearbyPois**: POUŽIJ PŮVODNÍ DATA. Neměň seznam zajímavých míst.

Vrať kompletní JSON objekt, včetně nezměněných 'location' a 'nearbyPois' dat z PŮVODNÍHO inzerátu.`;
      }
  }

  if (requiresImageAnalysis) {
      textPrompt = `
Jsi expert na prodej nemovitostí v České republice. Tvým úkolem je vytvořit profesionální inzerát na základě poskytnutých informací a fotografií. Vrať odpověď VÝHRADNĚ ve formátu JSON podle zadaného schématu. Nepřidávej žádné další formátování jako markdown.

Poskytnuté informace:
- Adresa: ${formData.address}
- Typ nemovitosti: ${formData.propertyType}
${formData.layout ? `- Dispozice: ${formData.layout}` : ''}
${formData.size ? `- Velikost: ${formData.size} m²` : ''}
${formData.highlights ? `- Klíčové vlastnosti: ${formData.highlights}` : ''}

Na základě těchto informací a přiložených fotografií vygeneruj následující:
1.  **title**: Krátký, poutavý titulek inzerátu v češtině.
2.  **description**: Detailní a přesvědčivý popis nemovitosti v češtině. Přirozeně do něj zakomponuj uvedené klíčové vlastnosti. Popis by měl být členěn do několika odstavců pro lepší čitelnost.
3.  **estimatedPrice**: Odhad tržní ceny v CZK. Pokud je uvedena velikost, použij ji pro přesnější odhad. Formátuj jako celé číslo, bez měny.
4.  **location**: Objekt obsahující přesnou zeměpisnou šířku a délku dané adresy.
5.  **nearbyPois**: Pole 5-7 zajímavých míst v okolí (např. park, škola, obchod, restaurace, zastávka MHD).
`;
  }
  
  if (requiresImageAnalysis) {
    const imageParts = photoBase64s.map((base64, index) => ({
      inlineData: {
        data: base64,
        mimeType: mimeTypes[index],
      }
    }));
    parts = [{ text: textPrompt }, ...imageParts];
  } else {
    parts = [{ text: textPrompt }];
  }

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
    let parsedData = JSON.parse(jsonText) as ListingData;
    
    if (keepLocationData && previousResult) {
        parsedData.location = previousResult.listingData.location;
        parsedData.nearbyPois = previousResult.listingData.nearbyPois;
    }
    
    return parsedData;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate listing from AI.");
  }
}


export async function regenerateDescription(
    formData: FormData,
    photoBase64s: string[],
    mimeTypes: string[],
    instructions: string
): Promise<string> {
    const model = "gemini-2.5-flash";

    const userInstructionsPrompt = instructions.trim()
    ? `
Uživatel poskytl následující dodatečné instrukce. DŮSLEDNĚ se jimi řiď:
"${instructions}"
`
    : '';

    const textPrompt = `
Jsi expert na prodej nemovitostí v České republice. Tvým úkolem je napsat nový, kreativní popis pro nemovitost na základě poskytnutých informací, fotografií a případných instrukcí od uživatele. Soustřeď se POUZE na text popisu.

Poskytnuté informace:
- Adresa: ${formData.address}
- Typ nemovitosti: ${formData.propertyType}
${formData.layout ? `- Dispozice: ${formData.layout}` : ''}
${formData.size ? `- Velikost: ${formData.size} m²` : ''}
${formData.highlights ? `- Klíčové vlastnosti: ${formData.highlights}` : ''}
${userInstructionsPrompt}

Na základě těchto informací a přiložených fotografií vygeneruj POUZE nový 'description'.
1.  **description**: Detailní a přesvědčivý popis nemovitosti v češtině. Zkus jiný úhel pohledu než předtím a zapracuj instrukce od uživatele, pokud byly poskytnuty. Popis by měl být členěn do několika odstavců pro lepší čitelnost.

Vrať odpověď VÝHRADNĚ ve formátu JSON podle zadaného schématu. Nepřidávej žádné další formátování jako markdown.
`;

    const imageParts = photoBase64s.map((base64, index) => ({
      inlineData: {
        data: base64,
        mimeType: mimeTypes[index],
      }
    }));
    
    const parts = [{ text: textPrompt }, ...imageParts];
    
    const regenerationSchema = {
        type: Type.OBJECT,
        properties: {
            description: { type: Type.STRING, description: 'Nový detailní a přesvědčivý popis nemovitosti.' },
        },
        required: ['description']
    };

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: parts },
            config: {
                responseMimeType: "application/json",
                responseSchema: regenerationSchema,
                temperature: 0.7,
            }
        });

        const jsonText = response.text.trim();
        const parsedData = JSON.parse(jsonText) as { description: string };
        return parsedData.description;

    } catch (error) {
        console.error("Error calling Gemini API for description regeneration:", error);
        throw new Error("Failed to regenerate description from AI.");
    }
}

export async function stageImage(originalPhotoDataUrl: string): Promise<string> {
    const model = 'gemini-2.5-flash-image';
    const { base64, mimeType } = parseDataUrl(originalPhotoDataUrl);

    const imagePart = {
        inlineData: {
            data: base64,
            mimeType: mimeType,
        },
    };

    const textPart = {
        text: 'Proveďte profesionální virtuální home staging na tomto obrázku místnosti. Pokud je místnost prázdná, vybavte ji stylovým, moderním nábytkem. Pokud je již zařízená, vylepšete stávající nábytek a dekorace, aby vypadala co nejatraktivněji pro inzerát s nemovitostí. Výsledkem by měl být realistický, vysoce kvalitní obrázek.',
    };

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        const imageResponsePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData && part.inlineData.mimeType.startsWith('image/'));

        if (imageResponsePart?.inlineData) {
            const base64ImageBytes: string = imageResponsePart.inlineData.data;
            const responseMimeType: string = imageResponsePart.inlineData.mimeType;
            return `data:${responseMimeType};base64,${base64ImageBytes}`;
        }

        throw new Error('V odpovědi od AI nebyla nalezena žádná obrazová data.');

    } catch (error) {
        console.error("Error calling Gemini API for home staging:", error);
        throw new Error("Nepodařilo se provést staging obrázku.");
    }
}