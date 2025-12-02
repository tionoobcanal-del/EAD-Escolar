import React, { useState, useEffect, useRef } from 'react';
import { Course, ViewState, Lesson, Exercise, SiteConfig } from './types';
import { getCourses, deleteCourse, getSiteConfig } from './services/db';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { CourseEditor } from './components/CourseEditor';
import { SiteConfigEditor } from './components/SiteConfigEditor';
import { User, Lock, LogOut, BookOpen, Search, PlayCircle, MonitorPlay, ChevronLeft, CheckCircle, Download, Upload, XCircle, Image as ImageIcon } from 'lucide-react';

function App() {
  // Auth persistence logic: check localStorage on init
  const [view, setView] = useState<ViewState>(() => {
    const savedSession = localStorage.getItem('evp_auth_session');
    return savedSession === 'admin' ? 'admin-dashboard' : 'home';
  });

  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Site Config State
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({ heroImage: null, defaultCourseImage: null });
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Auth state
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  
  // Admin Editing state
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Player state
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  
  // Player Interaction State (Exercises)
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({}); // exerciseId -> selectedOption
  const [showResults, setShowResults] = useState<Record<string, boolean>>({}); // exerciseId -> boolean

  // Backup ref
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load courses and config on mount
    setCourses(getCourses());
    setSiteConfig(getSiteConfig());
  }, []);

  const refreshCourses = () => {
    setCourses(getCourses());
    setSiteConfig(getSiteConfig());
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUser === 'adm' && loginPass === 'adm') {
      localStorage.setItem('evp_auth_session', 'admin'); // Persist session
      setView('admin-dashboard');
      setLoginUser('');
      setLoginPass('');
    } else {
      alert('Credenciais inválidas. Tente adm/adm');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('evp_auth_session'); // Clear session
    setView('home');
  };

  // --- Backup Functions ---
  const handleExportData = () => {
    const data = localStorage.getItem('evp_platform_data');
    if (!data) {
      alert('Não há dados para exportar.');
      return;
    }
    // Create a Blob with the JSON data
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link to download
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_ead_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('ATENÇÃO: Importar um backup substituirá todos os cursos e aulas atuais. Deseja continuar?')) {
      if (importInputRef.current) importInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        // Basic validation
        const parsed = JSON.parse(json);
        if (Array.isArray(parsed)) {
          localStorage.setItem('evp_platform_data', json);
          refreshCourses();
          alert('Dados importados com sucesso! O sistema foi atualizado.');
        } else {
          alert('Arquivo de backup inválido.');
        }
      } catch (err) {
        alert('Erro ao ler o arquivo. Certifique-se de que é um arquivo JSON válido.');
      }
    };
    reader.readAsText(file);
    
    // Reset input
    if (importInputRef.current) importInputRef.current.value = '';
  };

  // New function to handle smart navigation to admin area
  const handleAdminAccess = () => {
    const session = localStorage.getItem('evp_auth_session');
    if (session === 'admin') {
      setView('admin-dashboard');
    } else {
      setView('login');
    }
  };

  const handleDeleteCourse = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este curso?')) {
      deleteCourse(id);
      refreshCourses();
    }
  };

  const openCoursePlayer = (course: Course) => {
    setSelectedCourse(course);
    // Start with first lesson if available
    setCurrentLesson(course.lessons.length > 0 ? course.lessons[0] : null);
    // Reset exercise state when opening a new course
    setUserAnswers({});
    setShowResults({});
    setView('course-player');
  };

  // Exercise Handlers
  const handleOptionSelect = (exerciseId: string, option: string) => {
    if (showResults[exerciseId]) return; // Prevent changing after result is shown
    setUserAnswers(prev => ({ ...prev, [exerciseId]: option }));
  };

  const handleCheckAnswer = (exerciseId: string) => {
    if (!userAnswers[exerciseId]) return alert("Por favor, selecione uma alternativa.");
    setShowResults(prev => ({ ...prev, [exerciseId]: true }));
  };

  const filteredCourses = courses.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper to safely determine video source type and URL
  const getVideoSource = (url: string) => {
    if (!url) return { type: 'none', src: '' };
    
    const cleanUrl = url.trim();

    // 1. Check for Local Files (Blobs created by "Procurar Video")
    if (cleanUrl.startsWith('blob:')) {
       return { type: 'native', src: cleanUrl };
    }

    // 2. Check for YouTube
    // Comprehensive regex for YouTube Video IDs
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = cleanUrl.match(youtubeRegex);

    if (match && match[1]) {
      // Return the embed URL which is required for iframes
      return { type: 'youtube', src: `https://www.youtube.com/embed/${match[1]}` };
    }

    // 3. Fallback for generic MP4 links or other inputs
    return { type: 'native', src: cleanUrl };
  };

  // --- Views ---

  const renderHome = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      {/* Abstract Background Shapes */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />

      <header className="absolute top-0 w-full p-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-primary to-purple-600 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <MonitorPlay className="text-white w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">Select <span className="text-primary">EAD</span></span>
        </div>
        <div className="flex gap-4">
          <Button variant="ghost" onClick={handleAdminAccess}>Administração</Button>
          <Button variant="secondary" onClick={() => {
             const element = document.getElementById('courses-section');
             element?.scrollIntoView({ behavior: 'smooth' });
          }}>Ver Cursos</Button>
        </div>
      </header>

      <main className="z-10 text-center max-w-4xl px-6 mt-10">
        <div className="mb-8 relative inline-block">
          <div className="absolute inset-0 bg-primary blur-2xl opacity-30 animate-pulse"></div>
          <img 
            src={siteConfig.heroImage || "https://cdn-icons-png.flaticon.com/512/3069/3069172.png"} 
            alt="Robot Mascot" 
            className="w-48 h-48 relative z-10 mx-auto drop-shadow-2xl object-contain"
          />
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tight">
          Bem-vindo ao <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">EVP</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          Videoaulas objetivas que aceleram sua formação e te preparam para o futuro. 
          Acesse todo o conteúdo offline diretamente do seu laboratório.
        </p>
        <Button size="lg" className="rounded-full px-12" onClick={() => {
             const element = document.getElementById('courses-section');
             element?.scrollIntoView({ behavior: 'smooth' });
          }}>
          Começar Agora
        </Button>
      </main>

      {/* Courses Grid Section */}
      <div id="courses-section" className="w-full bg-surface/50 mt-32 py-20 min-h-screen">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-white mb-12 flex items-center gap-3">
            <BookOpen className="text-primary" />
            Cursos Disponíveis
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.length === 0 ? (
              <p className="text-slate-500">Nenhum curso disponível no momento.</p>
            ) : (
              courses.map(course => (
                <div key={course.id} className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1">
                  <div className="h-48 overflow-hidden relative">
                    {course.coverImage ? (
                      <img src={course.coverImage} alt={course.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      siteConfig.defaultCourseImage ? (
                        <img src={siteConfig.defaultCourseImage} alt={course.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-600">
                          <BookOpen size={48} />
                        </div>
                      )
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-80" />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{course.title}</h3>
                    <p className="text-slate-400 text-sm mb-6 line-clamp-3 h-16">{course.description}</p>
                    <Button className="w-full" onClick={() => openCoursePlayer(course)}>
                      Acessar Curso
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <footer className="w-full py-8 text-center text-slate-600 text-sm bg-background border-t border-slate-800">
        &copy; {new Date().getFullYear()} Select Informática. Todos os direitos reservados.
      </footer>
    </div>
  );

  const renderLogin = () => {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md bg-surface p-8 rounded-2xl border border-slate-700 shadow-2xl">
          <div className="text-center mb-8">
            <div className="mx-auto w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-white">Área Administrativa</h2>
            <p className="text-slate-400 text-sm mt-2">Entre com suas credenciais de instrutor</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <Input 
              label="Usuário" 
              placeholder="adm"
              value={loginUser}
              onChange={(e) => setLoginUser(e.target.value)}
            />
            <Input 
              label="Senha" 
              type="password" 
              placeholder="adm"
              value={loginPass}
              onChange={(e) => setLoginPass(e.target.value)}
            />
            <Button type="submit" className="w-full h-12">Entrar</Button>
          </form>
          <div className="mt-6 text-center">
            <button onClick={() => setView('home')} className="text-sm text-slate-500 hover:text-white transition-colors">
              Voltar ao site
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderAdminDashboard = () => (
    <div className="min-h-screen bg-background text-slate-100">
      <header className="border-b border-slate-800 bg-surface/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
             <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
                <MonitorPlay className="w-4 h-4 text-white" />
             </div>
             <span>Administração</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setView('home')}>Ir para o Site</Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-8 mt-8">
        
        {/* Account & Backup Section */}
        <div className="bg-surface rounded-xl border border-slate-700 p-6 shadow-lg">
          <h2 className="text-xl font-bold mb-6 border-l-4 border-primary pl-3">Conta</h2>
          <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900/50 p-4 rounded-lg border border-slate-800 gap-4">
            
            <div className="flex items-center gap-3">
              <div className="bg-slate-700 p-2 rounded-full">
                <User className="w-5 h-5 text-slate-300" />
              </div>
              <span className="text-slate-300">Logado como <strong className="text-white">adm</strong></span>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Hidden File Input for Restore */}
              <input 
                type="file" 
                ref={importInputRef} 
                className="hidden" 
                accept=".json"
                onChange={handleImportData}
              />
              
              {/* SITE IMAGES BUTTON */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsConfigModalOpen(true)} 
                className="text-slate-300 hover:text-white hover:bg-slate-800"
                title="Alterar imagens do site"
              >
                <ImageIcon className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Imagens do Site</span>
              </Button>

              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleExportData} 
                className="text-slate-400 hover:text-white"
                title="Fazer backup dos dados"
              >
                <Download className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Backup</span>
              </Button>

              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => importInputRef.current?.click()}
                className="text-slate-400 hover:text-white"
                title="Restaurar backup"
              >
                <Upload className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Restaurar</span>
              </Button>

              <div className="w-px h-6 bg-slate-700 mx-2 hidden md:block"></div>

              <Button variant="secondary" size="sm" onClick={handleLogout} className="border-slate-600">
                Sair
              </Button>
            </div>

          </div>
        </div>

        {/* Courses Section */}
        <div className="bg-surface rounded-xl border border-slate-700 p-6 shadow-lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-xl font-bold border-l-4 border-emerald-500 pl-3">Cursos</h2>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Buscar..." 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm focus:border-primary focus:outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button onClick={() => { setEditingCourse(null); setIsEditorOpen(true); }}>
                Adicionar Curso
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCourses.map(course => (
              <div key={course.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex gap-4 hover:border-slate-600 transition-colors">
                <div className="w-16 h-16 bg-slate-800 rounded-md shrink-0 overflow-hidden">
                  {course.coverImage ? (
                    <img src={course.coverImage} className="w-full h-full object-cover" alt="" />
                  ) : (
                    siteConfig.defaultCourseImage ? (
                        <img src={siteConfig.defaultCourseImage} alt={course.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600"><BookOpen size={20} /></div>
                      )
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white truncate">{course.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{course.description}</p>
                  <div className="mt-3 flex gap-2">
                    <button 
                      onClick={() => { setEditingCourse(course); setIsEditorOpen(true); }}
                      className="text-xs px-3 py-1 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition-colors"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => handleDeleteCourse(course.id)}
                      className="text-xs px-3 py-1 bg-red-900/30 text-red-400 border border-red-900/50 rounded hover:bg-red-900/50 transition-colors"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredCourses.length === 0 && (
              <div className="col-span-full py-8 text-center text-slate-500">
                Nenhum curso encontrado.
              </div>
            )}
          </div>
        </div>
      </main>

      {isEditorOpen && (
        <CourseEditor 
          course={editingCourse} 
          onClose={() => setIsEditorOpen(false)} 
          onSave={() => { setIsEditorOpen(false); refreshCourses(); }} 
        />
      )}

      {isConfigModalOpen && (
        <SiteConfigEditor 
          config={siteConfig} 
          onClose={() => setIsConfigModalOpen(false)} 
          onSave={() => { setIsConfigModalOpen(false); refreshCourses(); }} 
        />
      )}
    </div>
  );

  const renderCoursePlayer = () => {
    if (!selectedCourse) return null;

    const videoSource = getVideoSource(currentLesson?.videoUrl || '');

    return (
      <div className="min-h-screen bg-background flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 bg-surface flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('home')} className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white">
              <ChevronLeft />
            </button>
            <h1 className="font-bold text-lg text-white hidden md:block">{selectedCourse.title}</h1>
          </div>
          <div className="text-sm text-slate-400">
            {selectedCourse.lessons.length} Aulas
          </div>
        </header>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Main Content (Video) */}
          <main className="flex-1 bg-black flex flex-col overflow-y-auto">
             <div className="aspect-video w-full bg-black flex items-center justify-center relative group">
                {videoSource.src ? (
                   videoSource.type === 'youtube' ? (
                     <iframe 
                       src={videoSource.src} 
                       title="YouTube video player"
                       className="w-full h-full" 
                       frameBorder="0" 
                       allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                       allowFullScreen 
                     />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center bg-black">
                        <video 
                           controls 
                           className="w-full h-full object-contain"
                           // IMPORTANT: The key ensures the video element re-renders when the lesson changes
                           key={videoSource.src} 
                        >
                           <source src={videoSource.src} type="video/mp4" />
                           Seu navegador não suporta a tag video.
                        </video>
                     </div>
                   )
                ) : (
                  <div className="text-center p-10">
                    <MonitorPlay className="w-20 h-20 text-slate-800 mx-auto mb-4" />
                    <p className="text-slate-600">Selecione uma aula para começar</p>
                  </div>
                )}
             </div>
             
             <div className="p-8 max-w-4xl mx-auto w-full">
                {/* Changed mb-2 to mb-8 to provide spacing since description is removed */}
                <h2 className="text-2xl font-bold text-white mb-8">{currentLesson?.title || 'Bem-vindo ao Curso'}</h2>
                
                {/* Exercises Section for Current Lesson */}
                {currentLesson && selectedCourse.exercises.some(e => e.lessonId === currentLesson.id) && (
                  <div className="bg-surface border border-slate-700 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <CheckCircle className="text-emerald-500 w-5 h-5" />
                      Exercícios de Fixação
                    </h3>
                    <div className="space-y-6">
                      {selectedCourse.exercises.filter(e => e.lessonId === currentLesson.id).map((ex, idx) => (
                        <div key={ex.id} className="bg-slate-900/50 p-4 rounded-lg">
                           <p className="font-medium text-slate-200 mb-3"><span className="text-primary mr-2">#{idx+1}</span>{ex.statement}</p>
                           <div className="space-y-2 ml-2">
                              {['A','B','C','D'].map((opt) => {
                                 // @ts-ignore dynamic access
                                 const text = ex[`option${opt}` as keyof Exercise];
                                 if (!text) return null;

                                 const isSelected = userAnswers[ex.id] === opt;
                                 const isResultVisible = showResults[ex.id];
                                 const isCorrect = ex.correctOption === opt;
                                 
                                 // Dynamic classes for feedback
                                 let containerClass = "border border-slate-700 bg-slate-800/50 hover:bg-slate-800";
                                 let circleClass = "border-slate-500 text-slate-400";

                                 if (isResultVisible) {
                                     if (isCorrect) {
                                         containerClass = "border border-emerald-500/50 bg-emerald-900/20 cursor-default";
                                         circleClass = "border-emerald-500 bg-emerald-500 text-white";
                                     } else if (isSelected) {
                                         containerClass = "border border-red-500/50 bg-red-900/20 cursor-default";
                                         circleClass = "border-red-500 bg-red-500 text-white";
                                     } else {
                                         containerClass = "border border-slate-800 bg-slate-900/50 opacity-50 cursor-default";
                                     }
                                 } else {
                                     if (isSelected) {
                                         containerClass = "border border-primary bg-indigo-900/30 ring-1 ring-primary";
                                         circleClass = "border-primary bg-primary text-white";
                                     }
                                 }

                                 return (
                                   <div 
                                     key={opt} 
                                     onClick={() => handleOptionSelect(ex.id, opt)}
                                     className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${containerClass}`}
                                   >
                                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${circleClass}`}>
                                        {isResultVisible && isCorrect ? <CheckCircle className="w-4 h-4" /> : (
                                            isResultVisible && isSelected && !isCorrect ? <XCircle className="w-4 h-4" /> : opt
                                        )}
                                      </div>
                                      <span className={`text-sm ${isResultVisible && isCorrect ? 'text-emerald-200' : (isResultVisible && isSelected ? 'text-red-200' : 'text-slate-300')}`}>
                                        {text}
                                      </span>
                                   </div>
                                 )
                              })}
                           </div>
                           
                           {/* Action Bar for Exercise */}
                           <div className="mt-4 flex items-center justify-between border-t border-slate-700/50 pt-4">
                             <Button 
                               size="sm" 
                               variant={showResults[ex.id] ? "ghost" : "secondary"}
                               onClick={() => handleCheckAnswer(ex.id)}
                               disabled={showResults[ex.id]}
                               className={showResults[ex.id] ? "opacity-75 cursor-default hover:bg-transparent" : "bg-primary hover:bg-primaryHover border-transparent text-white"}
                             >
                               {showResults[ex.id] ? (userAnswers[ex.id] === ex.correctOption ? 'Resposta Correta' : 'Resposta Incorreta') : 'Ver Resposta'}
                             </Button>
                             
                             {showResults[ex.id] && (
                                <span className={`text-sm font-medium animate-in fade-in slide-in-from-left-2 ${userAnswers[ex.id] === ex.correctOption ? 'text-emerald-400' : 'text-red-400'}`}>
                                   {userAnswers[ex.id] === ex.correctOption ? 'Parabéns!' : `A alternativa correta é a ${ex.correctOption}.`}
                                </span>
                             )}
                           </div>

                        </div>
                      ))}
                    </div>
                  </div>
                )}
             </div>
          </main>

          {/* Sidebar Playlist */}
          <aside className="w-full md:w-80 bg-surface border-l border-slate-800 overflow-y-auto shrink-0">
             <div className="p-4 border-b border-slate-700 font-bold text-slate-300">
                Conteúdo do Curso
             </div>
             <div className="divide-y divide-slate-800">
               {selectedCourse.lessons.map((lesson, idx) => (
                 <button 
                    key={lesson.id}
                    onClick={() => setCurrentLesson(lesson)}
                    className={`w-full text-left p-4 flex gap-3 hover:bg-slate-700/50 transition-colors ${currentLesson?.id === lesson.id ? 'bg-indigo-900/20 border-l-2 border-primary' : 'border-l-2 border-transparent'}`}
                 >
                    <div className="mt-1">
                      {currentLesson?.id === lesson.id ? (
                        <PlayCircle className="w-5 h-5 text-primary" />
                      ) : (
                        <span className="w-5 h-5 rounded-full border border-slate-600 flex items-center justify-center text-xs text-slate-500 font-mono">
                          {idx + 1}
                        </span>
                      )}
                    </div>
                    <div>
                       <h4 className={`text-sm font-medium ${currentLesson?.id === lesson.id ? 'text-white' : 'text-slate-400'}`}>
                         {lesson.title}
                       </h4>
                       {/* Removed Videoaula span text here */}
                    </div>
                 </button>
               ))}
             </div>
          </aside>
        </div>
      </div>
    );
  };

  return (
    <>
      {view === 'home' && renderHome()}
      {view === 'login' && renderLogin()}
      {view === 'admin-dashboard' && renderAdminDashboard()}
      {view === 'course-player' && renderCoursePlayer()}
    </>
  );
}

export default App;