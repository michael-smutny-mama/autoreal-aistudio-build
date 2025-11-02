import React, { useState, useCallback, useEffect } from 'react';
import { ListingForm } from './components/ListingForm';
import { ListingResult } from './components/ListingResult';
import { Loader } from './components/Loader';
import { Header } from './components/Header';
import { generateListing, regenerateDescription } from './services/geminiService';
import { FormData, ListingData } from './types';
import { fileToBase64 } from './utils/fileUtils';

function App() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [listingData, setListingData] = useState<ListingData | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [submittedFormData, setSubmittedFormData] = useState<FormData | null>(null);
  const [previousResult, setPreviousResult] = useState<{ formData: FormData; listingData: ListingData; } | null>(null);

  const handleFormSubmit = useCallback(async (formData: FormData) => {
    setSubmittedFormData(formData);
    setIsLoading(true);
    setError(null);
    setListingData(null);

    try {
      const photoPromises = formData.photos.map(fileToBase64);
      const photoBase64s = await Promise.all(photoPromises);
      const photoMimeTypes = formData.photos.map(file => file.type);
      
      setPhotos(photoBase64s.map((base64, index) => `data:${photoMimeTypes[index]};base64,${base64}`));

      const generatedData = await generateListing(formData, photoBase64s, photoMimeTypes, previousResult);
      
      setListingData(generatedData);
      setPreviousResult({ formData: formData, listingData: generatedData });
      if (window.location.protocol !== 'blob:') {
        window.history.replaceState(null, '', window.location.pathname);
      }

    } catch (err) {
      console.error(err);
      setError('Nastala chyba při generování inzerátu. Zkuste to prosím znovu.');
    } finally {
      setIsLoading(false);
    }
  }, [previousResult]);
  
  const handleRegenerateDescription = useCallback(async (instructions: string) => {
    if (!submittedFormData) return;
    
    setIsRegenerating(true);
    setError(null);
    
    try {
        const photoPromises = submittedFormData.photos.map(fileToBase64);
        const photoBase64s = await Promise.all(photoPromises);
        const photoMimeTypes = submittedFormData.photos.map(file => file.type);
        
        const newDescription = await regenerateDescription(submittedFormData, photoBase64s, photoMimeTypes, instructions);
        
        setListingData(prevData => {
            if (!prevData) return null;
            const updatedListingData = {
                ...prevData,
                description: newDescription,
            };
            // Update previousResult as well so the next "edit" has the latest text
            if(previousResult){
              setPreviousResult({
                formData: previousResult.formData,
                listingData: updatedListingData
              })
            }
            return updatedListingData;
        });
        
    } catch (err) {
        console.error(err);
        setError('Nastala chyba při přegenerování popisu. Zkuste to prosím znovu.');
    } finally {
        setIsRegenerating(false);
    }
  }, [submittedFormData, previousResult]);


  const handleReset = () => {
    setListingData(null);
    setError(null);
    setIsLoading(false);
    setPhotos([]);
    setSubmittedFormData(null);
    setPreviousResult(null);
    if (window.location.protocol !== 'blob:') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const handleEdit = () => {
    setListingData(null);
  };

  const renderContent = () => {
    if (listingData) {
      return (
        <ListingResult 
          data={listingData}
          formData={submittedFormData!} 
          photos={photos} 
          onReset={handleReset} 
          onEdit={handleEdit}
          onRegenerateDescription={handleRegenerateDescription}
          isRegenerating={isRegenerating}
        />
      );
    }
    if (isLoading) {
      return <Loader />;
    }
    if (error) {
       return (
          <div className="text-center p-8 bg-white rounded-lg shadow-md">
            <p className="text-red-500 text-lg">{error}</p>
            <button
              onClick={handleReset}
              className="mt-6 bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Vytvořit nový inzerát
            </button>
          </div>
        );
    }
    return (
       <ListingForm 
            onSubmit={handleFormSubmit} 
            disabled={isLoading} 
            initialData={submittedFormData}
          />
    );
  };


  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <Header />
      <main className="container mx-auto px-4 py-8 md:py-12">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;