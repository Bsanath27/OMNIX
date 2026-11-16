import React, { useState } from 'react';
import { Artifact } from '../api';
import { Presentation, HelpCircle, Download, CheckCircle, ExternalLink, ChevronLeft, ChevronRight, FileCode } from 'lucide-react';

interface ArtifactCardProps {
  artifact: Artifact;
}

export const ArtifactCard: React.FC<ArtifactCardProps> = ({ artifact }) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'grounding' | 'raw'>('preview');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const isSlide = artifact.tool_name === 'slides';
  const isQuiz = artifact.tool_name === 'quizzes';

  const slidesData = isSlide && artifact.source_data?.slides ? artifact.source_data.slides : [];
  const quizItems = isQuiz && artifact.source_data?.items ? artifact.source_data.items : [];

  const pptxFile = artifact.files.find((f) => f.endsWith('.pptx'));
  const htmlPlayerFile = artifact.files.find((f) => f.endsWith('.html'));

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden mb-6 transition-all">
      {/* Card Header */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-100 text-[#FF5C00]">
            {isSlide ? <Presentation className="w-5 h-5" /> : isQuiz ? <HelpCircle className="w-5 h-5" /> : <FileCode className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-800 text-sm">
                {isSlide ? 'PowerPoint Slide Deck' : isQuiz ? 'Interactive Quiz & Flashcards' : artifact.tool_name.toUpperCase()}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 flex items-center gap-1 font-mono">
                <CheckCircle className="w-3 h-3 text-emerald-600" /> Grounded
              </span>
            </div>
            <p className="text-xs text-slate-400">ID: {artifact.id}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {pptxFile && (
            <a
              href={`/api/projects/${artifact.project_id}/download/${encodeURIComponent(pptxFile)}`}
              download
              className="bg-[#FF5C00] hover:bg-[#e05200] text-white text-xs px-3.5 py-1.5 rounded-full font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              Download .pptx
            </a>
          )}
          {htmlPlayerFile && (
            <button
              onClick={() => {
                const w = window.open('', '_blank');
                if (w && artifact.source_data) {
                  w.document.write(
                    `<html><head><title>Preview</title></head><body><p>Loading Quiz...</p><script>window.location.href='/api/projects/${artifact.project_id}/download/${encodeURIComponent(htmlPlayerFile)}';</script></body></html>`
                  );
                }
              }}
              className="bg-sky-600 hover:bg-sky-700 text-white text-xs px-3.5 py-1.5 rounded-full font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Launch Player
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 border-b border-slate-100 flex gap-4 text-xs font-medium text-slate-500">
        <button
          onClick={() => setActiveTab('preview')}
          className={`py-2.5 border-b-2 transition-colors ${
            activeTab === 'preview' ? 'border-[#FF5C00] text-[#FF5C00] font-semibold' : 'border-transparent hover:text-slate-700'
          }`}
        >
          Visual Preview
        </button>
        <button
          onClick={() => setActiveTab('grounding')}
          className={`py-2.5 border-b-2 transition-colors ${
            activeTab === 'grounding' ? 'border-[#FF5C00] text-[#FF5C00] font-semibold' : 'border-transparent hover:text-slate-700'
          }`}
        >
          Grounding Citations ({artifact.grounding_refs?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('raw')}
          className={`py-2.5 border-b-2 transition-colors ${
            activeTab === 'raw' ? 'border-[#FF5C00] text-[#FF5C00] font-semibold' : 'border-transparent hover:text-slate-700'
          }`}
        >
          Source JSON
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'preview' && (
          <div>
            {isSlide && slidesData.length > 0 && (
              <div>
                <div className="bg-slate-900 text-white rounded-xl p-6 min-h-[240px] flex flex-col justify-between shadow-inner">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs uppercase tracking-wider text-sky-400 font-semibold font-mono">
                        Slide {currentSlideIndex + 1} of {slidesData.length}
                      </span>
                      {slidesData[currentSlideIndex]?.grounding && (
                        <span className="bg-sky-900/60 border border-sky-400/40 text-sky-300 text-xs px-2 py-0.5 rounded font-mono">
                          [{slidesData[currentSlideIndex].grounding.passage_id}]
                        </span>
                      )}
                    </div>
                    <h4 className="text-xl font-bold text-white mb-1">
                      {slidesData[currentSlideIndex]?.title}
                    </h4>
                    {slidesData[currentSlideIndex]?.subtitle && (
                      <p className="text-xs text-slate-300 mb-4">{slidesData[currentSlideIndex].subtitle}</p>
                    )}
                    <ul className="space-y-2 mt-3">
                      {slidesData[currentSlideIndex]?.bullets?.map((b: string, i: number) => (
                        <li key={i} className="text-sm text-slate-200 flex items-start gap-2">
                          <span className="text-orange-400 mt-1">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {slidesData[currentSlideIndex]?.speaker_notes && (
                    <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded">
                      <strong className="text-slate-300">Teacher Notes: </strong>
                      {slidesData[currentSlideIndex].speaker_notes}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center mt-3 px-1">
                  <button
                    disabled={currentSlideIndex === 0}
                    onClick={() => setCurrentSlideIndex(currentSlideIndex - 1)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 text-xs"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <span className="text-xs text-slate-500 font-medium">
                    {currentSlideIndex + 1} / {slidesData.length}
                  </span>
                  <button
                    disabled={currentSlideIndex === slidesData.length - 1}
                    onClick={() => setCurrentSlideIndex(currentSlideIndex + 1)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 text-xs"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {isQuiz && quizItems.length > 0 && (
              <div className="space-y-3">
                {quizItems.map((item: any, idx: number) => (
                  <div key={idx} className="border border-slate-200 rounded-xl p-3.5 bg-slate-50">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                        {item.type.replace('_', ' ')}
                      </span>
                      {item.grounding && (
                        <span className="text-[10px] font-mono text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                          [{item.grounding.passage_id}]
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-800 mb-2">{item.prompt}</p>
                    {item.type === 'flashcard' ? (
                      <div className="text-xs text-slate-600 bg-white p-2 rounded border border-dashed border-orange-200">
                        <strong>Definition: </strong> {item.correct_answer}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {item.options?.map((opt: string, oIdx: number) => (
                          <div
                            key={oIdx}
                            className={`text-xs px-2.5 py-1.5 rounded border ${
                              opt === item.correct_answer
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-medium'
                                : 'bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            {opt === item.correct_answer ? '✓ ' : '• '} {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!isSlide && !isQuiz && (
              <pre className="text-xs font-mono bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto">
                {JSON.stringify(artifact.source_data, null, 2)}
              </pre>
            )}
          </div>
        )}

        {activeTab === 'grounding' && (
          <div className="space-y-2">
            {artifact.grounding_refs?.length === 0 ? (
              <p className="text-xs text-slate-400">No explicit passage citations recorded for this deliverable.</p>
            ) : (
              artifact.grounding_refs.map((ref, idx) => (
                <div key={idx} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-start gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-orange-100 text-[#FF5C00] shrink-0 font-bold">
                    {ref.passage_id}
                  </span>
                  <div className="text-xs text-slate-700">
                    <p className="italic font-serif text-slate-600">"{ref.quote}"</p>
                    <span className="inline-block mt-1 text-[10px] text-emerald-600 font-medium">✓ Overlap Verified</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'raw' && (
          <pre className="text-xs font-mono bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto max-h-64">
            {JSON.stringify(artifact, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};
