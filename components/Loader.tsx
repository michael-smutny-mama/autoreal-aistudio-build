
import React, { useState, useEffect } from 'react';

const loadingMessages = [
  "Analyzuji fotografie nemovitosti...",
  "Hledám nejlepší prodejní argumenty...",
  "Počítám odhadovanou cenu...",
  "Prohledávám mapy okolí...",
  "Skládám dohromady finální inzerát...",
  "Už to skoro bude!"
];

export const Loader: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prevIndex => (prevIndex + 1) % loadingMessages.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center text-center p-10 bg-white rounded-lg shadow-md animate-fade-in">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">AI generuje váš inzerát</h2>
      <p className="text-slate-600 transition-opacity duration-500">{loadingMessages[messageIndex]}</p>
    </div>
  );
};
