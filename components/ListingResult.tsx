
import React, { useState, useCallback, useRef } from 'react';
import { ListingData } from '../types';
import { MapComponent } from './Map';
import { AreaIcon } from './icons/AreaIcon';
import { BedIcon } from './icons/BedIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { ShareIcon } from './icons/ShareIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface ListingResultProps {
  data: ListingData;
  photos: string[];
  onReset: () => void;
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

export const ListingResult: React.FC<ListingResultProps> = ({ data, photos, onReset }) => {
  const [isExporting, setIsExporting] = useState(false);
  const listingRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
                <button onClick={onReset} className="text-blue-600 hover:underline mb-2">&larr; Vytvořit nový inzerát</button>
                <h2 className="text-3xl md:text-4xl font-bold">{data.title}</h2>
            </div>
            <div className="flex items-center gap-3 self-end md:self-center">
                <button className="flex items-center gap-2 bg-white border border-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-100 transition">
                    <ShareIcon className="w-5 h-5" /> Sdílet
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
                    <h3 className="text-2xl font-bold mb-4">Popis nemovitosti</h3>
                    <div className="prose prose-slate max-w-none text-slate-600 space-y-4 whitespace-pre-wrap">
                        {data.description.split('\n').map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                    </div>
                </div>

                <div className="border-b pb-6 mb-6">
                    <h3 className="text-2xl font-bold mb-4">Mapa a okolí</h3>
                    <MapComponent center={data.location} property={data.location} pois={data.nearbyPois} />
                </div>
                
                 {/* AI Home Staging Placeholder */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl">
                    <h3 className="text-2xl font-bold mb-2 flex items-center gap-2"><SparklesIcon className="w-6 h-6 text-blue-500" /> AI Home Staging <span className="text-sm bg-blue-500 text-white font-bold px-2 py-0.5 rounded-full">Brzy</span></h3>
                    <p className="text-slate-600 mb-4">Vylepšete své fotky s naší AI. Zvyšte atraktivitu a prodejní cenu vaší nemovitosti.</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <img src="https://picsum.photos/seed/before/400/300" alt="Před" className="rounded-lg shadow-md"/>
                            <p className="text-center font-semibold mt-2 text-slate-700">Před</p>
                        </div>
                        <div>
                            <img src="https://picsum.photos/seed/after/400/300" alt="Po" className="rounded-lg shadow-md"/>
                            <p className="text-center font-semibold mt-2 text-slate-700">Po</p>
                        </div>
                    </div>
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
                           <li className="flex items-center gap-3"><BedIcon className="w-6 h-6 text-blue-500"/> <span>Typ: <span className="font-semibold text-slate-800">Dům/Byt</span></span></li>
                           <li className="flex items-center gap-3"><AreaIcon className="w-6 h-6 text-blue-500"/> <span>Plocha: <span className="font-semibold text-slate-800">75 m²</span></span></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
