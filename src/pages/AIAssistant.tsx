import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Send, Bot, RefreshCw, X, BookOpen, HelpCircle,
  Sparkles, Zap, Copy, CheckCheck, ChevronDown,
  AlertCircle, Loader2, Wand2, MessageSquare
} from 'lucide-react';
import { db, Question, Subject, Unit } from '../db/database';
import { useApp } from '../contexts/AppContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface AIGenerateOptions {
  language: 'hindi_english' | 'english' | 'hindi' | 'hinglish';
  marks: 2 | 3 | 5 | 7 | 10;
  action: 'generate' | 'improve' | 'simplify' | 'expand' | 'shorten' | 'bullet' | 'diagram' | 'example' | 'accuracy' | 'seven_mark' | 'translate';
}

const LANGUAGE_OPTIONS = [
  { value: 'hindi_english', label: 'Hindi + English Terms' },
  { value: 'english', label: 'English' },
  { value: 'hindi', label: 'Simple Hindi' },
  { value: 'hinglish', label: 'Hinglish' },
];

const ACTION_BUTTONS = [
  { action: 'generate', label: 'Generate Answer', icon: Sparkles, primary: true },
  { action: 'improve', label: 'Improve', icon: Wand2 },
  { action: 'simplify', label: 'Make Simpler', icon: Zap },
  { action: 'expand', label: 'Add Details', icon: ChevronDown },
  { action: 'shorten', label: 'Shorten', icon: X },
  { action: 'seven_mark', label: '7-Mark Format', icon: BookOpen },
  { action: 'bullet', label: 'Bullet Points', icon: MessageSquare },
  { action: 'diagram', label: 'Add Diagram', icon: Zap },
  { action: 'example', label: 'Add Example', icon: Wand2 },
  { action: 'accuracy', label: 'Check Accuracy', icon: AlertCircle },
];

// Build AI prompt based on question + options
function buildPrompt(question: Question | null, text: string, opts: AIGenerateOptions, subject?: Subject, unit?: Unit, currentAnswer?: string): string {
  const subjectCtx = subject ? `Subject: ${subject.name} (${subject.code || ''})` : '';
  const unitCtx = unit ? `Unit: ${unit.title}` : '';
  const syllabusCtx = subject?.syllabus ? `Syllabus: ${subject.syllabus.slice(0, 300)}` : '';

  const langMap = {
    hindi_english: 'Hindi explanation with English technical terms. Technical words jaisi ke Automaton, Algorithm, Process etc. English mein likho, baaki explanation Hindi mein do.',
    english: 'Clear academic English.',
    hindi: 'Simple Hindi language. Technical terms bhi Hindi transliteration mein.',
    hinglish: 'Hinglish (mix of Hindi and English naturally).',
  };

  const marksMap = {
    2: 'Very brief, 2-3 sentences only.',
    3: '3-mark answer: 80-120 words, key points only.',
    5: '5-mark answer: 150-200 words with points and example.',
    7: '7-mark answer: 250-350 words, structured with introduction, explanation, diagram if relevant, and conclusion.',
    10: '10-mark detailed answer: 400-600 words, comprehensive coverage.',
  };

  const base = `You are an expert exam preparation assistant for RGPV University CSE students.
${subjectCtx}
${unitCtx}
${syllabusCtx}

Language style: ${langMap[opts.language]}
Answer length: ${marksMap[opts.marks]}

RGPV Exam answer format:
1. Brief introduction/definition
2. Main explanation with numbered points
3. Technical terms highlighted in **bold**
4. Examples where relevant
5. ASCII/text diagram if it helps understanding
6. Advantages/disadvantages if applicable
7. Conclusion or exam summary line

Important: Do NOT fabricate references, exam frequency, or textbook citations.`;

  if (opts.action === 'generate') {
    return `${base}\n\nQuestion: ${question?.text || text}\n\nMarks: ${opts.marks}\n\nGenerate a complete, exam-ready answer for this question.`;
  }
  if (opts.action === 'improve') {
    return `${base}\n\nOriginal Answer:\n${currentAnswer || text}\n\nImprove this answer. Make it more accurate, better structured, and more suitable for RGPV exam. Keep the same language style.`;
  }
  if (opts.action === 'simplify') {
    return `${base}\n\nAnswer:\n${currentAnswer || text}\n\nSimplify this answer. Use easier words and simpler explanations. Student should easily understand. Keep length same.`;
  }
  if (opts.action === 'expand') {
    return `${base}\n\nAnswer:\n${currentAnswer || text}\n\nExpand this answer. Add more details, examples, and explanations. Make it suitable for a ${opts.marks}-mark answer.`;
  }
  if (opts.action === 'shorten') {
    return `${base}\n\nAnswer:\n${currentAnswer || text}\n\nShorten this answer while keeping all key points. Remove unnecessary repetition.`;
  }
  if (opts.action === 'seven_mark') {
    return `${base}\n\nQuestion: ${question?.text || text}\n\nConvert this into a perfect 7-mark RGPV exam answer with proper structure.`;
  }
  if (opts.action === 'bullet') {
    return `Answer:\n${currentAnswer || text}\n\nConvert this answer into clear bullet points format. Keep technical accuracy.`;
  }
  if (opts.action === 'diagram') {
    return `${base}\n\nQuestion: ${question?.text || text}\n\nCreate an ASCII text diagram or flowchart that explains this concept clearly. Label all components and explain the diagram.`;
  }
  if (opts.action === 'example') {
    return `${base}\n\nAnswer:\n${currentAnswer || text}\n\nAdd 1-2 concrete, relatable examples to make this answer clearer. Keep them simple and relevant.`;
  }
  if (opts.action === 'accuracy') {
    return `You are a CS professor reviewing exam answers.\n\nAnswer to review:\n${currentAnswer || text}\n\nCheck this answer for:\n1. Technical accuracy\n2. Completeness\n3. Missing important points\n4. Any incorrect statements\n\nProvide a brief review with corrections if needed.`;
  }
  if (opts.action === 'translate') {
    return `Translate this answer to ${langMap[opts.language]}:\n\n${currentAnswer || text}`;
  }
  return `${base}\n\n${text}`;
}

