import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FormData, ListingData, StagedImage } from '../types';
import { MapComponent } from './Map';
import { AreaIcon } from './icons/AreaIcon';
import { BedIcon } from './icons/BedIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { PencilIcon } from './icons/PencilIcon';
import { LayoutIcon } from './icons/LayoutIcon';
import { stageImage } from '../services/geminiService';

interface ListingResultProps {
  data: ListingData;
  formData: FormData;
  photos: string[];
  onReset: () => void;
  onEdit: () => void;
  onRegenerateDescription: (instructions: string) => void;
  isRegenerating: boolean;
}

declare const jspdf: any;
declare const html2canvas: any;

const ImageCarousel: React.FC<{ photos: string[] }> = ({ photos }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const prevSlide = () => {
        const isFirstSlide = currentIndex === 0;
        const newIndex = isFirstSlide ? photos.length - 1 : currentIndex - 1;
        setCurrentIndex(newIndex);
    };

    const nextSlide = () => {
        const isLastSlide = currentIndex === photos.length - 1;
        const newIndex = isLastSlide ? 0 : currentIndex + 1;
        setCurrentIndex(newIndex);
    };

    return (
        <div className="relative w-full h-64 md:h-96 group rounded-xl overflow-hidden">
            <div style={{ backgroundImage: `url(${photos[currentIndex]})` }} className="w-full h-full bg-center bg-cover duration-500"></div>
            {/* Left Arrow */}
            <div onClick={prevSlide} className="absolute top-1/2 -translate-y-1/2 left-5 text-2xl rounded-full p-2 bg-black/20 text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowLeftIcon className="w-6 h-6"/>
            </div>
            {/* Right Arrow */}
            <div onClick={nextSlide} className="absolute top-1/2 -translate-y-1/2 right-5 text-2xl rounded-full p-2 bg-black/20 text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRightIcon className="w-6 h-6" />
            </div>
        </div>
    );
};

