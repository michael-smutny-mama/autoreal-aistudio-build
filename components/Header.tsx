
import React from 'react';
import { HomeIcon } from './icons/HomeIcon';

export const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center">
        <HomeIcon className="h-8 w-8 text-blue-600" />
        <h1 className="text-2xl font-bold ml-3 text-slate-800 tracking-tight">
          Auto<span className="text-blue-600">Real</span>
        </h1>
      </div>
    </header>
  );
};
