/**
 * Centralized strings for OMNIX.
 * Written in clear, benefit-driven educator language.
 * No developer jargon (no "deterministic", "vector DB", "python-pptx", "F5", etc.).
 */

export const STRINGS = {
  app: {
    name: 'OMNIX',
    tagline: 'Classroom learning packages from your textbooks',
    programme: 'IIT Madras / Commonwealth of Learning',
  },
  sidebar: {
    newChapter: 'New chapter',
    searchChapters: 'Search chapters...',
    noChaptersFound: 'No chapters match your search.',
    recentChapters: 'Recent chapters',
    settings: 'Settings',
    theme: 'Theme',
    systemTheme: 'System',
    lightTheme: 'Light',
    darkTheme: 'Dark',
  },
  home: {
    heroTitle: 'Turn your textbook into classroom learning material',
    heroSubtitle: 'Attach a chapter to create lecture slide decks, animated explainer videos, and interactive practice exercises for your students.',
    promptPlaceholder: 'Describe what to make from your chapter...',
    attachButton: 'Attach chapter',
    attachHint: 'PDF or Word document',
    sendButton: 'Create material',
    toolsHeading: 'What would you like to create?',
    tools: {
      all: {
        label: 'Complete package',
        description: 'Slides, video, quiz, and summary diagram together',
      },
      slides: {
        label: 'Slide deck',
        description: 'Classroom presentation slides with speaker notes, linked to the textbook page',
      },
      video: {
        label: 'Explainer video',
        description: 'Animated maths and science illustrations with voiceover',
      },
      quizzes: {
        label: 'Quiz & flashcards',
        description: 'Interactive questions and study cards that run offline in class without internet',
      },
      diagrams: {
        label: 'Concept diagram',
        description: 'Clear visual charts and mind maps showing how ideas connect',
      },
    },
    templatesHeading: 'Teacher-ready templates',
    templatesSubheading: 'Click any template to load its prompt into the creator box above.',
    footerNotice: 'Designed for educators in the Training of Trainers programme.',
  },
  workspace: {
    sourceTab: 'Source text',
    sourceDescription: 'Original textbook passages extracted from your document. Every slide and quiz item links back to these passages.',
    slidesTab: 'Slide deck',
    videoTab: 'Explainer video',
    quizTab: 'Quiz & cards',
    diagramTab: 'Concept diagram',
    focusButton: 'Focus projection',
    exitFocus: 'Exit projection',
    download: 'Download file',
    openPlayer: 'Open in classroom player',
    citationJump: 'Jump to textbook passage',
    teacherNotes: 'Teacher speaker notes',
    approveButton: 'Approve this version',
    repromptButton: 'Request revision',
    howItWorks: 'How this material was generated',
  },
  settings: {
    title: 'Platform Settings',
    systemHealthHeading: 'System readiness for classroom creation',
    healthStatus: {
      ready: 'Ready',
      working: 'Processing',
      attention: 'Needs setup',
    },
    toolsConfigHeading: 'Available creation tools',
    themeHeading: 'Display theme',
  },
  emptyStates: {
    noChapters: {
      title: 'No chapters uploaded yet',
      description: 'Drop a textbook chapter (PDF or Word document) here to get started, or try one of our sample chapters.',
      sampleAction: 'Load a sample chapter',
      uploadAction: 'Upload chapter file',
    },
    noArtifact: {
      title: 'Not created yet',
      description: 'You can generate this material at any time by asking in the chat on the left.',
      createAction: 'Generate now',
    },
  },
  status: {
    ready: 'Ready',
    generating: 'Generating',
    review: 'Ready for review',
    approved: 'Approved',
    failed: 'Needs attention',
  },
} as const;
