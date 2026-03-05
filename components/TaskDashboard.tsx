// ai-task-dashboard/components/TaskDashboard.tsx
'use client';

import { useActionState, useOptimistic, useState, useEffect, useRef } from 'react';
import { createTaskAction, deleteTaskAction, updateTaskAction, addCommentAction } from '@/app/actions';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { motion, AnimatePresence } from 'framer-motion';
import imageCompression from 'browser-image-compression';
import { 
  Send, Image as ImageIcon, Trash2, 
  ChevronRight, ChevronLeft, X, LayoutGrid, 
  Activity, CheckCircle2, FileText, Maximize2, Minimize2, Layers, Edit3, Eye, Loader2, User, MessageSquare, ShieldCheck, CornerDownRight
} from 'lucide-react';

export type Task = { 
  id: string; title: string; description?: string; author_name: string;
  status: string; image_url?: string; image_urls?: string[]; is_sent: boolean;
  comments?: any[];
};

export default function TaskDashboard({ initialTasks }: { initialTasks: Task[] }) {
  const [state, formAction, isPending] = useActionState(createTaskAction, { success: true });
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [compressedFiles, setCompressedFiles] = useState<File[]>([]);
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null); // 用於留言回覆

  const [optimisticTasks, addOptimisticTask] = useOptimistic(
    initialTasks,
    (state, newTask: Task) => [newTask, ...state]
  );

  useEffect(() => {
    const savedUser = localStorage.getItem('task_user');
    if (!savedUser) setShowAuth(true);
    else setCurrentUser(savedUser);
  }, []);

  const isAdmin = currentUser === 'Admin0726';

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsCompressing(true);
    try {
      const results = await Promise.all(Array.from(files).map(async (file) => {
        const compressed = await imageCompression(file, { maxSizeMB: 0.8, maxWidthOrHeight: 1920 });
        return { finalFile: new File([compressed], file.name, { type: file.type }), preview: await imageCompression.getDataUrlFromFile(compressed) };
      }));
      setCompressedFiles(results.map(r => r.finalFile));
      setImagePreviews(results.map(r => r.preview));
    } finally { setIsCompressing(false); }
  };

  const handleAuth = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = (new FormData(e.currentTarget)).get('username') as string;
    if (name) {
      localStorage.setItem('task_user', name);
      setCurrentUser(name);
      setShowAuth(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-blue-500/30 font-sans">
      
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px]" />
      </div>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuth && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-2xl p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900 border border-white/10 p-10 rounded-[3rem] w-full max-w-md shadow-2xl text-center">
              <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-blue-500/20"><User size={40} /></div>
              <h2 className="text-3xl font-black mb-2 italic">IDENTIFY YOURSELF</h2>
              <p className="text-slate-500 text-sm mb-8 font-bold tracking-widest uppercase">Mission Access Protocol</p>
              <form onSubmit={handleAuth} className="space-y-4">
                <input name="username" placeholder="Codename..." className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-center text-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none" required />
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black tracking-widest transition-all">INITIALIZE SESSION</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto p-6 md:p-12 relative z-10">
        
        {/* User Info Bar */}
        <div className="flex justify-end mb-8">
          <div className="flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/5 rounded-full backdrop-blur-md">
            {isAdmin ? <ShieldCheck size={14} className="text-yellow-500" /> : <User size={14} className="text-blue-400" />}
            <span className={`text-[10px] font-black uppercase tracking-widest ${isAdmin ? 'text-yellow-500' : 'text-slate-300'}`}>{currentUser || 'Unknown'}</span>
            <button onClick={() => { localStorage.removeItem('task_user'); window.location.reload(); }} className="text-[10px] text-slate-600 hover:text-white font-bold ml-2">LOGOUT</button>
          </div>
        </div>

        {/* Header */}
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6">
          <div>
            <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-r from-white via-slate-200 to-slate-500 bg-clip-text text-transparent italic text-shadow-glow leading-none">AI COMMAND</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 mt-2">Tactical Social Network</p>
          </div>
          <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3 backdrop-blur-xl">
            <Activity size={16} className="text-emerald-400" />
            <span className="text-xl font-black font-mono">{optimisticTasks.length}</span>
          </div>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Input Panel */}
          <div className="lg:col-span-5">
            <div className="sticky top-10 bg-white/5 border border-white/10 p-8 rounded-[3rem] backdrop-blur-2xl shadow-2xl space-y-6">
              <form action={async (formData) => {
                const title = formData.get('title') as string;
                const description = formData.get('description') as string;
                if (!title) return;
                formData.append('author_name', currentUser || 'Guest');
                formData.delete('image');
                compressedFiles.forEach(f => formData.append('image', f));
                
                addOptimisticTask({ id: Math.random().toString(), title, description, author_name: currentUser || 'Guest', status: 'Pending', is_sent: false, image_url: imagePreviews[0], image_urls: imagePreviews });
                await formAction(formData);
                setImagePreviews([]); setCompressedFiles([]); (document.getElementById('task-form') as HTMLFormElement).reset();
              }} id="task-form" className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 tracking-widest px-2 uppercase">Objective Title</label>
                  <input name="title" placeholder="What's the mission?" className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 tracking-widest px-2 uppercase">Narrative (Markdown)</label>
                  <textarea name="description" placeholder="Intel log details..." rows={5} className="w-full bg-black/20 border border-white/5 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono text-sm" />
                </div>
                <div className="relative group cursor-pointer bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center justify-center gap-3 hover:bg-black/60 transition-all">
                  <input type="file" name="image" accept="image/*" multiple className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleImageChange} />
                  {imagePreviews.length > 0 && <img src={imagePreviews[0]} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-[1px]" />}
                  {isCompressing ? <Loader2 className="animate-spin text-blue-400" /> : <ImageIcon size={18} className={imagePreviews.length > 0 ? 'text-blue-400' : 'text-slate-600'} />}
                  <span className="text-[10px] font-black uppercase text-slate-500 z-20">{isCompressing ? 'Optimizing...' : (imagePreviews.length > 0 ? `${imagePreviews.length} Media Ready` : 'Add Visuals')}</span>
                </div>
                <button type="submit" disabled={isPending || isCompressing} className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black text-white shadow-2xl flex items-center justify-center gap-3">
                  <Send size={18} /> {isPending ? 'DEPLOYING...' : 'INITIATE DEPLOY'}
                </button>
              </form>
            </div>
          </div>

          {/* List Panel */}
          <div className="lg:col-span-7 space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence mode="popLayout">
                {optimisticTasks.map((task, idx) => (
                  <motion.div layout key={task.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }} onClick={() => { setEditingTask(task); setIsSidebarOpen(true); setCurrentImgIdx(0); setIsEditMode(false); }} className="group cursor-pointer bg-white/[0.03] border border-white/5 hover:border-blue-500/40 p-6 rounded-[2.5rem] transition-all duration-500 relative">
                    <div className="flex items-start gap-6">
                      <div className="w-20 h-20 rounded-3xl overflow-hidden border border-white/10 flex-shrink-0 bg-black/40 relative">
                        {((task.image_urls && task.image_urls.length > 0) || task.image_url) ? (
                          <>
                            <img src={task.image_urls?.[0] || task.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            {task.image_urls && task.image_urls.length > 1 && <div className="absolute top-1 right-1 bg-black/60 p-1 rounded-lg"><Layers size={10} className="text-white" /></div>}
                          </>
                        ) : <div className="w-full h-full flex items-center justify-center text-slate-600 opacity-20"><FileText size={32} /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2 gap-4">
                          <h3 className="font-black text-xl text-white tracking-tight leading-tight truncate">{task.title}</h3>
                          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full">
                            <User size={10} className="text-blue-400" />
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{task.author_name}</span>
                          </div>
                        </div>
                        <p className="text-slate-500 text-xs line-clamp-2 font-mono break-all">{task.description || 'No briefing.'}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Details Modal with Comments */}
        <AnimatePresence>
          {editingTask && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-12 bg-slate-950/95 backdrop-blur-2xl overflow-y-auto">
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900/50 border border-white/10 w-full max-w-6xl rounded-[4rem] shadow-2xl flex flex-col md:flex-row overflow-hidden h-full max-h-[90vh]">
                
                {/* Media Section */}
                <AnimatePresence mode="wait">
                  {isSidebarOpen && ((editingTask.image_urls && editingTask.image_urls.length > 0) || editingTask.image_url) && (
                    <motion.div key="sidebar" initial={{ width: 0, opacity: 0 }} animate={{ width: '50%', opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="hidden md:flex bg-black/40 items-center justify-center relative border-r border-white/5 overflow-hidden p-10">
                      <div className="w-full h-full relative flex items-center justify-center">
                        <motion.img key={currentImgIdx} src={editingTask.image_urls?.[currentImgIdx] || editingTask.image_url} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full h-full object-contain drop-shadow-2xl" />
                        {editingTask.image_urls && editingTask.image_urls.length > 1 && (
                          <div className="absolute bottom-6 flex gap-2">{editingTask.image_urls.map((_, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentImgIdx ? 'bg-blue-500 w-4' : 'bg-white/20'}`} />)}</div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Content Section */}
                <div className={`p-8 md:p-16 flex flex-col overflow-y-auto custom-scrollbar transition-all duration-500 ${isSidebarOpen && ((editingTask.image_urls && editingTask.image_urls.length > 0) || editingTask.image_url) ? 'md:w-1/2' : 'w-full'}`}>
                  <div className="flex justify-between items-center mb-12">
                    <div className="flex items-center gap-3"><CheckCircle2 size={24} className="text-blue-500" /><h2 className="text-[10px] font-black text-slate-500 tracking-[0.3em] uppercase">Intelligence Detail</h2></div>
                    <div className="flex items-center gap-4">
                      {((editingTask.image_urls && editingTask.image_urls.length > 0) || editingTask.image_url) && (
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-white/5 rounded-xl text-blue-400">{isSidebarOpen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</button>
                      )}
                      {(isAdmin || editingTask.author_name === currentUser) && (
                        <button onClick={() => setIsEditMode(!isEditMode)} className="p-2 bg-white/5 rounded-xl text-emerald-400">{isEditMode ? <Eye size={20} /> : <Edit3 size={20} />}</button>
                      )}
                      <button onClick={() => setEditingTask(null)} className="text-slate-600 hover:text-white"><X size={32} /></button>
                    </div>
                  </div>

                  <div className="space-y-10 flex-1">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-xs font-black text-blue-500 mb-2">
                        {editingTask.author_name === 'Admin0726' && <ShieldCheck size={14} className="text-yellow-500" />}
                        <span className="tracking-widest uppercase">{editingTask.author_name} / AUTHOR</span>
                      </div>
                      <input id="edit-title" disabled={!isAdmin && editingTask.author_name !== currentUser} defaultValue={editingTask.title} className="w-full bg-transparent text-4xl font-black text-white outline-none border-b border-white/5 focus:border-blue-500 pb-2" />
                    </div>

                    <div className="space-y-6">
                      {isEditMode ? (
                        <textarea id="edit-desc" defaultValue={editingTask.description} rows={10} className="w-full bg-white/5 border border-white/10 rounded-3xl p-8 outline-none focus:ring-1 focus:ring-blue-500/50 text-slate-300 font-mono text-sm leading-relaxed" />
                      ) : (
                        <div className="prose prose-invert prose-sm max-w-none prose-cyan font-sans bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5 shadow-inner overflow-x-hidden break-words"><ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{editingTask.description || ''}</ReactMarkdown></div>
                      )}
                    </div>

                    {/* --- Comments System --- */}
                    <div className="pt-10 border-t border-white/5 space-y-8">
                      <div className="flex items-center gap-3"><MessageSquare size={18} className="text-blue-500" /><h3 className="text-sm font-black text-white uppercase tracking-widest">Comm Log (Comments)</h3></div>
                      
                      {/* Comment Input */}
                      <div className="bg-white/[0.03] border border-white/5 p-6 rounded-3xl space-y-4">
                        <textarea id="comment-input" placeholder={replyTo ? `Replying to...` : "Input mission update..."} className="w-full bg-transparent outline-none text-sm font-mono" rows={3} />
                        <div className="flex justify-between items-center">
                          {replyTo && <button onClick={() => setReplyTo(null)} className="text-[10px] text-red-400 font-bold uppercase">Cancel Reply</button>}
                          <button onClick={async () => {
                            const content = (document.getElementById('comment-input') as HTMLTextAreaElement).value;
                            if (content) {
                              await addCommentAction(editingTask.id, currentUser!, content, replyTo);
                              (document.getElementById('comment-input') as HTMLTextAreaElement).value = '';
                              setReplyTo(null);
                            }
                          }} className="ml-auto bg-white text-black px-6 py-2 rounded-xl text-[10px] font-black uppercase">Post Update</button>
                        </div>
                      </div>

                      {/* Comment Feed */}
                      <div className="space-y-6">
                        {editingTask.comments?.map((c: any) => (
                          <div key={c.id} className={`flex gap-4 ${c.parent_id ? 'ml-10' : ''}`}>
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                              {c.author_name === 'Admin0726' ? <ShieldCheck size={14} className="text-yellow-500" /> : <User size={14} className="text-slate-500" />}
                            </div>
                            <div className="flex-1 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-black text-blue-400 uppercase">{c.author_name}</span>
                                <button onClick={() => setReplyTo(c.id)} className="text-[8px] font-black text-slate-600 hover:text-white uppercase">Reply</button>
                              </div>
                              <p className="text-sm text-slate-300 leading-relaxed break-words">{c.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 mt-12">
                    {(isAdmin || editingTask.author_name === currentUser) && (
                      <>
                        <button onClick={async () => {
                          const t = (document.getElementById('edit-title') as HTMLInputElement).value;
                          const d = isEditMode ? (document.getElementById('edit-desc') as HTMLTextAreaElement).value : (editingTask.description || '');
                          await updateTaskAction(editingTask.id, t, d, editingTask.status);
                          setEditingTask(null);
                        }} className="flex-1 bg-white text-black py-5 rounded-3xl font-black hover:bg-slate-200 transition-all">UPDATE MISSION</button>
                        <button onClick={async () => { await deleteTaskAction(editingTask.id); setEditingTask(null); }} className="bg-red-500/10 text-red-500 px-10 py-5 rounded-3xl font-black border border-red-500/20"><Trash2 size={20} /></button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .text-shadow-glow { text-shadow: 0 0 20px rgba(59, 130, 246, 0.4); }
        .prose pre { white-space: pre-wrap; word-break: break-all; overflow-x: auto; max-width: 100%; }
        .prose table { display: block; overflow-x: auto; max-width: 100%; border-collapse: collapse; }
        .prose th, .prose td { border: 1px solid rgba(255,255,255,0.1); padding: 8px; }
        .prose p { white-space: pre-wrap; margin-bottom: 1em; }
        .prose a { color: #60a5fa; text-decoration: underline; text-underline-offset: 4px; }
      `}</style>
    </div>
  );
}
