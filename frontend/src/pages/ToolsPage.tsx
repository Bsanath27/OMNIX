import React from 'react';
import { useRouter } from '../router';
import { useProjects } from '../context/ProjectContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  Presentation,
  Video,
  FileQuestion,
  Network,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const ToolsPage: React.FC = () => {
  const { navigate } = useRouter();
  const { selectedProject } = useProjects();

  const tools = [
    {
      id: 'slides',
      name: 'Classroom Slide Deck',
      icon: Presentation,
      description: 'Generates clean, academic PowerPoint presentations with teacher speaker notes and every slide point linked directly to textbook passages.',
      benefit: '6 slides with speaker notes, grounded citations, and clean layout ready for projector display.',
      badge: 'Active',
    },
    {
      id: 'video',
      name: 'STEM Explainer Video',
      icon: Video,
      description: 'Creates animated STEM visual sequences illustrating formulas, step-by-step physical principles, and mathematical derivations with clear narration.',
      benefit: 'Animated maths and science illustrations with voiceover.',
      badge: 'Active',
    },
    {
      id: 'quizzes',
      name: 'Interactive Quiz & Flashcards',
      icon: FileQuestion,
      description: 'Generates formative multiple-choice questions, true/false checks, and review flashcards designed for active classroom engagement.',
      benefit: 'Works offline in class, no internet needed for students.',
      badge: 'Active',
    },
    {
      id: 'diagrams',
      name: 'Concept Mind Map & Flowchart',
      icon: Network,
      description: 'Transforms chapter hierarchy into structured conceptual diagrams and flowcharts showing key relationships between terms.',
      benefit: 'Visual flowchart showing relationships between key terms.',
      badge: 'Active',
    },
  ];

  const handleLaunchTool = (_toolId: string) => {
    if (selectedProject) {
      navigate(`/c/${selectedProject.project_id}`);
    } else {
      navigate('/chapters');
    }
  };

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark text-content-light dark:text-content-dark p-6 sm:p-10 transition-colors">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand/10 text-brand">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Curriculum Tools
            </h1>
          </div>
          <p className="text-body-sm text-content-light-muted dark:text-content-dark-muted mt-1">
            Choose a specialized tool to produce grounded classroom learning materials for your current chapter.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <Card
                key={t.id}
                className="p-6 flex flex-col justify-between hover:border-brand/60 transition-all group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="p-3 rounded-xl bg-brand/10 text-brand">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {t.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-content-light dark:text-content-dark group-hover:text-brand transition-colors">
                      {t.name}
                    </h3>
                    <p className="text-body-sm text-content-light-muted dark:text-content-dark-muted mt-1.5 leading-relaxed">
                      {t.description}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-light-subtle dark:bg-surface-dark-subtle border border-border-light dark:border-border-dark text-xs text-content-light-subtle dark:text-content-dark-subtle">
                    <strong className="text-content-light dark:text-content-dark">Benefit: </strong>
                    {t.benefit}
                  </div>
                </div>

                <div className="pt-6 mt-4 border-t border-border-light dark:border-border-dark flex items-center justify-between">
                  <span className="text-xs text-content-light-subtle dark:text-content-dark-subtle">
                    {selectedProject ? `Active: ${selectedProject.name}` : 'No chapter selected'}
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleLaunchTool(t.id)}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Open in Workspace
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
