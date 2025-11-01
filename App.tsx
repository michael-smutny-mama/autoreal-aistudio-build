
import React, { useState, useCallback } from 'react';
import { ListingForm } from './components/ListingForm';
import { ListingResult } from './components/ListingResult';
import { Loader } from './components/Loader';
import { Header } from './components/Header';
import { generateListing } from './services/geminiService';
import { FormData, ListingData } from './types';
import { fileToBase64 } from './utils/fileUtils';

function App() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [listingData, setListingData] = useState<ListingData | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);

  const handleFormSubmit = useCallback(async (formData: FormData) => {
    setIsLoading(true);
    setError(null);
    setListingData(null);

    try {
      const photoPromises = formData.photos.map(fileToBase64);
      const photoBase64s = await Promise.all(photoPromises);
      const photoMimeTypes = formData.photos.map(file => file.type);
      
      setPhotos(photoBase64s.map((base64, index) => `data:${photoMimeTypes[index]};base64,${base64}`));

      const generatedData = await generateListing(formData, photoBase64s, photoMimeTypes);
      setListingData(generatedData);
    } catch (err) {
      console.error(err);
      setError('Nastala chyba při generování inzerátu. Zkuste to prosím znovu.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleReset = () => {
    setListingData(null);
    setError(null);
    setIsLoading(false);
    setPhotos([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <Header />
      <main className="container mx-auto px-4 py-8 md:py-12">
        {!listingData && !isLoading && (
          <ListingForm onSubmit={handleFormSubmit} disabled={isLoading} />
        )}
        
        {isLoading && <Loader />}
        
        {error && !isLoading && (
          <div className="text-center p-8 bg-white rounded-lg shadow-md">
            <p className="text-red-500 text-lg">{error}</p>
            <button
              onClick={handleReset}
              className="mt-6 bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Zkusit to znovu
            </button>
          </div>
        )}
        
        {listingData && !isLoading && (
          <ListingResult data={listingData} photos={photos} onReset={handleReset} />
        )}
      </main>
    </div>
  );
}

export default App;
