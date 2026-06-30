import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  RotateCcw, 
  BookOpen, 
  Check, 
  ChevronRight, 
  Layers, 
  Sparkles, 
  HelpCircle,
  Eye,
  CheckCircle2
} from "lucide-react";
import { Flashcard, FlashcardDeck } from "../types";
import { addDocument, deleteDocument, saveDocument } from "../lib/firebase";

interface FlashcardProProps {
  decks: FlashcardDeck[];
  cards: Flashcard[];
  onDecksChange: (decks: FlashcardDeck[]) => void;
  onCardsChange: (cards: Flashcard[]) => void;
}

export default function FlashcardPro({ decks, cards, onDecksChange, onCardsChange }: FlashcardProProps) {
  // Deck selection / creation states
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckDesc, setNewDeckDesc] = useState("");
  
  // Card creation states
  const [cardFront, setCardFront] = useState("");
  const [cardBack, setCardBack] = useState("");

  // Study / Review states
  const [isStudying, setIsStudying] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Filter study cards belonging to the active deck
  const activeDeckCards = cards.filter(c => c.deckId === selectedDeckId);
  const selectedDeck = decks.find(d => d.id === selectedDeckId);

  // Handle deck creation
  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckName.trim()) return;

    const newDeck: Omit<FlashcardDeck, 'id'> = {
      name: newDeckName,
      description: newDeckDesc,
      createdAt: new Date().toISOString()
    };

    const docId = await addDocument("flashcard_decks", newDeck);
    onDecksChange([...decks, { ...newDeck, id: docId }]);
    setSelectedDeckId(docId);

    setNewDeckName("");
    setNewDeckDesc("");
  };

  // Handle card creation
  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeckId || !cardFront.trim() || !cardBack.trim()) return;

    const newCard: Omit<Flashcard, 'id'> = {
      deckId: selectedDeckId,
      front: cardFront,
      back: cardBack,
      level: 'new',
      nextReview: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const docId = await addDocument("flashcards", newCard);
    onCardsChange([...cards, { ...newCard, id: docId }]);

    setCardFront("");
    setCardBack("");
  };

  const handleDeleteDeck = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteDocument("flashcard_decks", id);
    onDecksChange(decks.filter(d => d.id !== id));
    
    // Also clear associated cards
    const deckCards = cards.filter(c => c.deckId === id);
    for (const card of deckCards) {
      await deleteDocument("flashcards", card.id);
    }
    onCardsChange(cards.filter(c => c.deckId !== id));

    if (selectedDeckId === id) {
      setSelectedDeckId(null);
      setIsStudying(false);
    }
  };

  const handleDeleteCard = async (id: string) => {
    await deleteDocument("flashcards", id);
    onCardsChange(cards.filter(c => c.id !== id));
    
    // Adjust review limits
    if (currentCardIndex >= activeDeckCards.length - 1) {
      setCurrentCardIndex(Math.max(0, activeDeckCards.length - 2));
    }
  };

  // Spaced Repetition Rating Action
  const handleRateCard = async (level: 'easy' | 'medium' | 'hard') => {
    const card = activeDeckCards[currentCardIndex];
    if (!card) return;

    let gapDays = 1;
    if (level === 'easy') gapDays = 5;
    else if (level === 'medium') gapDays = 2;

    const nextReviewDate = new Date(Date.now() + 86400000 * gapDays).toISOString();

    const updated = cards.map(c => {
      if (c.id === card.id) {
        return { ...c, level, nextReview: nextReviewDate };
      }
      return c;
    });

    onCardsChange(updated);
    await saveDocument("flashcards", card.id, { level, nextReview: nextReviewDate });

    // Move to next card
    setIsFlipped(false);
    setTimeout(() => {
      if (currentCardIndex < activeDeckCards.length - 1) {
        setCurrentCardIndex(prev => prev + 1);
      } else {
        setIsStudying(false);
        alert("🎉 Review Complete! Beautiful learning loop locked.");
      }
    }, 200);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* LEFT COLUMN: Deck Selector & Creator (4 span) */}
      <div className="lg:col-span-4 space-y-6">
        
        {/* Decks Collection */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-md font-semibold text-slate-800 mb-4 flex items-center gap-1.5">
            <BookOpen className="text-indigo-600" size={18} />
            My Learning Decks
          </h2>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {decks.map(deck => {
              const deckCardsCount = cards.filter(c => c.deckId === deck.id).length;
              return (
                <div
                  key={deck.id}
                  onClick={() => {
                    setSelectedDeckId(deck.id);
                    setIsStudying(false);
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedDeckId === deck.id
                      ? "bg-indigo-50/50 border-indigo-200 text-indigo-900 shadow-xs"
                      : "bg-slate-50/50 border-slate-100 hover:border-slate-200 text-slate-700"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <h3 className="font-semibold text-xs leading-tight truncate">{deck.name}</h3>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{deck.description || "No description"}</p>
                    <span className="inline-block mt-2 text-[10px] font-bold text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded-full">
                      {deckCardsCount} cards
                    </span>
                  </div>
                  
                  <button
                    onClick={(e) => handleDeleteDeck(deck.id, e)}
                    className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
            {decks.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-6">No learning decks created yet.</p>
            )}
          </div>
        </div>

        {/* Deck Creator Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 block">
            Create Custom Deck
          </h3>
          <form onSubmit={handleCreateDeck} className="space-y-3">
            <input
              type="text"
              placeholder="e.g. AWS Certification Exam"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              type="text"
              placeholder="Brief description..."
              value={newDeckDesc}
              onChange={(e) => setNewDeckDesc(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-slate-800 hover:bg-slate-950 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <Plus size={13} />
              Build Deck
            </button>
          </form>
        </div>

      </div>

      {/* RIGHT COLUMN: Interactive Study / Deck Manager (8 span) */}
      <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        
        {selectedDeckId ? (
          <div>
            {/* Header info */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                  {selectedDeck.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{selectedDeck.description}</p>
              </div>

              {activeDeckCards.length > 0 && !isStudying && (
                <button
                  onClick={() => {
                    setIsStudying(true);
                    setCurrentCardIndex(0);
                    setIsFlipped(false);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
                >
                  <BookOpen size={14} />
                  Study Deck
                </button>
              )}
            </div>

            {/* Study Arena Modal-style Panel */}
            {isStudying && activeDeckCards[currentCardIndex] ? (
              <div className="py-6 flex flex-col items-center">
                <div className="flex justify-between items-center w-full max-w-md mb-4 text-xs text-slate-400 font-medium">
                  <span>Card {currentCardIndex + 1} of {activeDeckCards.length}</span>
                  <button
                    onClick={() => setIsStudying(false)}
                    className="text-indigo-600 hover:underline font-bold"
                  >
                    Exit Session
                  </button>
                </div>

                {/* Perspective Card Container */}
                <div 
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="w-full max-w-md h-52 cursor-pointer perspective mb-6 relative select-none"
                >
                  {/* Flip Inner Card Container */}
                  <div className={`relative w-full h-full duration-500 transform-style-3d ${
                    isFlipped ? "rotate-y-180" : ""
                  }`}>
                    {/* FRONT Side */}
                    <div className="absolute inset-0 w-full h-full bg-slate-50 border border-slate-100 rounded-2xl shadow-2xs p-6 flex flex-col justify-between backface-hidden items-center text-center">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold bg-slate-200/50 px-2 py-0.5 rounded-full">
                        Question Side
                      </span>
                      <p className="text-sm font-semibold text-slate-800 max-w-xs mt-2 leading-relaxed">
                        {activeDeckCards[currentCardIndex].front}
                      </p>
                      <div className="text-[10px] text-indigo-500 font-semibold flex items-center gap-1">
                        <Eye size={12} />
                        Click to flip and inspect answer
                      </div>
                    </div>

                    {/* BACK Side */}
                    <div className="absolute inset-0 w-full h-full bg-radial from-indigo-900 to-indigo-950 text-white border border-indigo-900 rounded-2xl shadow-md p-6 flex flex-col justify-between rotate-y-180 backface-hidden items-center text-center">
                      <span className="text-[9px] uppercase tracking-wider text-indigo-300 font-bold bg-indigo-950/60 px-2 py-0.5 rounded-full">
                        Answer Side
                      </span>
                      <p className="text-sm font-semibold text-indigo-100 max-w-xs mt-2 leading-relaxed">
                        {activeDeckCards[currentCardIndex].back}
                      </p>
                      <span className="text-[10px] text-indigo-400 font-medium">
                        Rate understanding to schedule spaced repetition
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rating Buttons */}
                {isFlipped ? (
                  <div className="w-full max-w-md space-y-3">
                    <p className="text-center text-xs text-slate-400 font-medium mb-1">
                      How was your recall?
                    </p>
                    <div className="flex gap-2.5 w-full">
                      <button
                        onClick={() => handleRateCard('hard')}
                        className="flex-1 py-2 px-3 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl transition-all"
                      >
                        🔴 Hard (Review today)
                      </button>
                      <button
                        onClick={() => handleRateCard('medium')}
                        className="flex-1 py-2 px-3 bg-amber-50 border border-amber-100 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-xl transition-all"
                      >
                        🟡 Medium (Review in 2d)
                      </button>
                      <button
                        onClick={() => handleRateCard('easy')}
                        className="flex-1 py-2 px-3 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl transition-all"
                      >
                        🟢 Easy (Review in 5d)
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsFlipped(true)}
                    className="w-full max-w-md py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors text-center"
                  >
                    Flip Flashcard
                  </button>
                )}

              </div>
            ) : (
              <div>
                {/* Deck Card Manager & Card Adding Forms */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Current Deck Cards List */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Deck Cards ({activeDeckCards.length})
                    </h3>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                      {activeDeckCards.map((card, index) => (
                        <div key={card.id} className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="text-xs font-semibold text-slate-800 truncate">Q: {card.front}</h4>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">A: {card.back}</p>
                            
                            <div className="flex gap-2 mt-1.5">
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                                card.level === 'hard' 
                                  ? 'bg-rose-100 text-rose-800' 
                                  : card.level === 'medium' 
                                  ? 'bg-amber-100 text-amber-800'
                                  : card.level === 'easy'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {card.level}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteCard(card.id)}
                            className="p-1 hover:bg-white text-slate-300 hover:text-rose-500 rounded transition-colors shrink-0"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                      {activeDeckCards.length === 0 && (
                        <p className="text-center text-xs text-slate-400 py-6">Your deck has no cards. Use the form to the right to construct cards!</p>
                      )}
                    </div>
                  </div>

                  {/* Add New Card Form */}
                  <div className="bg-slate-50/50 border border-slate-100/60 rounded-xl p-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1">
                      <Plus size={14} />
                      Add Flashcard to Deck
                    </h3>
                    <form onSubmit={handleAddCard} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Question / Prompt (Front)</label>
                        <textarea
                          placeholder="e.g. What is the Big O of Binary Search?"
                          rows={2}
                          value={cardFront}
                          onChange={(e) => setCardFront(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase">Answer / Definition (Back)</label>
                        <textarea
                          placeholder="e.g. O(log n) because it cuts the partition size in half each step."
                          rows={2}
                          value={cardBack}
                          onChange={(e) => setCardBack(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Plus size={13} />
                        Add Card
                      </button>
                    </form>
                  </div>

                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16">
            <Layers className="mx-auto text-slate-300 mb-2" size={36} />
            <h3 className="text-sm font-semibold text-slate-700">Select or Build a Deck</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
              Activate or construct a flashcard deck on the left panel to begin your customized learning sessions.
            </p>
          </div>
        )}

      </div>

    </div>
  );
}
