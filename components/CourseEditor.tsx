
import React, { useState, useRef } from 'react';
import { Course, Lesson, Exercise } from '../types';
import { fileToBase64, saveCourse } from '../services/db';
import { X, Plus, Trash2, Video, FileText, FolderOpen, CheckCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Input, TextArea } from './ui/Input';

interface CourseEditorProps {
  course: Course | null;
  onClose: () => void;
  onSave: () => void;
}

export const CourseEditor: React.FC<CourseEditorProps> = ({ course: initialCourse, onClose, onSave }) => {
  // If null, we are creating a new course
  const [course, setCourse] = useState<Course>(initialCourse || {
    id: crypto.randomUUID(),
    title: '',
    description: '',
    coverImage: null,
    pdfUrl: null,
    lessons: [],
    exercises: []
  });

  const [editingExerciseLessonId, setEditingExerciseLessonId] = useState<string | null>(null);

  // File refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // --- Handlers ---

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setCourse({ ...course, coverImage: base64 });
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCourse({ ...course, pdfUrl: file.name }); 
    }
  };

  const addLesson = () => {
    const newLesson: Lesson = {
      id: crypto.randomUUID(),
      title: 'Nova Aula',
      description: '',
      videoUrl: '',
      status: 'pending',
      module: ''
    };
    setCourse({ ...course, lessons: [...course.lessons, newLesson] });
  };

  const updateLesson = (id: string, field: keyof Lesson, value: string) => {
    setCourse({
      ...course,
      lessons: course.lessons.map(l => l.id === id ? { ...l, [field]: value } : l)
    });
  };

  const handleVideoFileSelect = (e: React.ChangeEvent<HTMLInputElement>, lessonId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      updateLesson(lessonId, 'videoUrl', objectUrl);
    }
  };

  const deleteLesson = (id: string) => {
    setCourse({
      ...course,
      lessons: course.lessons.filter(l => l.id !== id)
    });
  };

  const handleSave = () => {
    if (!course.title) return alert('O curso precisa de um nome.');
    saveCourse(course);
    onSave();
  };

  // --- Exercise Modal Render ---
  const renderExerciseModal = () => {
    if (!editingExerciseLessonId) return null;

    const lesson = course.lessons.find(l => l.id === editingExerciseLessonId);
    if (!lesson) return null;

    const lessonExercises = course.exercises.filter(e => e.lessonId === editingExerciseLessonId);

    const addExercise = () => {
      const newEx: Exercise = {
        id: crypto.randomUUID(),
        lessonId: editingExerciseLessonId,
        statement: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctOption: 'A'
      };
      setCourse({ ...course, exercises: [...course.exercises, newEx] });
    };

    const updateExercise = (id: string, field: keyof Exercise, value: string) => {
      setCourse({
        ...course,
        exercises: course.exercises.map(e => e.id === id ? { ...e, [field]: value } : e)
      });
    };

    const removeExercise = (id: string) => {
      setCourse({ ...course, exercises: course.exercises.filter(e => e.id !== id) });
    };

    const clearAllExercises = () => {
      if(confirm("Deseja excluir todos os exercícios deste módulo?")) {
        setCourse({ ...course, exercises: course.exercises.filter(e => e.lessonId !== editingExerciseLessonId) });
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="bg-surface w-full max-w-5xl rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
          
          {/* Modal Header */}
          <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900">
            <div>
              <h3 className="text-xl font-bold text-white">Exercícios do módulo:</h3>
              <span className="text-primary font-medium text-lg">{lesson.module || lesson.title}</span>
            </div>
            <div className="flex items-center gap-3">
               <span className="text-slate-400 bg-slate-800 px-3 py-1 rounded-full text-sm border border-slate-700">
                 Quantidade: {lessonExercises.length}
               </span>
               <Button onClick={addExercise} size="sm">Adicionar Questão</Button>
               {lessonExercises.length > 0 && (
                 <Button variant="danger" size="sm" onClick={clearAllExercises}>Excluir Tudo</Button>
               )}
               <button onClick={() => setEditingExerciseLessonId(null)} className="ml-4 text-slate-400 hover:text-white">
                <X className="w-8 h-8" />
              </button>
            </div>
          </div>
          
          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background">
            
            {lessonExercises.length === 0 && (
              <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-2xl">
                <FileText className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 text-lg">Nenhum exercício criado para este módulo.</p>
                <Button onClick={addExercise} className="mt-4">Criar primeira questão</Button>
              </div>
            )}

            {lessonExercises.map((ex, idx) => (
              <div key={ex.id} className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-sm">
                
                {/* Question Header */}
                <div className="flex justify-between items-center mb-4">
                  <span className="text-slate-400 font-medium text-sm">Questão {idx + 1} - Enunciado</span>
                  <button onClick={() => removeExercise(ex.id)} className="text-red-500 hover:text-red-400 text-xs flex items-center gap-1 hover:underline">
                    <Trash2 className="w-3 h-3" /> Remover questão
                  </button>
                </div>

                {/* Statement */}
                <textarea 
                  value={ex.statement} 
                  onChange={(e) => updateExercise(ex.id, 'statement', e.target.value)}
                  placeholder="Digite o enunciado da questão..."
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white placeholder-slate-500 focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none h-24 mb-6"
                />

                {/* Alternatives Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {/* Option A */}
                  <div className="space-y-2">
                    <label className="text-xs text-slate-500 font-bold uppercase">Alternativa A</label>
                    <input 
                      type="text" 
                      value={ex.optionA}
                      onChange={(e) => updateExercise(ex.id, 'optionA', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white focus:border-indigo-500 outline-none"
                      placeholder="Texto da alternativa"
                    />
                    <label className="flex items-center gap-2 cursor-pointer mt-1">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${ex.correctOption === 'A' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600'}`}>
                        <input type="radio" name={`correct-${ex.id}`} checked={ex.correctOption === 'A'} onChange={() => updateExercise(ex.id, 'correctOption', 'A')} className="hidden" />
                        {ex.correctOption === 'A' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                      </div>
                      <span className={`text-xs ${ex.correctOption === 'A' ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>Correta</span>
                    </label>
                  </div>

                  {/* Option B */}
                  <div className="space-y-2">
                    <label className="text-xs text-slate-500 font-bold uppercase">Alternativa B</label>
                    <input 
                      type="text" 
                      value={ex.optionB}
                      onChange={(e) => updateExercise(ex.id, 'optionB', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white focus:border-indigo-500 outline-none"
                      placeholder="Texto da alternativa"
                    />
                    <label className="flex items-center gap-2 cursor-pointer mt-1">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${ex.correctOption === 'B' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600'}`}>
                        <input type="radio" name={`correct-${ex.id}`} checked={ex.correctOption === 'B'} onChange={() => updateExercise(ex.id, 'correctOption', 'B')} className="hidden" />
                        {ex.correctOption === 'B' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                      </div>
                      <span className={`text-xs ${ex.correctOption === 'B' ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>Correta</span>
                    </label>
                  </div>

                  {/* Option C */}
                  <div className="space-y-2">
                    <label className="text-xs text-slate-500 font-bold uppercase">Alternativa C</label>
                    <input 
                      type="text" 
                      value={ex.optionC}
                      onChange={(e) => updateExercise(ex.id, 'optionC', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white focus:border-indigo-500 outline-none"
                      placeholder="Texto da alternativa"
                    />
                    <label className="flex items-center gap-2 cursor-pointer mt-1">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${ex.correctOption === 'C' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600'}`}>
                        <input type="radio" name={`correct-${ex.id}`} checked={ex.correctOption === 'C'} onChange={() => updateExercise(ex.id, 'correctOption', 'C')} className="hidden" />
                        {ex.correctOption === 'C' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                      </div>
                      <span className={`text-xs ${ex.correctOption === 'C' ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>Correta</span>
                    </label>
                  </div>

                  {/* Option D */}
                  <div className="space-y-2">
                    <label className="text-xs text-slate-500 font-bold uppercase">Alternativa D</label>
                    <input 
                      type="text" 
                      value={ex.optionD}
                      onChange={(e) => updateExercise(ex.id, 'optionD', e.target.value)}
                      className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white focus:border-indigo-500 outline-none"
                      placeholder="Texto da alternativa"
                    />
                    <label className="flex items-center gap-2 cursor-pointer mt-1">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${ex.correctOption === 'D' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600'}`}>
                        <input type="radio" name={`correct-${ex.id}`} checked={ex.correctOption === 'D'} onChange={() => updateExercise(ex.id, 'correctOption', 'D')} className="hidden" />
                        {ex.correctOption === 'D' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                      </div>
                      <span className={`text-xs ${ex.correctOption === 'D' ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>Correta</span>
                    </label>
                  </div>
                </div>

              </div>
            ))}
          </div>

          <div className="p-4 border-t border-slate-700 bg-slate-900 flex justify-end">
             <Button onClick={() => setEditingExerciseLessonId(null)} className="w-full md:w-auto">
               <CheckCircle className="w-4 h-4 mr-2" /> Salvar e Fechar
             </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {renderExerciseModal()}

      <div className="bg-surface w-full max-w-4xl rounded-2xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-white">
            {initialCourse ? 'Editar Curso' : 'Novo Curso'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          
          <div className="space-y-6">
            {/* Image */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Imagem do curso</label>
              <div className="flex items-center gap-4">
                <input 
                  type="file" 
                  ref={imageInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                >
                  Escolher Arquivo
                </Button>
                <span className="text-sm text-slate-500 italic">
                  {course.coverImage ? 'Imagem carregada' : 'Nenhum arquivo escolhido'}
                </span>
              </div>
              {course.coverImage && (
                <img src={course.coverImage} alt="Preview" className="mt-3 h-32 w-auto rounded-lg border border-slate-700 object-cover" />
              )}
            </div>

            {/* Basic Info */}
            <Input 
              label="Nome do curso" 
              value={course.title} 
              onChange={(e) => setCourse({...course, title: e.target.value})}
              placeholder="Ex: Excel 2021 - Formação Básica"
            />

            <TextArea 
              label="Descrição" 
              value={course.description} 
              onChange={(e) => setCourse({...course, description: e.target.value})}
              rows={4}
              placeholder="Descreva o que o aluno irá aprender..."
            />

            {/* PDF */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Apostila (PDF)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="file" 
                  ref={pdfInputRef} 
                  className="hidden" 
                  accept=".pdf"
                  onChange={handlePdfUpload}
                />
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm"
                  onClick={() => pdfInputRef.current?.click()}
                >
                  Escolher Arquivo
                </Button>
                <span className="text-sm text-slate-500 italic">
                  {course.pdfUrl ? course.pdfUrl : 'Nenhum arquivo escolhido'}
                </span>
              </div>
            </div>

            {/* Lessons Divider */}
            <div className="pt-6 border-t border-slate-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Aulas</h3>
                <span className="bg-emerald-900/30 text-emerald-400 text-xs px-3 py-1 rounded-full border border-emerald-800">
                  {course.lessons.length} {course.lessons.length === 1 ? 'Aula' : 'Aulas'}
                </span>
              </div>

              <div className="space-y-4">
                {course.lessons.map((lesson, idx) => (
                  <div key={lesson.id} className="group bg-slate-900/40 border border-slate-700 rounded-lg p-4 transition-all hover:border-slate-600 relative">
                    
                    {/* Delete Button - Floating Top Right */}
                    <div className="absolute top-2 right-2 flex gap-2">
                        <Button 
                          variant="danger" 
                          size="sm" 
                          onClick={() => deleteLesson(lesson.id)}
                          title="Excluir Aula"
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="flex flex-col gap-4 pr-10">
                      
                      {/* 1. Module Input */}
                      <Input 
                        placeholder="Nome do módulo (ex.: Módulo 1)"
                        value={lesson.module || ''}
                        onChange={(e) => updateLesson(lesson.id, 'module', e.target.value)}
                        className="bg-slate-950/50"
                      />

                      {/* 2. Video Title Input */}
                      <Input 
                        placeholder="Título do vídeo"
                        value={lesson.title}
                        onChange={(e) => updateLesson(lesson.id, 'title', e.target.value)}
                        className="bg-slate-950/50"
                      />

                      {/* 3. File Selection Row */}
                      <div className="flex items-center gap-3">
                         <input 
                            type="file" 
                            id={`video-upload-${lesson.id}`} 
                            className="hidden" 
                            accept="video/*"
                            onChange={(e) => handleVideoFileSelect(e, lesson.id)}
                         />
                         <Button 
                            variant="secondary"
                            size="sm"
                            type="button"
                            onClick={() => document.getElementById(`video-upload-${lesson.id}`)?.click()}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold"
                         >
                            Escolher Arquivo
                         </Button>
                         <span className="text-sm text-slate-400 italic truncate max-w-xs">
                           {lesson.videoUrl && lesson.videoUrl.startsWith('blob:') 
                              ? 'Arquivo selecionado' 
                              : 'Nenhum arquivo escolhido'}
                         </span>
                      </div>

                      {/* Optional URL input for YouTube fallback */}
                      <div className="flex items-center gap-2">
                         <Video className="w-4 h-4 text-slate-500" />
                         <input 
                           type="text"
                           value={lesson.videoUrl}
                           onChange={(e) => updateLesson(lesson.id, 'videoUrl', e.target.value)}
                           className="flex-1 bg-transparent border-none text-xs text-slate-500 focus:text-slate-300 placeholder-slate-700 focus:ring-0"
                           placeholder="Ou cole uma URL (YouTube/Externo)..."
                         />
                      </div>

                      {/* Add Exercises Button */}
                      <div className="border-t border-slate-700/50 pt-3">
                        <button 
                          onClick={() => setEditingExerciseLessonId(lesson.id)}
                          className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                          Adicionar Exercícios
                        </button>
                      </div>
                      
                    </div>
                  </div>
                ))}
              </div>

              <Button 
                onClick={addLesson} 
                variant="secondary" 
                className="w-full mt-4 border-dashed border-2 border-slate-700 hover:border-indigo-500/50 bg-slate-900/30"
              >
                <Plus className="w-4 h-4" /> Adicionar nova aula
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 bg-slate-900/50 flex justify-end gap-3 rounded-b-2xl">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Curso</Button>
        </div>
      </div>
    </div>
  );
};
