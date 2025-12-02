import React, { useState, useRef } from 'react';
import { SiteConfig } from '../types';
import { fileToBase64, saveSiteConfig } from '../services/db';
import { X, Image as ImageIcon, Upload } from 'lucide-react';
import { Button } from './ui/Button';

interface SiteConfigEditorProps {
  config: SiteConfig;
  onClose: () => void;
  onSave: () => void;
}

export const SiteConfigEditor: React.FC<SiteConfigEditorProps> = ({ config: initialConfig, onClose, onSave }) => {
  const [config, setConfig] = useState<SiteConfig>(initialConfig);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const courseInputRef = useRef<HTMLInputElement>(null);

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setConfig({ ...config, heroImage: base64 });
    }
  };

  const handleCourseDefaultUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setConfig({ ...config, defaultCourseImage: base64 });
    }
  };

  const handleSave = () => {
    saveSiteConfig(config);
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            Imagens do Site
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          
          {/* Hero Image */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">Mascote / Imagem da Home</label>
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 bg-slate-800 rounded-lg border border-slate-600 flex items-center justify-center overflow-hidden shrink-0">
                {config.heroImage ? (
                  <img src={config.heroImage} alt="Hero" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-slate-500" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-3">
                  Essa imagem aparece no centro da tela inicial ("Bem-vindo ao..."). Recomenda-se PNG transparente.
                </p>
                <input 
                  type="file" 
                  ref={heroInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleHeroUpload}
                />
                <Button variant="secondary" size="sm" onClick={() => heroInputRef.current?.click()}>
                  <Upload className="w-4 h-4" /> Alterar Imagem
                </Button>
              </div>
            </div>
          </div>

          <hr className="border-slate-700" />

          {/* Default Course Image */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-300">Imagem Padrão de Curso</label>
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 bg-slate-800 rounded-lg border border-slate-600 flex items-center justify-center overflow-hidden shrink-0">
                {config.defaultCourseImage ? (
                  <img src={config.defaultCourseImage} alt="Default Course" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500">
                     <ImageIcon className="w-6 h-6 mb-1" />
                     <span className="text-[10px]">Padrão</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500 mb-3">
                  Essa imagem será usada quando você criar um curso novo e não escolher uma capa específica.
                </p>
                <input 
                  type="file" 
                  ref={courseInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleCourseDefaultUpload}
                />
                <Button variant="secondary" size="sm" onClick={() => courseInputRef.current?.click()}>
                  <Upload className="w-4 h-4" /> Alterar Imagem
                </Button>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 bg-slate-900/50 flex justify-end gap-3 rounded-b-2xl">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Alterações</Button>
        </div>
      </div>
    </div>
  );
};