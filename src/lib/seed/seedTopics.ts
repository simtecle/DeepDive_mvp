/****
 * Seed library for initial topic coverage.
 *
 * Notes:
 * - Keep topics broad and commonly searched.
 * - Duplicates are OK if the enqueue endpoint upserts/dedupes via query_norm.
 * - Keep entries as display/user-facing strings (Title Case where possible).
 */

export const SEED_TOPICS: string[] = [
  // Programming + CS
  'Python',
  'JavaScript',
  'TypeScript',
  'C Programming',
  'C++',
  'C#',
  'Go Programming',
  'Rust Programming',
  'SQL',
  'Databases',
  'PostgreSQL',
  'MySQL',
  'MongoDB',
  'Data Structures & Algorithms',
  'System Design',
  'Operating Systems',
  'Computer Networks',
  'Cybersecurity',
  'Linux',
  'Git',
  'Docker',
  'Kubernetes',
  'AWS',
  'Cloud Computing',
  'DevOps',
  'Software Engineering',
  'Object Oriented Programming',
  'Functional Programming',
  'Web Development',
  'React',
  'Next.js',
  'Node.js',
  'API Design',
  'GraphQL',

  // Data + AI
  'Machine Learning',
  'Deep Learning',
  'Statistics',
  'Probability',
  'Data Analysis',
  'Data Science',
  'Data Visualization',
  'Linear Regression',
  'Neural Networks',
  'Natural Language Processing',

  // Math
  'Calculus',
  'Linear Algebra',
  'Discrete Mathematics',
  'Number Theory',
  'Graph Theory',

  // Science
  'Physics',
  'Classical Mechanics',
  'Quantum Mechanics',
  'Astronomy',
  'Chemistry',
  'Biology',
  'Genetics',
  'Neuroscience',
  'Psychology',

  // Humanities / social science
  'Philosophy',
  'Ethics',
  'Economics',
  'Microeconomics',
  'Macroeconomics',
  'Game Theory',
  'History',
  'Ancient Rome',
  'Ancient Greece',
  'World War II',
  'World War I',
  'chinese mythology',

  // Practical / general
  'Product Management',
  'Project Management',
  'Finance',
  'Personal Finance',
  'Investing',
  'Public Speaking',
  'Learning How to Learn',
  'Critical Thinking',
  'Writing',
  'Cooking Basics',
];

export default SEED_TOPICS;