export const ListingResult: React.FC<ListingResultProps> = ({ data, formData, photos, onReset, onEdit, onRegenerateDescription, isRegenerating }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isTextEditing, setIsTextEditing] = useState(false);
  const [editableTitle, setEditableTitle] = useState(data.title);
  const [editableDescription, setEditableDescription] = useState(data.description);
  const [isRegenModalOpen, setIsRegenModalOpen] = useState(false);
  const [regenInstructions, setRegenInstructions] = useState('');
  
  const [isStagingModalOpen, setIsStagingModalOpen] = useState(false);
  const [selectedPhotosForStaging, setSelectedPhotosForStaging] = useState<Set<number>>(new Set());
  const [stagedImages, setStagedImages] = useState<StagedImage[]>([]);
  const [stagingError, setStagingError] = useState<string | null>(null);
  const [isStaging, setIsStaging] = useState(false);

  const listingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isTextEditing) {
      setEditableTitle(data.title);
      setEditableDescription(data.description);
    }
  }, [data.title, data.description, isTextEditing]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', minimumFractionDigits: 0 }).format(price);
  };
  
  const handleExportPDF = useCallback(async () => {
    if (!listingRef.current) return;
    setIsExporting(true);
    try {
        const { jsPDF } = jspdf;
        const canvas = await html2canvas(listingRef.current, {
            scale: 2, 
            useCORS: true, 
            logging: false
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`autoreal-inzerat.pdf`);
    } catch(e) {
        console.error("Error exporting PDF", e);
        alert("Nastala chyba při exportu do PDF.");
    } finally {
        setIsExporting(false);
    }
  }, []);

  const handleTextEditStart = () => setIsTextEditing(true);

  const handleTextEditSave = () => setIsTextEditing(false);

  const handleTextEditCancel = () => {
    setIsTextEditing(false);
    setEditableTitle(data.title);
    setEditableDescription(data.description);
  };

  const handleRegenerateClick = () => setIsRegenModalOpen(true);
  
  const handleConfirmRegeneration = () => {
    if (isRegenerating) return;
    onRegenerateDescription(regenInstructions);
    setIsRegenModalOpen(false);
    setRegenInstructions('');
  };
  
  const handleCancelRegeneration = () => {
    setIsRegenModalOpen(false);
    setRegenInstructions('');
  };

  const handleTogglePhotoSelection = (index: number) => {
    setSelectedPhotosForStaging(prev => {
        const newSet = new Set(prev);
        if (newSet.has(index)) {
            newSet.delete(index);
        } else {
            newSet.add(index);
        }
        return newSet;
    });
  };

  const handleStartStaging = async () => {
      if (selectedPhotosForStaging.size === 0) return;
      setIsStagingModalOpen(false);
      setIsStaging(true);
      setStagingError(null);

      const initialStagedImages: StagedImage[] = Array.from(selectedPhotosForStaging).map(index => ({
          original: photos[index],
          staged: null,
          isLoading: true,
      }));
      setStagedImages(initialStagedImages);

      const stagingPromises = initialStagedImages.map(async (image, arrayIndex) => {
          try {
              const stagedDataUrl = await stageImage(image.original);
              setStagedImages(prev => {
                  const newImages = [...prev];
                  newImages[arrayIndex] = { ...newImages[arrayIndex], staged: stagedDataUrl, isLoading: false };
                  return newImages;
              });
          } catch (error) {
              console.error(`Staging failed for image ${arrayIndex}:`, error);
              setStagedImages(prev => {
                  const newImages = [...prev];
                  newImages[arrayIndex] = { ...newImages[arrayIndex], isLoading: false, error: 'Nepodařilo se vylepšit.' };
                  return newImages;
              });
              setStagingError('Při vylepšování některých obrázků došlo k chybě.');
          }
      });

      await Promise.all(stagingPromises);
      setIsStaging(false);
      setSelectedPhotosForStaging(new Set());
  };

  return (
    <>
      <div className="max-w-5xl mx-auto animate-fade-in">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div className="w-full md:w-auto">
                  <button onClick={onReset} className="text-blue-600 hover:underline mb-2">&larr; Vytvořit nový inzerát</button>
                  {isTextEditing ? (
                    <input 
                      type="text" 
                      value={editableTitle} 
                      onChange={(e) => setEditableTitle(e.target.value)}
                      className="text-3xl md:text-4xl font-bold w-full p-2 border border-amber-300 rounded-lg bg-amber-50 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <h2 className="text-3xl md:text-4xl font-bold">{editableTitle}</h2>
                  )}
              </div>
              <div className="flex items-center gap-3 self-end md:self-center">
                  <button onClick={onEdit} className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-100 transition">
                      <PencilIcon className="w-5 h-5" /> Upravit inzerát
                  </button>
                  <button onClick={handleExportPDF} disabled={isExporting} className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition disabled:bg-slate-400">
                      <DownloadIcon className="w-5 h-5" /> {isExporting ? 'Exportuji...' : 'Stáhnout PDF'}
                  </button>
              </div>
          </div>
        <div ref={listingRef} className="bg-white p-4 md:p-8 rounded-2xl shadow-lg">
          {photos.length > 0 && <ImageCarousel photos={photos} />}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
              <div className="lg:col-span-2">
                  <div className="border-b pb-6 mb-6">
                      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                          <h3 className="text-2xl font-bold">Popis nemovitosti</h3>
                          {!isTextEditing && (
                              <div className="flex items-center gap-2">
                                  <button 
                                      onClick={handleRegenerateClick} 
                                      disabled={isRegenerating}
                                      className="flex items-center gap-2 text-sm bg-white border border-slate-300 text-slate-700 font-semibold py-1 px-3 rounded-lg hover:bg-slate-100 transition disabled:bg-slate-200 disabled:cursor-not-allowed"
                                  >
                                      <SparklesIcon className={`w-4 h-4 ${isRegenerating ? 'animate-pulse' : ''}`} />
                                      {isRegenerating ? 'Generuji...' : 'Znovu vygenerovat'}
                                  </button>
                                  <button onClick={handleTextEditStart} className="flex items-center gap-2 text-sm bg-white border border-slate-300 text-slate-700 font-semibold py-1 px-3 rounded-lg hover:bg-slate-100 transition">
                                      <PencilIcon className="w-4 h-4" /> Upravit texty
                                  </button>
                              </div>
                          )}
                      </div>
                      
                      {isTextEditing ? (
                          <div>
                              <textarea
                                  value={editableDescription}
                                  onChange={(e) => setEditableDescription(e.target.value)}
                                  rows={12}
                                  className="w-full p-3 border border-amber-300 rounded-lg bg-amber-50 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                              />
                              <div className="mt-4 flex gap-4">
                                  <button onClick={handleTextEditSave} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition">
                                      Uložit změny
                                  </button>
                                  <button onClick={handleTextEditCancel} className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-100 transition">
                                      Zrušit
                                  </button>
                              </div>
                          </div>
                      ) : (
                          <div className="prose prose-slate max-w-none text-slate-600 space-y-4 whitespace-pre-wrap">
                              {editableDescription.split('\n').map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                          </div>
                      )}
                  </div>

                  <div className="border-b pb-6 mb-6">
                      <h3 className="text-2xl font-bold mb-4">Mapa a okolí</h3>
                      <MapComponent center={data.location} property={data.location} pois={data.nearbyPois} />
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl">
                      <h3 className="text-2xl font-bold mb-2 flex items-center gap-2"><SparklesIcon className="w-6 h-6 text-blue-500" /> AI Home Staging</h3>
                      
                      {stagedImages.length === 0 && !isStaging && (
                        <>
                          <p className="text-slate-600 mb-4">Vylepšete své fotky s naší AI. Zvyšte atraktivitu a prodejní cenu vaší nemovitosti.</p>
                          <button onClick={() => setIsStagingModalOpen(true)} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition">Vylepšit fotky s AI</button>
                        </>
                      )}

                      {isStaging && (
                          <div className="text-center">
                              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                              <p className="text-slate-600">Provádím AI staging... To může chvíli trvat.</p>
                          </div>
                      )}
                      
                      {stagingError && <p className="text-red-500 mt-4">{stagingError}</p>}
                      
                      {stagedImages.length > 0 && (
                          <div className="mt-4">
                            <p className="text-slate-600 mb-4">Prohlédněte si vylepšené fotografie.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {stagedImages.map((image, index) => (
                                    <div key={index} className="space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <img src={image.original} alt="Před" className="rounded-lg shadow-md aspect-video object-cover"/>
                                                <p className="text-center font-semibold mt-2 text-slate-700 text-sm">Před</p>
                                            </div>
                                            <div className="flex items-center justify-center">
                                                {image.isLoading && <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>}
                                                {image.error && <div className="text-center text-red-500 text-sm p-2 bg-red-50 rounded-lg">{image.error}</div>}
                                                {image.staged && <img src={image.staged} alt="Po" className="rounded-lg shadow-md aspect-video object-cover"/>}
                                            </div>
                                        </div>
                                         {image.staged && <p className="text-center font-semibold mt-2 text-slate-700 text-sm">Po</p>}
                                    </div>
                                ))}
                            </div>
                          </div>
                      )}
                  </div>
              </div>

              <div className="lg:col-span-1">
                  <div className="sticky top-8 bg-slate-50 border border-slate-200 p-6 rounded-2xl">
                      <p className="text-slate-600 text-lg">Odhadovaná cena</p>
                      <p className="text-4xl font-extrabold text-slate-900 my-2">{formatPrice(data.estimatedPrice)}</p>
                      <button className="w-full mt-4 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition">Mám zájem o prodej</button>
                      
                      <div className="mt-8 pt-6 border-t">
                          <h4 className="font-bold text-lg mb-4">Základní informace</h4>
                          <ul className="space-y-3 text-slate-600">
                            <li className="flex items-center gap-3">
                              <BedIcon className="w-6 h-6 text-blue-500"/>
                              <span>Typ: <span className="font-semibold text-slate-800">{
                                { 'byt': 'Byt', 'dům': 'Dům', 'pozemek': 'Pozemek' }[formData.propertyType]
                              }</span></span>
                            </li>
                            {(formData.propertyType === 'byt' || formData.propertyType === 'dům') && formData.layout && (
                              <li className="flex items-center gap-3">
                                <LayoutIcon className="w-6 h-6 text-blue-500"/> 
                                <span>Dispozice: <span className="font-semibold text-slate-800">{formData.layout}</span></span>
                              </li>
                            )}
                            {formData.size && (
                              <li className="flex items-center gap-3">
                                <AreaIcon className="w-6 h-6 text-blue-500"/>
                                <span>Plocha: <span className="font-semibold text-slate-800">{formData.size} m²</span></span>
                              </li>
                            )}
                          </ul>
                      </div>
                  </div>
              </div>
          </div>
        </div>
      </div>
      
      {isRegenModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full m-4">
            <h3 className="text-2xl font-bold mb-4">Znovu vygenerovat popis</h3>
            <p className="text-slate-600 mb-6">Zadejte instrukce pro AI, jak má nový popis vypadat. Můžete specifikovat tón, klíčové body nebo cílovou skupinu.</p>
            <textarea
              value={regenInstructions}
              onChange={(e) => setRegenInstructions(e.target.value)}
              rows={4}
              placeholder="Např. 'Zaměř se na rodiny s dětmi' nebo 'Zmiň klidnou lokalitu a blízkost parku'"
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition mb-6"
              disabled={isRegenerating}
            />
            <div className="flex justify-end gap-4">
              <button
                onClick={handleCancelRegeneration}
                className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-100 transition"
                disabled={isRegenerating}
              >
                Zrušit
              </button>
              <button
                onClick={handleConfirmRegeneration}
                className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition disabled:bg-slate-400"
                disabled={isRegenerating}
              >
                {isRegenerating ? 'Generuji...' : 'Vygenerovat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isStagingModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-4xl w-full m-4">
            <h3 className="text-2xl font-bold mb-4">Vyberte fotografie pro AI Home Staging</h3>
            <p className="text-slate-600 mb-6">Kliknutím vyberte fotografie, které chcete vylepšit. AI se pokusí je zařídit nebo vylepšit jejich vzhled.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[50vh] overflow-y-auto pr-2">
              {photos.map((photo, index) => (
                <div key={index} className="relative cursor-pointer group" onClick={() => handleTogglePhotoSelection(index)}>
                    <img src={photo} alt={`Fotografie ${index + 1}`} className={`w-full h-32 object-cover rounded-lg transition-all ${selectedPhotosForStaging.has(index) ? 'ring-4 ring-blue-500' : ''}`} />
                    <div className={`absolute inset-0 bg-black transition-opacity rounded-lg ${selectedPhotosForStaging.has(index) ? 'bg-opacity-30' : 'bg-opacity-0 group-hover:bg-opacity-10'}`}></div>
                    <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedPhotosForStaging.has(index) ? 'bg-blue-500 border-blue-500' : 'bg-white/50 border-slate-400'}`}>
                      {selectedPhotosForStaging.has(index) && <span className="text-white">✔</span>}
                    </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-4 mt-8">
              <button
                onClick={() => setIsStagingModalOpen(false)}
                className="bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-100 transition"
              >
                Zrušit
              </button>
              <button
                onClick={handleStartStaging}
                className="bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition disabled:bg-slate-400"
                disabled={selectedPhotosForStaging.size === 0}
              >
                Zahájit home staging ({selectedPhotosForStaging.size})
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};