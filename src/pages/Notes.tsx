import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, FileText, Save, Trash2, Search, X,
  AlertTriangle, BookOpen, Clock, Bold, Italic,
  List, ListOrdered, Code, Heading1, Heading2,
  Undo, Redo, AlignLeft, Image as ImageIcon
} from 'lucide-react';
import { db, Note, Subject } from '../db/database';
import { useApp } from '../contexts/AppContext';
import { format } from 'date-fns';

// Simple rich-text editor using TipTap (loaded dynamically to avoid SSR issues)
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';

function RichEditor({ content, onChange, placeholder }: { content: string; onChange: (html: string) => void; placeholder?: string }) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState('');
  const maxImageSize = 5 * 1024 * 1024;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: placeholder || 'Start writing your note...' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ inline: false, allowBase64: true }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return null;

  const insertImage = (file: File) => {
    setImageError('');
    if (!file.type.startsWith('image/')) {
      setImageError('Please select an image file.');
      return;
    }
    if (file.size > maxImageSize) {
      setImageError('Image size must be 5 MB or less.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setImageError('Could not read this image.');
        return;
      }
      editor.chain().focus().setImage({ src: reader.result, alt: file.name }).run();
    };
    reader.onerror = () => setImageError('Could not read this image.');
    reader.readAsDataURL(file);
  };

  const handleImageSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) insertImage(file);
    event.target.value = '';
  };

  const btn = (action: () => void, isActive: boolean, icon: React.ReactNode, title: string) => (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); action(); }}
      title={title}
      className={`p-1.5 rounded transition-colors ${isActive ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
    >
      {icon}
    </button>
  );

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {btn(() => editor.chain().focus().toggleBold().run(), editor.isActive('bold'), <Bold size={14} />, 'Bold')}
        {btn(() => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'), <Italic size={14} />, 'Italic')}
        {btn(() => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'), <span className="text-xs font-bold underline">U</span>, 'Underline')}
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
        {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive('heading', { level: 1 }), <Heading1 size={14} />, 'Heading 1')}
        {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }), <Heading2 size={14} />, 'Heading 2')}
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
        {btn(() => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'), <List size={14} />, 'Bullet List')}
        {btn(() => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'), <ListOrdered size={14} />, 'Numbered List')}
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
        {btn(() => editor.chain().focus().toggleCode().run(), editor.isActive('code'), <Code size={14} />, 'Inline Code')}
        {btn(() => editor.chain().focus().toggleCodeBlock().run(), editor.isActive('codeBlock'), <Code size={16} />, 'Code Block')}
        {btn(() => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'), <AlignLeft size={14} />, 'Quote')}
        {btn(() => imageInputRef.current?.click(), false, <ImageIcon size={14} />, 'Add image')}
        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1" />
        {btn(() => editor.chain().focus().undo().run(), false, <Undo size={14} />, 'Undo')}
        {btn(() => editor.chain().focus().redo().run(), false, <Redo size={14} />, 'Redo')}
      </div>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageSelection}
      />
      <EditorContent
        editor={editor}
        className="tiptap-editor min-h-64 prose prose-sm dark:prose-invert max-w-none"
        onDrop={event => {
          const file = event.dataTransfer.files[0];
          if (file?.type.startsWith('image/')) {
            event.preventDefault();
            insertImage(file);
          }
        }}
        onPaste={event => {
          const file = Array.from(event.clipboardData.files).find(item => item.type.startsWith('image/'));
          if (file) {
            event.preventDefault();
            insertImage(file);
          }
        }}
      />
      {imageError && <p className="px-3 py-2 text-xs text-red-600 dark:text-red-400">{imageError}</p>}
    </div>
  );
}

// Modal
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-3xl mt-8 mb-8 fade-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 rounded-t-2xl z-10">
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18} /></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// Note editor form
function NoteForm({ initial, subjects, onSave, onClose, semesterId }: {
  initial?: Note;
  subjects: Subject[];
  onSave: (note: Partial<Note>) => Promise<void>;
  onClose: () => void;
  semesterId?: number;
}) {
  const [title, setTitle] = useState(initial?.title || '');
  const [content, setContent] = useState(initial?.content || '');
  const [linkedSubjectId, setLinkedSubjectId] = useState<number | undefined>(initial?.subjectId);
  const [tags, setTags] = useState(initial?.tags || '');
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');

  // Auto-save after 2 seconds of inactivity
  useEffect(() => {
    if (!initial?.id) return;
    setAutoSaveStatus('unsaved');
    const timer = setTimeout(async () => {
      setAutoSaveStatus('saving');
      await onSave({ id: initial.id, title, content, subjectId: linkedSubjectId, tags, semesterId });
      setAutoSaveStatus('saved');
    }, 2000);
    return () => clearTimeout(timer);
  }, [title, content, linkedSubjectId, tags]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({ id: initial?.id, title, content, subjectId: linkedSubjectId, tags, semesterId });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input
            className="input text-base font-semibold"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Note title..."
            required
          />
        </div>
        {initial?.id && (
          <span className={`text-xs ${autoSaveStatus === 'saved' ? 'text-green-500' : autoSaveStatus === 'saving' ? 'text-blue-500' : 'text-orange-500'}`}>
            {autoSaveStatus === 'saved' ? '✓ Saved' : autoSaveStatus === 'saving' ? 'Saving...' : '● Unsaved'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Link to Subject</label>
          <select className="input text-sm" value={linkedSubjectId || ''} onChange={e => setLinkedSubjectId(Number(e.target.value) || undefined)}>
            <option value="">No subject</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Tags (comma-separated)</label>
          <input className="input text-sm" value={tags} onChange={e => setTags(e.target.value)} placeholder="revision, important, exam..." />
        </div>
      </div>

      <RichEditor content={content} onChange={setContent} placeholder="Write your note here..." />

      <div className="flex gap-3 pt-2">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full spinner" /> : <Save size={15} />}
          {initial?.id ? 'Update Note' : 'Create Note'}
        </button>
        <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
      </div>
    </form>
  );
}

export default function NotesPage() {
  const [searchParams] = useSearchParams();
  const { activeSemesterId } = useApp();
  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [showForm, setShowForm] = useState(searchParams.has('new'));
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);

  useEffect(() => { loadData(); }, [activeSemesterId]);

  async function loadData() {
    setLoading(true);
    try {
      let ns: Note[];
      if (activeSemesterId) {
        ns = await db.notes.where('semesterId').equals(activeSemesterId).toArray();
      } else {
        ns = await db.notes.toArray();
      }
      ns.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setNotes(ns);
      if (activeSemesterId) {
        const subs = await db.subjects.where('semesterId').equals(activeSemesterId).toArray();
        setSubjects(subs);
      }
    } finally {
      setLoading(false);
    }
  }

  const saveNote = async (form: Partial<Note>) => {
    const now = new Date();
    if (form.id) {
      await db.notes.update(form.id, { ...form, updatedAt: now });
    } else {
      await db.notes.add({ ...form, semesterId: activeSemesterId, createdAt: now, updatedAt: now } as Note);
    }
    await loadData();
  };

  const doDelete = async () => {
    if (!deleteTarget?.id) return;
    await db.notes.delete(deleteTarget.id);
    await loadData();
    setDeleteTarget(null);
  };

  const exportNote = (note: Note) => {
    const md = `# ${note.title}\n\n${note.content.replace(/<[^>]+>/g, '')}\n`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = notes.filter(n => {
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !n.content.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterSubject && n.subjectId !== Number(filterSubject)) return false;
    return true;
  });

  const getSubjectName = (id?: number) => id ? subjects.find(s => s.id === id)?.name : undefined;

  return (
    <div className="p-4 md:p-6 space-y-4 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText size={24} className="text-blue-500" />
            My Notes
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} note{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditNote(null); setShowForm(true); }}>
          <Plus size={16} /> New Note
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search notes..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-48" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText size={48} className="text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 mb-2">
            {notes.length === 0 ? 'No Notes Yet' : 'No Matching Notes'}
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            {notes.length === 0 ? 'Create your first note to start organizing your study material.' : 'Try a different search term.'}
          </p>
          {notes.length === 0 && (
            <button className="btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Create Note</button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(note => (
            <div
              key={note.id}
              className="card p-4 cursor-pointer hover:shadow-md transition-all group"
              onClick={() => { setEditNote(note); setShowForm(true); }}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm line-clamp-1">{note.title}</h3>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2" onClick={e => e.stopPropagation()}>
                  <button onClick={() => exportNote(note)} className="p-1 text-gray-400 hover:text-blue-500" title="Export as Markdown">
                    <BookOpen size={13} />
                  </button>
                  <button onClick={() => setDeleteTarget(note)} className="p-1 text-gray-400 hover:text-red-500">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {/* Content preview */}
              <p className="text-xs text-gray-500 line-clamp-3 mb-3"
                dangerouslySetInnerHTML={{ __html: note.content.replace(/<[^>]+>/g, ' ') }} />
              <div className="flex items-center justify-between">
                <div className="flex gap-1 flex-wrap">
                  {note.subjectId && (
                    <span className="badge bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 text-xs">
                      {getSubjectName(note.subjectId)}
                    </span>
                  )}
                  {note.tags?.split(',').slice(0, 2).map(t => t.trim()).filter(Boolean).map(t => (
                    <span key={t} className="badge bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 text-xs">{t}</span>
                  ))}
                </div>
                <span className="text-xs text-gray-400 flex items-center gap-1 flex-shrink-0">
                  <Clock size={10} /> {format(new Date(note.updatedAt), 'dd MMM')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <Modal
          title={editNote ? `Edit: ${editNote.title}` : 'Create New Note'}
          onClose={() => { setShowForm(false); setEditNote(null); loadData(); }}
        >
          <NoteForm
            initial={editNote || undefined}
            subjects={subjects}
            onSave={saveNote}
            onClose={() => { setShowForm(false); setEditNote(null); loadData(); }}
            semesterId={activeSemesterId || undefined}
          />
        </Modal>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6 fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Delete Note?</h3>
                <p className="text-xs text-gray-500 mt-0.5">"{deleteTarget.title}"</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={doDelete} className="btn-danger flex-1">Delete</button>
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
