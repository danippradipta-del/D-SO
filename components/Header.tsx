
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center space-y-4 pt-8">
      <div className="inline-block px-4 py-1.5 bg-blue-50 rounded-full border border-blue-100 mb-2">
        <span className="text-xs font-bold tracking-widest text-blue-600 uppercase">Digital Service Officer</span>
      </div>
      <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-purple-700">
        ANTREAN SERVICE OFFICER (SO)
      </h1>
      <p className="text-slate-500 text-lg md:text-xl font-medium">
        Selamat Datang di BPJS Kesehatan KC Jember
      </p>
    </header>
  );
};

export default Header;
