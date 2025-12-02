export interface Exercise {
  id: string;
  lessonId: string;
  statement: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
}

export interface Lesson {
  id: string;
  module?: string;
  title: string;
  description?: string;
  videoUrl: string; // Could be a local file blob URL or external link
  status: 'published' | 'pending';
}

export interface Course {
  id: string;
  title: string;
  description: string;
  coverImage: string | null; // Base64 or URL
  pdfUrl: string | null;
  lessons: Lesson[];
  exercises: Exercise[];
}

export interface SiteConfig {
  heroImage: string | null;
  defaultCourseImage: string | null;
}

// Simple view router state
export type ViewState = 
  | 'home' 
  | 'login' 
  | 'admin-dashboard' 
  | 'course-player';