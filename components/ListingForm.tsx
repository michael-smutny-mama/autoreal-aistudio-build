import React, { useState, useCallback, ChangeEvent, FormEvent, DragEvent } from 'react';
import { FormData } from '../types';
import { UploadIcon } from './icons/UploadIcon';

interface ListingFormProps {
  onSubmit: (data: FormData) => void;
  disabled: boolean;
  initialData?: FormData | null;
}

export const ListingForm: React.FC<ListingFormProps> = ({ onSubmit, disabled, initialData }) => {
  const [address, setAddress] = useState(initialData?.address || '');
  const [propertyType, setPropertyType] = useState<'byt' | 'dům' | 'pozemek'>(initialData?.propertyType || 'byt');
  const [size, setSize] = useState<string>(initialData?.size?.toString() || '');
  const [highlights, setHighlights] = useState(initialData?.highlights || '');
  const [photos, setPhotos] = useState<File[]>(initialData?.photos || []);
  const [error, setError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setPhotos(prev => [...prev, ...newFiles]);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setPhotos(prev => [...prev, ...newFiles]);
      e.dataTransfer.clearData();
    }
  };

  const handleDragEvents = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (photos.length < 3 || photos.length > 8) {
      setError('Prosím, nahrajte 3 až 8 fotografií.');
      return;
    }
    if (!address.trim()) {
      setError('Prosím, zadejte adresu nemovitosti.');
      return;
    }
    onSubmit({
      photos,
      address,
      propertyType,
      size: size ? parseFloat(size) : undefined,
      highlights,
    });
  }, [photos, address, propertyType, size, highlights, onSubmit]);

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 md:p-10 rounded-2xl shadow-lg">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent pb-2">
          Vytvořte inzerát během minuty
        </h2>
        <p className="mt-2 text-lg text-slate-600">
          Zadejte základní údaje a naše AI se postará o zbytek.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <label className="font-bold text-slate-700">Fotografie nemovitosti <span className="text-red-500">*</span></label>
          <p className="text-sm text-slate-500 mb-3">Nahrajte 3-8 fotografií.</p>
          <div
            onDrop={handleDrop}
            onDragEnter={handleDragEvents}
            onDragOver={handleDragEvents}
            onDragLeave={handleDragEvents}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400'
            }`}
          >
            <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" id="file-upload" />
            <label htmlFor="file-upload" className="cursor-pointer">
              <UploadIcon className="w-12 h-12 mx-auto text-slate-400" />
              <p className="mt-2 text-slate-600">Přetáhněte soubory sem nebo <span className="font-semibold text-blue-600">klikněte pro nahrání</span></p>
            </label>
          </div>
          {photos.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {photos.map((photo, index) => (
                <div key={index} className="relative group">
                  <img src={URL.createObjectURL(photo)} alt={`Náhled ${index + 1}`} className="w-full h-24 object-cover rounded-md" />
                  <button type="button" onClick={() => removePhoto(index)} className="absolute top-0 right-0 m-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="address" className="font-bold text-slate-700">Adresa <span className="text-red-500">*</span></label>
          <input id="address" type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Např. Václavské náměstí 1, Praha" required className="mt-2 w-full p-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"/>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="propertyType" className="font-bold text-slate-700">Typ nemovitosti <span className="text-red-500">*</span></label>
            <select id="propertyType" value={propertyType} onChange={e => setPropertyType(e.target.value as any)} className="mt-2 w-full p-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition">
              <option value="byt">Byt</option>
              <option value="dům">Dům</option>
              <option value="pozemek">Pozemek</option>
            </select>
          </div>
          <div>
            <label htmlFor="size" className="font-bold text-slate-700">Velikost (volitelné)</label>
            <div className="relative mt-2">
              <input id="size" type="number" value={size} onChange={e => setSize(e.target.value)} placeholder="Např. 75" className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"/>
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-slate-500">m²</span>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="highlights" className="font-bold text-slate-700">Klíčové vlastnosti (volitelné)</label>
          <p className="text-sm text-slate-500 mb-2">Co dělá vaši nemovitost jedinečnou? (např. "nově zrekonstruovaná kuchyně, klidná ulice, velký balkon")</p>
          <textarea id="highlights" value={highlights} onChange={e => setHighlights(e.target.value)} rows={3} placeholder="Oddělujte čárkou..." className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"></textarea>
        </div>

        {error && <p className="text-red-500 text-center">{error}</p>}
        
        <div className="text-center pt-4">
          <button type="submit" disabled={disabled} className="bg-blue-600 text-white font-bold py-3 px-12 rounded-lg hover:bg-blue-700 transition-all text-lg disabled:bg-slate-400 disabled:cursor-not-allowed">
            {disabled ? 'Generuji...' : 'Vygenerovat inzerát'}
          </button>
        </div>
      </form>
    </div>
  );
};