// ai-task-dashboard/components/TaskDashboard.tsx
'use client';

import { useActionState, useOptimistic, useState, useRef } from 'react';
import { createTaskAction, deleteTaskAction, updateTaskAction } from '@/app/actions';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { motion, AnimatePresence } from 'framer-motion';
import imageCompression from 'browser-image-compression';
import { 
  Send, Image as ImageIcon, Clock, Trash2, 
  ChevronRight, ChevronLeft, X, ExternalLink, LayoutGrid, 
  Activity, CheckCircle2, FileText, Maximize2, Minimize2, Layers, Edit3, Eye, Loader2, AlertTriangle
} from 'lucide-react';

export type Task = { 
  id: string; 
  title: string; 
  description?: string;
  status: string; 
  image_url?: string; 
  image_urls?: string[]; 
  scheduled_at?: string; 
  is_sent: boolean 
};

export default function TaskDashboard({ initialTasks }: { initialTasks: Task[] }) {
  const [state, formAction, isPending] = useActionState(createTaskAction, { success: true });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]); // 改為陣列
  const [compressedFiles, setCompressedFiles] = useState<File[]>([]); // 改為陣列
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [optimisticTasks, addOptimisticTask] = useOptimistic(
    initialTasks,
    (state, newTask: Task) => [newTask, ...state]
  );

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressing(true);
    const fileList = Array.from(files);
    
    try {
      const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1920, useWebWorker: true };
      
      // 併發處理所有圖片壓縮
      const results = await Promise.all(fileList.map(async (file) => {
        const compressed = await imageCompression(file, options);
        const finalFile = new File([compressed], file.name, { type: file.type });
        const preview = await imageCompression.getDataUrlFromFile(compressed);
        return { finalFile, preview };
      }));

      setCompressedFiles(results.map(r => r.finalFile));
      setImagePreviews(results.map(r => r.preview));
    } catch (error) {
      console.error('Compression Error:', error);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    if (!title) return;

    // 清除原本的圖片並塞入所有壓縮後的檔案
    formData.delete('image');
    compressedFiles.forEach(file => {
      formData.append('image', file);
    });

    addOptimisticTask({ 
      id: Math.random().toString(), 
      title, 
      description, 
      status: 'Pending', 
      is_sent: false, 
      image_url: imagePreviews[0] || undefined,
      image_urls: imagePreviews
    });

    await formAction(formData);
    
    setImagePreviews([]);
    setCompressedFiles([]);
    formRef.current?.reset();
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-cyan-500/30 overflow-x-hidden font-sans">
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto p-6 md:p-12 relative z-10">
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6">
          <div className="text-center md:text-left pr-10">
            <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-r from-white via-slate-200 to-slate-500 bg-clip-text text-transparent italic text-shadow-glow pb-2 leading-none">AI COMMAND</h1>
            <div className="flex items-center gap-3 mt-2 justify-center md:justify-start">
              <span className="h-[1px] w-8 bg-blue-500"></span>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400">Tactical Control Center</p>
            </div>
          </div>
          <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3 backdrop-blur-xl">
            <Activity size={16} className="text-emerald-400" />
            <div className="flex flex-col leading-none">
              <span className="text-xl font-black font-mono">{optimisticTasks.length}</span>
              <span className="text-[8px] text-slate-500 uppercase tracking-widest mt-1 font-bold">Log Entries</span>
            </div>
          </div>
        </motion.header>

        {state && !state.success && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-400 text-sm">
            <AlertTriangle size={18} />
            <span>{state.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-5">
            <div className="sticky top-10 space-y-6">
              <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem] backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 tracking-widest px-2 uppercase">Subject</label>
                    <input name="title" placeholder="Objective..." className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-lg font-bold focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 tracking-widest px-2 uppercase">Narrative (Markdown)</label>
                    <textarea name="description" placeholder="Technical specifications..." rows={5} className="w-full bg-black/20 border border-white/5 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none font-mono text-sm leading-relaxed" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative group cursor-pointer bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center justify-center gap-3 hover:bg-black/60 transition-all overflow-hidden">
                      <input type="file" name="image" accept="image/*" multiple className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleImageChange} />
                      {imagePreviews.length > 0 && <img src={imagePreviews[0]} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-[1px]" />}
                      {isCompressing ? <Loader2 size={18} className="animate-spin text-blue-400" /> : <ImageIcon size={18} className={imagePreviews.length > 0 ? 'text-blue-400' : 'text-slate-600'} />}
                      <span className="text-[10px] font-black uppercase text-slate-500 z-20">
                        {isCompressing ? 'Optimizing...' : (imagePreviews.length > 0 ? `${imagePreviews.length} Files Ready` : 'Add Visuals')}
                      </span>
                    </div>
                    <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center justify-center gap-3">
                      <Clock size={18} className="text-slate-600" />
                      <input type="datetime-local" name="scheduled_at" className="bg-transparent border-none outline-none text-[10px] text-slate-500 font-black w-full uppercase" />
                    </div>
                  </div>
                  <button type="submit" disabled={isPending || isCompressing} className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black text-white shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                    <Send size={18} />
                    {isPending ? 'DEPLOYING...' : 'INITIATE MISSION'}
                  </button>
                </form>
              </div>
            </div>
          </motion.div>

          <div className="lg:col-span-7 space-y-6">
            <AnimatePresence mode="popLayout">
              {optimisticTasks.map((task, idx) => (
                <motion.div layout key={task.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.03 }} onClick={() => { setEditingTask(task); setIsSidebarOpen(true); setCurrentImgIdx(0); setIsEditMode(false); }} className="group cursor-pointer bg-white/[0.03] border border-white/5 hover:border-blue-500/40 p-6 rounded-[2rem] transition-all duration-500 hover:bg-white/[0.04] relative">
                  <div className="flex items-start gap-6">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0 bg-black/40 relative">
                      {((task.image_urls && task.image_urls.length > 0) || task.image_url) ? (
                        <>
                          <img src={task.image_urls?.[0] || task.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                          {task.image_urls && task.image_urls.length > 1 && (
                            <div className="absolute top-1 right-1 bg-black/60 p-1 rounded-lg"><Layers size={10} className="text-white" /></div>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600 opacity-20 group-hover:opacity-100 group-hover:text-blue-400 transition-all">
                          <FileText size={32} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2 gap-4">
                        <h3 className="font-black text-xl text-white tracking-tight leading-tight truncate">{task.title}</h3>
                        <div className="bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full flex items-center gap-2">
                          <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">{task.status}</span>
                        </div>
                      </div>
                      <p className="text-slate-500 text-xs line-clamp-2 font-mono mb-4 break-all">{task.description || 'No detailed intel.'}</p>
                      <div className="flex items-center gap-4 text-slate-600 font-black uppercase text-[9px] tracking-widest">
                        {task.scheduled_at && <div className="flex items-center gap-1.5 text-emerald-500"><Clock size={10} /> {new Date(task.scheduled_at).toLocaleTimeString()}</div>}
                        <div className="flex items-center gap-1.5 hover:text-white transition-colors"><ChevronRight size={10} /> View Brief</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Modal: Carousel remains exactly the same as requested */}
        <AnimatePresence>
          {editingTask && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-12 bg-slate-950/95 backdrop-blur-xl overflow-y-auto">
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className={`bg-slate-900/50 border border-white/10 w-full max-w-6xl rounded-[4rem] shadow-2xl flex flex-col md:flex-row overflow-hidden h-full max-h-[85vh] ${(!editingTask.image_urls || editingTask.image_urls.length === 0) && !editingTask.image_url ? 'md:max-w-3xl' : ''}`}>
                <AnimatePresence mode="wait">
                  {isSidebarOpen && ((editingTask.image_urls && editingTask.image_urls.length > 0) || editingTask.image_url) && (
                    <motion.div key="sidebar" initial={{ width: 0, opacity: 0 }} animate={{ width: '50%', opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ type: 'spring', damping: 20, stiffness: 100 }} className="hidden md:flex bg-black/40 items-center justify-center relative group border-r border-white/5 overflow-hidden">
                      <div className="w-full h-full relative flex items-center justify-center p-8">
                        <AnimatePresence mode="wait">
                          <motion.img 
                            key={currentImgIdx}
                            src={editingTask.image_urls?.[currentImgIdx] || editingTask.image_url} 
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }}
                            className="w-full h-full object-contain drop-shadow-2xl cursor-zoom-in"
                            onClick={() => setFullscreenImage(editingTask.image_urls?.[currentImgIdx] || editingTask.image_url!)}
                          />
                        </AnimatePresence>
                        {editingTask.image_urls && editingTask.image_urls.length > 1 && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); setCurrentImgIdx(prev => (prev > 0 ? prev - 1 : editingTask.image_urls!.length - 1)) }} className="absolute left-4 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"><ChevronLeft /></button>
                            <button onClick={(e) => { e.stopPropagation(); setCurrentImgIdx(prev => (prev < editingTask.image_urls!.length - 1 ? prev + 1 : 0)) }} className="absolute right-4 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight /></button>
                            <div className="absolute bottom-6 flex gap-2">
                              {editingTask.image_urls.map((_, i) => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentImgIdx ? 'bg-blue-500 w-4' : 'bg-white/20'}`} />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className={`p-8 md:p-16 flex flex-col overflow-y-auto custom-scrollbar transition-all duration-500 ${isSidebarOpen && ((editingTask.image_urls && editingTask.image_urls.length > 0) || editingTask.image_url) ? 'md:w-1/2' : 'w-full'}`}>
                  <div className="flex justify-between items-center mb-12">
                    <div className="flex items-center gap-3"><CheckCircle2 size={24} className="text-emerald-500" /><h2 className="text-sm font-black text-slate-500 tracking-[0.3em] uppercase">Intelligence Detail</h2></div>
                    <div className="flex items-center gap-4">
                      {((editingTask.image_urls && editingTask.image_urls.length > 0) || editingTask.image_url) && (
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                          {isSidebarOpen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                          <span>{isSidebarOpen ? 'Focus' : 'Media'}</span>
                        </button>
                      )}
                      <button onClick={() => setIsEditMode(!isEditMode)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-blue-400">{isEditMode ? <Eye size={20} /> : <Edit3 size={20} />}</button>
                      <button onClick={() => setEditingTask(null)} className="text-slate-600 hover:text-white"><X size={32} /></button>
                    </div>
                  </div>
                  <div className="space-y-10 flex-1">
                    <div className="space-y-3"><label className="text-[10px] font-black text-slate-600 tracking-widest uppercase">Mission Header</label><input id="edit-title" defaultValue={editingTask.title} className="w-full bg-transparent text-4xl font-black text-white outline-none border-b border-white/5 focus:border-blue-500 pb-2" /></div>
                    <div className="space-y-6">
                      <label className="text-[10px] font-black text-slate-600 tracking-widest uppercase">Objective Log</label>
                      {isEditMode ? (
                        <textarea id="edit-desc" defaultValue={editingTask.description} rows={12} className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 outline-none focus:ring-1 focus:ring-blue-500/50 text-slate-300 font-mono text-sm leading-relaxed" />
                      ) : (
                        <div className="prose prose-invert prose-sm max-w-none prose-cyan prose-a:text-cyan-400 font-sans bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5 shadow-inner overflow-x-hidden break-words cursor-pointer hover:bg-white/[0.04]" onClick={() => setIsEditMode(true)}>
                          <div className="overflow-x-auto custom-scrollbar"><ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{editingTask.description || '*No detailed briefing.*'}</ReactMarkdown></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4 mt-12">
                    <button onClick={async () => {
                      const t = (document.getElementById('edit-title') as HTMLInputElement).value;
                      const d = isEditMode ? (document.getElementById('edit-desc') as HTMLTextAreaElement).value : (editingTask.description || '');
                      await updateTaskAction(editingTask.id, t, d, editingTask.status);
                      setEditingTask(null);
                    }} className="flex-1 bg-white text-black py-5 rounded-3xl font-black hover:bg-slate-200 transition-all">UPDATE MISSION</button>
                    <button onClick={async () => { await deleteTaskAction(editingTask.id); setEditingTask(null); }} className="bg-red-500/10 text-red-500 px-10 py-5 rounded-3xl font-black border border-red-500/20 hover:bg-red-500/20"><Trash2 size={20} /></button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {fullscreenImage && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setFullscreenImage(null)} className="fixed inset-0 z-[100] bg-black/98 flex items-center justify-center p-4 cursor-zoom-out">
              <img src={fullscreenImage} className="max-w-full max-h-full object-contain shadow-[0_0_100px_rgba(0,0,0,0.5)]" />
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
        .prose p { white-space: pre-wrap; }
        .prose a { color: #60a5fa; text-decoration: underline; text-underline-offset: 4px; }
      `}</style>
    </div>
  );
}
