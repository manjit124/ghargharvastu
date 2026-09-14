import React, { useState } from 'react';
import {
  Search,
  BookOpen,
  ArrowRight,
  Camera,
  Compass,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';
import { VASTU_CATEGORIES, POPULAR_QUESTIONS, DIRECTION_NAMES } from '../data/vastuKnowledge';
import { VastuCategory, PopularQuestion } from '../types';

interface ExploreSearchViewProps {
  onSelectQuestion: (question: string) => void;
  onSelectCategoryForPhoto: (categoryName: string) => void;
}

export const ExploreSearchView: React.FC<ExploreSearchViewProps> = ({
  onSelectQuestion,
  onSelectCategoryForPhoto,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<VastuCategory | null>(null);
  const [selectedQuestionModal, setSelectedQuestionModal] = useState<PopularQuestion | null>(null);

  // Filter categories and questions
  const filteredCategories = VASTU_CATEGORIES.filter(
    (cat) =>
      cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.hindiName.includes(searchQuery) ||
      cat.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredQuestions = POPULAR_QUESTIONS.filter(
    (q) =>
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.shortAnswer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header & Search Bar */}
      <div className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
          <BookOpen className="w-3.5 h-3.5 text-amber-600" />
          Vastu Knowledge & Search Directory
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-stone-900">
          Vastu Search Engine
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 max-w-lg mx-auto">
          Type any room, object, or question to get quick traditional guidance, ask AI, or upload a photo to inspect.
        </p>

        {/* Big Search Input */}
        <div className="relative max-w-xl mx-auto mt-4">
          <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Search "mirror", "clock", "kitchen", "bedroom colour", "bed direction"...'
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border border-stone-200 shadow-sm text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 hover:text-stone-700"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Instant Search Results if user is typing */}
      {searchQuery.trim() && (
        <div className="bg-amber-50/50 border border-amber-200/80 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-amber-900">
            <span>Search Results for "{searchQuery}"</span>
            <span>{filteredQuestions.length + filteredCategories.length} matches</span>
          </div>

          {filteredQuestions.length === 0 && filteredCategories.length === 0 && (
            <div className="text-center py-6 text-xs text-stone-500">
              No direct rule match found. You can ask AI directly:
              <button
                type="button"
                onClick={() => onSelectQuestion(searchQuery)}
                className="block mx-auto mt-2 px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs"
              >
                Ask AI about "{searchQuery}"
              </button>
            </div>
          )}

          {/* Quick Questions Matches */}
          {filteredQuestions.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500">
                Direct Answers:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="p-4 bg-white rounded-2xl border border-amber-200 shadow-xs space-y-2"
                  >
                    <div className="text-xs font-bold text-stone-900">{q.question}</div>
                    <div className="text-xs text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg">
                      {q.shortAnswer}
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => setSelectedQuestionModal(q)}
                        className="text-[11px] text-amber-700 font-semibold hover:underline"
                      >
                        Read Full Guide
                      </button>
                      <button
                        onClick={() => onSelectQuestion(q.question)}
                        className="text-[11px] bg-stone-900 text-white px-2.5 py-1 rounded-lg font-medium hover:bg-stone-800 flex items-center gap-1"
                      >
                        Ask AI <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 20 Categories Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-lg text-stone-900">
            Browse by Room & Object Category
          </h2>
          <span className="text-xs text-stone-500">{VASTU_CATEGORIES.length} Categories</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => setSelectedCategory(cat)}
              className="p-4 rounded-2xl bg-white border border-stone-200/80 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform w-fit">
                  {cat.icon}
                </div>
                <h3 className="font-heading font-bold text-sm text-stone-900 group-hover:text-amber-700 transition-colors">
                  {cat.name}
                </h3>
                <span className="text-[11px] text-stone-500 font-medium block">
                  {cat.hindiName}
                </span>
                <p className="text-[11px] text-stone-600 mt-1 line-clamp-2 leading-relaxed">
                  {cat.keyRule}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-amber-700 font-bold">
                <span>View Rules</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Popular Frequently Asked Vastu Questions */}
      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg text-stone-900 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-600" />
          Popular Questions Asked by Homeowners
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {POPULAR_QUESTIONS.map((pq) => (
            <div
              key={pq.id}
              className="p-4 rounded-2xl bg-white border border-stone-200/80 hover:border-stone-300 shadow-xs space-y-2 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] text-amber-700 font-bold mb-1">
                  <span>{pq.category}</span>
                  {pq.idealDirection && (
                    <span className="bg-amber-100 px-2 py-0.5 rounded-full text-[10px]">
                      Best: {DIRECTION_NAMES[pq.idealDirection]?.name || pq.idealDirection}
                    </span>
                  )}
                </div>
                <h4 className="font-semibold text-xs sm:text-sm text-stone-900 leading-snug">
                  {pq.question}
                </h4>
                <p className="text-xs text-stone-600 mt-1.5 leading-relaxed line-clamp-2">
                  {pq.shortAnswer}
                </p>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedQuestionModal(pq)}
                  className="text-xs text-amber-700 font-semibold hover:underline"
                >
                  View Details
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectCategoryForPhoto(pq.category)}
                    className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-600 text-xs flex items-center gap-1"
                    title="Upload photo to check"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectQuestion(pq.question)}
                    className="px-3 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    Ask AI <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Detail Modal */}
      {selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-amber-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedCategory.icon}</span>
                <div>
                  <h3 className="font-heading font-bold text-lg text-stone-900">
                    {selectedCategory.name} Vastu Guide
                  </h3>
                  <span className="text-xs text-stone-500">{selectedCategory.hindiName}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCategory(null)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 hover:text-stone-900 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-stone-700 leading-relaxed">
              <p>{selectedCategory.description}</p>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <strong className="text-amber-900 block mb-1">Traditional Golden Rule:</strong>
                <p className="text-amber-950 font-medium">{selectedCategory.keyRule}</p>
              </div>

              <div>
                <strong className="text-stone-900 block mb-1">Ideal Directions:</strong>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCategory.idealDirections.map((d) => (
                    <span
                      key={d}
                      className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-semibold"
                    >
                      {DIRECTION_NAMES[d]?.name || d} ({d})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const cat = selectedCategory.name;
                  setSelectedCategory(null);
                  onSelectCategoryForPhoto(cat);
                }}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 hover:border-amber-500 text-stone-800 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Camera className="w-4 h-4 text-amber-600" />
                Upload Photo
              </button>
              <button
                type="button"
                onClick={() => {
                  const query = `${selectedCategory.name} ke Vastu placement ke baare mein guidance dein.`;
                  setSelectedCategory(null);
                  onSelectQuestion(query);
                }}
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
              >
                <MessageSquare className="w-4 h-4" />
                Ask AI Advisor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Detail Modal */}
      {selectedQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-amber-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-heading font-bold text-base text-stone-900">
                {selectedQuestionModal.question}
              </h3>
              <button
                onClick={() => setSelectedQuestionModal(null)}
                className="w-8 h-8 rounded-full bg-stone-100 text-stone-500 hover:text-stone-900 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-stone-800 leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 font-medium">
                <strong>Direct Answer:</strong> {selectedQuestionModal.shortAnswer}
              </div>

              <div>
                <strong className="block text-stone-900 mb-1">In-Depth Traditional Guidance:</strong>
                <p className="text-stone-600 leading-relaxed">
                  {selectedQuestionModal.detailedGuidance}
                </p>
              </div>

              {selectedQuestionModal.idealDirection && (
                <div className="flex items-center gap-2 text-stone-700">
                  <Compass className="w-4 h-4 text-amber-600" />
                  <span>
                    Favorable Direction:{' '}
                    <strong>
                      {DIRECTION_NAMES[selectedQuestionModal.idealDirection]?.name || selectedQuestionModal.idealDirection} (
                      {selectedQuestionModal.idealDirection})
                    </strong>
                  </span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const q = selectedQuestionModal.question;
                  setSelectedQuestionModal(null);
                  onSelectQuestion(q);
                }}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                Ask Personalized Follow-up
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