// Call the backend AI API (or mock)
async function callAI(prompt: string, previousId?: string): Promise<{ text: string; interactionId?: string }> {
  try {
    const res = await fetch('/api/ai/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, previousInteractionId: previousId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Server error' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return { text: data.text, interactionId: data.interactionId };
  } catch (err: any) {
    throw new Error(err.message || 'Failed to connect to AI server');
  }
}

// Copy to clipboard hook
function useCopy() {
  const [copied, setCopied] = useState(false);
  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return { copied, copy };
}

export default function AIAssistantPage() {
  const [searchParams] = useSearchParams();
  const { activeSemesterId } = useApp();

  const [question, setQuestion] = useState<Question | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [lastInteractionId, setLastInteractionId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [aiOptions, setAiOptions] = useState<AIGenerateOptions>({
    language: 'hindi_english',
    marks: 7,
    action: 'generate',
  });
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [savedToQuestion, setSavedToQuestion] = useState(false);

  const { copied, copy } = useCopy();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load context from URL params
  useEffect(() => {
    async function loadContext() {
      const qId = searchParams.get('questionId');
      if (qId) {
        const q = await db.questions.get(Number(qId));
        if (q) {
          setQuestion(q);
          const sub = await db.subjects.get(q.subjectId);
          const un = await db.units.get(q.unitId);
          setSubject(sub || null);
          setUnit(un || null);
          setCurrentAnswer(q.finalAnswer || q.aiDraftAnswer || '');
        }
      }
      if (activeSemesterId) {
        const subs = await db.subjects.where('semesterId').equals(activeSemesterId).toArray();
        setSubjects(subs);
        const qs = await db.questions.where('semesterId').equals(activeSemesterId).toArray();
        setQuestions(qs);
      }
    }
    loadContext();
  }, [searchParams, activeSemesterId]);

  // Load units when subject changes
  useEffect(() => {
    if (subject?.id) {
      db.units.where('subjectId').equals(subject.id).toArray().then(setUnits);
    }
  }, [subject]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (promptText?: string, action?: AIGenerateOptions['action']) => {
    const text = promptText || input.trim();
    if (!text && !question) return;

    const opts = action ? { ...aiOptions, action } : aiOptions;
    const prompt = opts.action !== 'generate' && action
      ? buildPrompt(question, text, opts, subject || undefined, unit || undefined, currentAnswer)
      : text.length > 10
        ? buildPrompt(question, text, opts, subject || undefined, unit || undefined, currentAnswer)
        : text;

    const userMsg: Message = { role: 'user', content: text || `Generate ${opts.marks}-mark answer`, timestamp: new Date() };
    const loadingMsg: Message = { role: 'assistant', content: '', timestamp: new Date(), isLoading: true };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput('');
    setIsLoading(true);
    setError('');

    try {
      const result = await callAI(prompt, lastInteractionId);
      setLastInteractionId(result.interactionId);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: result.text,
          timestamp: new Date(),
        };
        return updated;
      });
      setCurrentAnswer(result.text);

      // Auto-save AI draft to question
      if (question?.id) {
        await db.questions.update(question.id, {
          aiDraftAnswer: result.text,
          updatedAt: new Date(),
        });
      }
    } catch (err: any) {
      setError(err.message);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `❌ Error: ${err.message}`,
          timestamp: new Date(),
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, question, subject, unit, aiOptions, currentAnswer, lastInteractionId]);

  const saveAnswerToQuestion = async () => {
    if (!question?.id || !currentAnswer) return;
    await db.questions.update(question.id, {
      finalAnswer: currentAnswer,
      aiDraftAnswer: currentAnswer,
      prepStatus: 'answer_saved',
      updatedAt: new Date(),
    });
    setSavedToQuestion(true);
    setTimeout(() => setSavedToQuestion(false), 3000);
  };

  const clearChat = () => {
    setMessages([]);
    setLastInteractionId(undefined);
    setError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full gap-0">
      {/* Left Panel: Context & Options */}
      <div className="lg:w-80 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-800 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/50 p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-blue-500" />
          <h2 className="font-semibold text-gray-800 dark:text-gray-200">AI Study Assistant</h2>
        </div>

        {/* Context Question */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Context Question</label>
          <select
            className="input text-sm"
            value={question?.id || ''}
            onChange={async (e) => {
              const id = Number(e.target.value);
              if (!id) { setQuestion(null); return; }
              const q = await db.questions.get(id);
              if (q) {
                setQuestion(q);
                setCurrentAnswer(q.finalAnswer || q.aiDraftAnswer || '');
                const sub = await db.subjects.get(q.subjectId);
                const un = await db.units.get(q.unitId);
                setSubject(sub || null);
                setUnit(un || null);
              }
            }}
          >
            <option value="">— No specific question —</option>
            {questions.map(q => (
              <option key={q.id} value={q.id}>{q.text.slice(0, 60)}...</option>
            ))}
          </select>

          {question && (
            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">{question.text}</p>
              <div className="flex gap-1 flex-wrap">
                <span className="badge bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">{subject?.name}</span>
                <span className="badge bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">{unit?.title}</span>
                <span className="badge bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">{question.marks}M</span>
              </div>
            </div>
          )}
        </div>

        {/* Language */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Answer Language</label>
          <select className="input text-sm" value={aiOptions.language} onChange={e => setAiOptions(o => ({ ...o, language: e.target.value as any }))}>
            {LANGUAGE_OPTIONS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>

        {/* Marks */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Answer Length (Marks)</label>
          <div className="flex gap-1.5 flex-wrap">
            {[2, 3, 5, 7, 10].map(m => (
              <button
                key={m}
                onClick={() => setAiOptions(o => ({ ...o, marks: m as any }))}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  aiOptions.marks === m
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-300'
                }`}
              >
                {m}M
              </button>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">AI Actions</label>
          <div className="grid grid-cols-2 gap-1.5">
            {ACTION_BUTTONS.map(btn => {
              const Icon = btn.icon;
              return (
                <button
                  key={btn.action}
                  disabled={isLoading}
                  onClick={() => {
                    if (btn.action === 'generate') {
                      sendMessage(
                        `Generate a ${aiOptions.marks}-mark answer for: ${question?.text || 'Please specify a question'}`,
                        'generate'
                      );
                    } else {
                      sendMessage(`${btn.label}: ${currentAnswer || question?.text || ''}`, btn.action as any);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${
                    btn.primary
                      ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 col-span-2'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  <Icon size={12} />
                  {btn.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Save to question */}
        {question && currentAnswer && (
          <button
            onClick={saveAnswerToQuestion}
            className={`w-full btn-primary text-sm py-2 ${savedToQuestion ? 'bg-green-600 hover:bg-green-700' : ''}`}
          >
            {savedToQuestion ? <CheckCheck size={15} /> : <HelpCircle size={15} />}
            {savedToQuestion ? 'Saved!' : 'Save Answer to Question'}
          </button>
        )}
      </div>

      {/* Right: Chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Bot size={14} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">StudyVault AI</p>
              <p className="text-xs text-gray-400">Powered by Gemini · RGPV Exam Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentAnswer && (
              <button onClick={() => copy(currentAnswer)} className="btn-ghost text-xs">
                {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            )}
            <button onClick={clearChat} className="btn-ghost text-xs text-gray-400">
              <RefreshCw size={13} /> Clear
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
                <Bot size={28} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                StudyVault AI Assistant
              </h3>
              <p className="text-sm text-gray-400 max-w-sm mb-4">
                Ask me anything about your syllabus, generate exam answers, explain concepts, or improve your notes.
              </p>
              <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
                {[
                  'Explain Finite Automata in simple Hindi',
                  'What is Deadlock in OS? 7-mark answer',
                  'Compare DFA and NFA in a table',
                  'Give 5 important questions from TOC Unit 1',
                ].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="text-left p-2.5 text-xs text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
              }`}>
                {msg.isLoading ? (
                  <div className="flex items-center gap-2 py-1">
                    <Loader2 size={14} className="spinner text-blue-500" />
                    <span className="text-sm text-gray-500">Generating answer...</span>
                  </div>
                ) : (
                  <>
                    <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                    {msg.role === 'assistant' && msg.content && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <button
                          onClick={() => copy(msg.content)}
                          className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                        >
                          {copied ? <CheckCheck size={11} /> : <Copy size={11} />}
                          Copy
                        </button>
                        {question && (
                          <button
                            onClick={() => { setCurrentAnswer(msg.content); saveAnswerToQuestion(); }}
                            className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
                          >
                            <HelpCircle size={11} /> Save to Question
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
              <AlertCircle size={16} />
              <span className="text-sm">{error}</span>
              <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900 flex-shrink-0">
          <div className="flex gap-3">
            <textarea
              ref={textareaRef}
              className="flex-1 input resize-none max-h-32"
              rows={2}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything... (Enter to send, Shift+Enter for new line)"
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              className="btn-primary self-end px-4"
            >
              {isLoading ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            ⚙️ Requires API key in backend. See README for setup. Mock mode available.
          </p>
        </div>
      </div>
    </div>
  );
}
