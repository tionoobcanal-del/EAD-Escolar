import { Course, Lesson, Exercise, SiteConfig } from '../types';

const STORAGE_KEY = 'evp_platform_data';
const CONFIG_KEY = 'evp_site_config';

// Initial seed data if empty
const SEED_DATA: Course[] = [
  {
    id: 'c1',
    title: 'Excel 2021 – Formação Básica',
    description: 'Aprenda a usar o Excel de forma prática: criação de planilhas, fórmulas simples, gráficos e organização de dados para o dia a dia.',
    coverImage: 'https://picsum.photos/seed/excel/400/300',
    pdfUrl: null,
    lessons: [
      { 
        id: 'l1', 
        module: 'Módulo 1 - Introdução',
        title: 'Para que usar o Excel?', 
        description: '',
        videoUrl: '', 
        status: 'pending' 
      },
      { 
        id: 'l2', 
        module: 'Módulo 1 - Introdução',
        title: '02 - Utilizar o menu Barra de Ferramentas', 
        description: '',
        videoUrl: '', 
        status: 'pending' 
      },
    ],
    exercises: []
  }
];

const DEFAULT_CONFIG: SiteConfig = {
  heroImage: 'https://cdn-icons-png.flaticon.com/512/3069/3069172.png',
  defaultCourseImage: null
};

export const getCourses = (): Course[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
    return SEED_DATA;
  }
  return JSON.parse(data);
};

export const saveCourse = (updatedCourse: Course): void => {
  const courses = getCourses();
  const index = courses.findIndex(c => c.id === updatedCourse.id);
  
  if (index >= 0) {
    courses[index] = updatedCourse;
  } else {
    courses.push(updatedCourse);
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
};

export const deleteCourse = (courseId: string): void => {
  const courses = getCourses();
  const filtered = courses.filter(c => c.id !== courseId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const getSiteConfig = (): SiteConfig => {
  const data = localStorage.getItem(CONFIG_KEY);
  if (!data) {
    return DEFAULT_CONFIG;
  }
  return JSON.parse(data);
};

export const saveSiteConfig = (config: SiteConfig): void => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
};

// Helper to convert file to Base64 for local storage images
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};