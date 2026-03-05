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
  ChevronRight, ChevronLeft, X, ExternalLink, LayoutGrid, 
  Activity, CheckCircle2, FileText, Maximize2, Minimize2, Layers, Edit3, Eye, Loader2, User, MessageSquare, ShieldCheck, CornerDownRight, LogOut
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
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [compressedFiles, setCompressedFiles] = useState<File[]>([]);
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

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

  const handlePostComment = async () => {
    const input = document.getElementById('comment-input') as HTMLTextAreaElement;
    if (!input || !input.value || !editingTask) return;

    const content = input.value;
    const newComment = {
      id: Math.random().toString(),
      task_id: editingTask.id,
      author_name: currentUser,
      content: content,
      parent_id: replyTo?.id || null,
      created_at: new Date().toISOString()
    };

    // 更新當前 Modal 的留言列表 (樂觀更新)
    setEditingTask({
      ...editingTask,
      comments: [...(editingTask.comments || []), newComment]
    });

    await addCommentAction(editingTask.id, currentUser!, content, replyTo?.id);
    input.value = '';
    setReplyTo(null);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-blue-500/30 font-sans">
      
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px]" />
      </div>

      {/* 登入視窗 */}
      <AnimatePresence>
        {showAuth && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-2xl p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900 border border-white/10 p-10 rounded-[3.5rem] w-full max-w-md shadow-2xl text-center">
              <div className="w-24 h-24 bg-blue-600 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-lg shadow-blue-500/30"><User size={48} /></div>
              <h2 className="text-3xl font-black mb-2 italic tracking-tighter">身分識別</h2>
              <p className="text-slate-500 text-xs mb-10 font-bold tracking-[0.3em] uppercase">Tactical Access Protocol</p>
              <form onSubmit={handleAuth} className="space-y-5">
                <input name="username" placeholder="輸入代號 (Codename)..." className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-center text-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all" required />
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black tracking-widest transition-all shadow-xl shadow-blue-900/40">開啟連線</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto p-6 md:p-12 relative z-10">
        
        {/* 使用者狀態列 */}
        <div className="flex justify-end mb-10">
          <div className="flex items-center gap-4 px-5 py-2.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-xl shadow-sm">
            {isAdmin ? <ShieldCheck size={16} className="text-yellow-500" /> : <User size={16} className="text-blue-400" />}
            <span className={`text-xs font-black uppercase tracking-widest ${isAdmin ? 'text-yellow-500' : 'text-slate-300'}`}>{currentUser || '未登入'}</span>
            <div className="w-[1px] h-4 bg-white/10"></div>
            <button onClick={() => { localStorage.removeItem('task_user'); window.location.reload(); }} className="flex items-center gap-2 text-[10px] text-slate-500 hover:text-red-400 font-black transition-colors"><LogOut size={12} /> 登出</button>
          </div>
        </div>

        {/* 標題區域 */}
        <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between items-center mb-16 gap-8">
          <div>
            <h1 className="text-6xl md:text-7xl font-black tracking-tighter bg-gradient-to-r from-white via-slate-200 to-slate-500 bg-clip-text text-transparent italic text-shadow-glow leading-none">AI COMMAND</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 mt-3 ml-1">戰術協作網路系統</p>
          </div>
          <div className="px-8 py-4 bg-white/5 border border-white/10 rounded-3xl flex items-center gap-4 backdrop-blur-2xl shadow-xl">
            <Activity size={20} className="text-emerald-400 animate-pulse" />
            <div className="flex flex-col leading-none">
              <span className="text-2xl font-black font-mono">{optimisticTasks.length}</span>
              <span className="text-[8px] text-slate-500 uppercase tracking-widest mt-1 font-bold">總部署量</span>
            </div>
          </div>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* 左側：輸入終端 */}
          <div className="lg:col-span-5">
            <div className="sticky top-10 bg-white/5 border border-white/10 p-8 md:p-10 rounded-[3.5rem] backdrop-blur-2xl shadow-2xl space-y-8">
              <form action={async (formData) => {
                const title = formData.get('title') as string;
                const description = formData.get('description') as string;
                if (!title) return;
                formData.append('author_name', currentUser || '訪客');
                formData.delete('image');
                compressedFiles.forEach(f => formData.append('image', f));
                addOptimisticTask({ id: Math.random().toString(), title, description, author_name: currentUser || '訪客', status: '進行中', is_sent: false, image_url: imagePreviews[0], image_urls: imagePreviews });
                await formAction(formData);
                setImagePreviews([]); setCompressedFiles([]); (document.getElementById('task-form') as HTMLFormElement).reset();
              }} id="task-form" className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 tracking-widest px-2 uppercase">目標主題 (Subject)</label>
                  <input name="title" placeholder="輸入任務標題..." className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all" required />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 tracking-widest px-2 uppercase">詳細內容 (Markdown)</label>
                  <textarea name="description" placeholder="支援表格、連結與列表..." rows={6} className="w-full bg-black/20 border border-white/10 rounded-3xl px-6 py-5 focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono text-sm leading-relaxed" />
                </div>
                <div className="relative group cursor-pointer bg-black/40 border border-white/10 rounded-3xl p-5 flex items-center justify-center gap-4 hover:bg-black/60 transition-all overflow-hidden shadow-inner">
                  <input type="file" name="image" accept="image/*" multiple className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleImageChange} />
                  {imagePreviews.length > 0 && <img src={imagePreviews[0]} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-[2px]" />}
                  {isCompressing ? <Loader2 className="animate-spin text-blue-400" /> : <ImageIcon size={20} className={imagePreviews.length > 0 ? 'text-blue-400' : 'text-slate-600'} />}
                  <span className="text-[10px] font-black uppercase text-slate-400 z-20">{isCompressing ? '優化中...' : (imagePreviews.length > 0 ? `已附加 ${imagePreviews.length} 張媒體` : '附加媒體檔案')}</span>
                </div>
                <button type="submit" disabled={isPending || isCompressing} className="w-full bg-blue-600 hover:bg-blue-500 py-6 rounded-3xl font-black text-white shadow-2xl flex items-center justify-center gap-4 transition-all active:scale-95 group">
                  <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> {isPending ? '上傳中...' : '執行任務部署'}
                </button>
              </form>
            </div>
          </div>

          {/* 右側：任務流 */}
          <div className="lg:col-span-7 space-y-8">
            <div className="flex items-center gap-3 px-4">
              <LayoutGrid size={16} className="text-blue-500" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">戰術紀錄即時串流</h2>
            </div>
            <div className="grid grid-cols-1 gap-5">
              <AnimatePresence mode="popLayout">
                {optimisticTasks.map((task, idx) => (
                  <motion.div layout key={task.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }} onClick={() => { setEditingTask(task); setIsSidebarOpen(true); setCurrentImgIdx(0); setIsEditMode(false); }} className="group cursor-pointer bg-white/[0.03] border border-white/5 hover:border-blue-500/40 p-6 rounded-[2.5rem] transition-all duration-500 hover:bg-white/[0.05] relative shadow-lg">
                    <div className="flex items-start gap-8">
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-[2rem] overflow-hidden border border-white/10 flex-shrink-0 bg-black/40 relative shadow-inner">
                        {((task.image_urls && task.image_urls.length > 0) || task.image_url) ? (
                          <>
                            <img src={task.image_urls?.[0] || task.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            {task.image_urls && task.image_urls.length > 1 && <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md p-1.5 rounded-xl"><Layers size={12} className="text-white" /></div>}
                          </>
                        ) : <div className="w-full h-full flex items-center justify-center text-slate-700 opacity-30"><FileText size={40} strokeWidth={1} /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-3 gap-4">
                          <h3 className="font-black text-2xl text-white tracking-tight leading-tight truncate group-hover:text-blue-400 transition-colors">{task.title}</h3>
                          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5 shadow-sm">
                            <User size={10} className="text-blue-400" />
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{task.author_name}</span>
                          </div>
                        </div>
                        <p className="text-slate-500 text-sm line-clamp-2 font-mono break-all leading-relaxed">{task.description || '無附加簡報資料。'}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* 詳情視窗 */}
        <AnimatePresence>
          {editingTask && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-12 bg-slate-950/95 backdrop-blur-2xl overflow-y-auto">
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900/50 border border-white/10 w-full max-w-6xl rounded-[4rem] shadow-2xl flex flex-col md:flex-row overflow-hidden h-full max-h-[90vh]">
                
                {/* 圖片輪播 */}
                <AnimatePresence mode="wait">
                  {isSidebarOpen && ((editingTask.image_urls && editingTask.image_urls.length > 0) || editingTask.image_url) && (
                    <motion.div key="sidebar" initial={{ width: 0, opacity: 0 }} animate={{ width: '50%', opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ type: 'spring', damping: 25 }} className="hidden md:flex bg-black/40 items-center justify-center relative border-r border-white/5 overflow-hidden p-12">
                      <div className="w-full h-full relative flex items-center justify-center">
                        <motion.img key={currentImgIdx} src={editingTask.image_urls?.[currentImgIdx] || editingTask.image_url} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full h-full object-contain drop-shadow-2xl cursor-zoom-in" onClick={() => setFullscreenImage(editingTask.image_urls?.[currentImgIdx] || editingTask.image_url!)} />
                        {editingTask.image_urls && editingTask.image_urls.length > 1 && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); setCurrentImgIdx(prev => (prev > 0 ? prev - 1 : editingTask.image_urls!.length - 1)) }} className="absolute left-4 p-4 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all"><ChevronLeft /></button>
                            <button onClick={(e) => { e.stopPropagation(); setCurrentImgIdx(prev => (prev < editingTask.image_urls!.length - 1 ? prev + 1 : 0)) }} className="absolute right-4 p-4 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all"><ChevronRight /></button>
                            <div className="absolute bottom-6 flex gap-2">{editingTask.image_urls.map((_, i) => <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === currentImgIdx ? 'bg-blue-500 w-6' : 'bg-white/20'}`} />)}</div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 內容區域 */}
                <div className={`p-10 md:p-20 flex flex-col overflow-y-auto custom-scrollbar transition-all duration-500 ${isSidebarOpen && ((editingTask.image_urls && editingTask.image_urls.length > 0) || editingTask.image_url) ? 'md:w-1/2' : 'w-full'}`}>
                  <div className="flex justify-between items-center mb-16">
                    <div className="flex items-center gap-4"><CheckCircle2 size={28} className="text-blue-500" /><h2 className="text-xs font-black text-slate-500 tracking-[0.4em] uppercase">任務情資詳情</h2></div>
                    <div className="flex items-center gap-5">
                      {((editingTask.image_urls && editingTask.image_urls.length > 0) || editingTask.image_url) && (
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-blue-400 transition-all">{isSidebarOpen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</button>
                      )}
                      {(isAdmin || editingTask.author_name === currentUser) && (
                        <button onClick={() => setIsEditMode(!isEditMode)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-emerald-400 transition-all">{isEditMode ? <Eye size={20} /> : <Edit3 size={20} />}</button>
                      )}
                      <button onClick={() => setEditingTask(null)} className="text-slate-600 hover:text-white transition-colors"><X size={36} /></button>
                    </div>
                  </div>

                  <div className="space-y-12 flex-1">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-xs font-black text-blue-500/60 ml-1">
                        {editingTask.author_name === 'Admin0726' && <ShieldCheck size={16} className="text-yellow-500" />}
                        <span className="tracking-[0.2em] uppercase">{editingTask.author_name} / 部署官</span>
                      </div>
                      <input id="edit-title" disabled={!isAdmin && editingTask.author_name !== currentUser} defaultValue={editingTask.title} className="w-full bg-transparent text-5xl font-black text-white outline-none border-b border-white/5 focus:border-blue-500 transition-all pb-4" />
                    </div>

                    <div className="space-y-8">
                      {isEditMode ? (
                        <textarea id="edit-desc" defaultValue={editingTask.description} rows={12} className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] p-10 outline-none focus:ring-1 focus:ring-blue-500/50 text-slate-300 font-mono text-sm leading-relaxed" />
                      ) : (
                        <div className="prose prose-invert prose-sm max-w-none prose-blue font-sans bg-white/[0.02] p-10 rounded-[3rem] border border-white/5 shadow-inner overflow-x-hidden break-words cursor-pointer hover:bg-white/[0.04] transition-all" onClick={() => (isAdmin || editingTask.author_name === currentUser) && setIsEditMode(true)}>
                          <div className="overflow-x-auto custom-scrollbar"><ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{editingTask.description || '*未提供詳細描述。*'}</ReactMarkdown></div>
                        </div>
                      )}
                    </div>

                    {/* 留言系統 */}
                    <div className="pt-16 border-t border-white/5 space-y-10">
                      <div className="flex items-center gap-4"><MessageSquare size={22} className="text-blue-500" /><h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">通訊紀錄 (COMMS)</h3></div>
                      
                      <div className="bg-white/[0.03] border border-white/5 p-8 rounded-[2.5rem] space-y-6 shadow-inner">
                        <textarea id="comment-input" placeholder={replyTo ? `正在回覆 ${replyTo.author_name}...` : "輸入更新情報或留言..."} className="w-full bg-transparent outline-none text-sm font-mono leading-relaxed" rows={3} />
                        <div className="flex justify-between items-center">
                          {replyTo && <button onClick={() => setReplyTo(null)} className="text-[10px] text-red-400 font-black uppercase tracking-widest">取消回覆</button>}
                          <button onClick={handlePostComment} className="ml-auto bg-white text-black px-8 py-3 rounded-2xl text-xs font-black uppercase hover:bg-blue-500 hover:text-white transition-all shadow-lg">發布更新</button>
                        </div>
                      </div>

                      <div className="space-y-8">
                        {editingTask.comments?.map((c: any) => (
                          <div key={c.id} className={`flex gap-5 ${c.parent_id ? 'ml-12 border-l border-white/10 pl-6' : ''}`}>
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/5">
                              {c.author_name === 'Admin0726' ? <ShieldCheck size={16} className="text-yellow-500" /> : <User size={16} className="text-slate-500" />}
                            </div>
                            <div className="flex-1 bg-white/[0.02] p-6 rounded-[2rem] border border-white/5 shadow-sm">
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{c.author_name}</span>
                                <button onClick={() => setReplyTo(c)} className="flex items-center gap-1.5 text-[10px] font-black text-slate-600 hover:text-blue-400 uppercase transition-all"><CornerDownRight size={12} /> 回覆</button>
                              </div>
                              <p className="text-sm text-slate-300 leading-relaxed break-words">{c.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-5 mt-20">
                    {(isAdmin || editingTask.author_name === currentUser) && (
                      <>
                        <button onClick={async () => {
                          const t = (document.getElementById('edit-title') as HTMLInputElement).value;
                          const d = isEditMode ? (document.getElementById('edit-desc') as HTMLTextAreaElement).value : (editingTask.description || '');
                          await updateTaskAction(editingTask.id, t, d, editingTask.status);
                          setEditingTask(null);
                        }} className="flex-1 bg-white text-black py-6 rounded-[2rem] font-black hover:bg-blue-600 hover:text-white transition-all shadow-2xl">更新戰術目標</button>
                        <button onClick={async () => { await deleteTaskAction(editingTask.id); setEditingTask(null); }} className="bg-red-500/10 text-red-500 px-12 py-6 rounded-[2rem] font-black border border-red-500/20 hover:bg-red-500 transition-all"><Trash2 size={24} /></button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 全螢幕預覽 */}
        <AnimatePresence>
          {fullscreenImage && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setFullscreenImage(null)} className="fixed inset-0 z-[100] bg-black/98 flex items-center justify-center p-4 cursor-zoom-out">
              <img src={fullscreenImage} className="max-w-full max-h-full object-contain" />
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        .text-shadow-glow { text-shadow: 0 0 30px rgba(59, 130, 246, 0.4); }
        .prose pre { white-space: pre-wrap; word-break: break-all; overflow-x: auto; max-width: 100%; }
        .prose table { display: block; overflow-x: auto; max-width: 100%; border-collapse: collapse; margin: 1.5em 0; }
        .prose th, .prose td { border: 1px solid rgba(255,255,255,0.1); padding: 12px; }
        .prose p { white-space: pre-wrap; margin-bottom: 1.2em; line-height: 1.8; }
        .prose a { color: #60a5fa; text-decoration: underline; text-underline-offset: 4px; font-weight: bold; }
      `}</style>
    </div>
  );
}
