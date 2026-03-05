// ai-task-dashboard/components/TaskDashboard.tsx
'use client';

import { useActionState, useOptimistic, useState, useEffect, useRef } from 'react';
import { createTaskAction, deleteTaskAction, updateTaskAction, addCommentAction, createCategoryAction, deleteCategoryAction } from '@/app/actions';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { motion, AnimatePresence } from 'framer-motion';
import imageCompression from 'browser-image-compression';
import { 
  Send, Image as ImageIcon, Trash2, 
  ChevronRight, ChevronLeft, X, LayoutGrid, 
  Activity, CheckCircle2, FileText, Maximize2, Minimize2, Layers, Edit3, Eye, Loader2, User, MessageSquare, ShieldCheck, CornerDownRight, LogOut, Paperclip, Lock, PlusCircle, Hash
} from 'lucide-react';

export type Task = { 
  id: string; title: string; description?: string; author_name: string; author_avatar: string;
  status: string; image_url?: string; image_urls?: string[]; category_id: number; is_sent: boolean;
  comments?: any[];
};

const DEFAULT_AVATARS = ['👤', '🤖', '🦊', '🐱', '🐼', '🐲', '🚀', '⭐', '💎', '🔥'];

export default function TaskDashboard({ initialTasks, categories }: { initialTasks: Task[], categories: any[] }) {
  const [state, formAction, isPending] = useActionState(createTaskAction, { success: true });
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentAvatar, setCurrentAvatar] = useState('👤');
  const [showAuth, setShowAuth] = useState(false);
  const [authError, setAuthError] = useState('');
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [compressedFiles, setCompressedFiles] = useState<File[]>([]);
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [commentImagePreviews, setCommentImagePreviews] = useState<string[]>([]);
  const [commentCompressedFiles, setCommentCompressedFiles] = useState<File[]>([]);
  const [isCommentCompressing, setIsCommentCompressing] = useState(false);

  // 初始化選取第一個分類
  useEffect(() => {
    if (categories.length > 0 && selectedCategoryId === null) {
      const workShowcase = categories.find(c => c.name === '作品發表區');
      setSelectedCategoryId(workShowcase ? workShowcase.id : categories[0].id);
    }
  }, [categories]);

  const [optimisticTasks, addOptimisticTask] = useOptimistic(
    initialTasks,
    (state, newTask: Task) => [newTask, ...state]
  );

  useEffect(() => {
    const savedUser = localStorage.getItem('task_user');
    const savedAvatar = localStorage.getItem('task_avatar');
    if (!savedUser) setShowAuth(true);
    else { setCurrentUser(savedUser); setCurrentAvatar(savedAvatar || '👤'); }
  }, []);

  const isAdmin = currentUser === 'Admin';

  const handleAuth = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('username') as string;
    const password = formData.get('password') as string;
    const avatar = formData.get('avatar') as string;

    if (name === 'Admin' && password !== 'Anx-6593') {
      setAuthError('管理員密碼錯誤');
      return;
    }

    localStorage.setItem('task_user', name);
    localStorage.setItem('task_avatar', avatar);
    setCurrentUser(name);
    setCurrentAvatar(avatar);
    setShowAuth(false);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, isComment = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (isComment) setIsCommentCompressing(true); else setIsCompressing(true);
    try {
      const results = await Promise.all(Array.from(files).slice(0, 3).map(async (file) => {
        const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1280 });
        return { finalFile: new File([compressed], file.name, { type: file.type }), preview: await imageCompression.getDataUrlFromFile(compressed) };
      }));
      if (isComment) { setCommentCompressedFiles(results.map(r => r.finalFile)); setCommentImagePreviews(results.map(r => r.preview)); }
      else { setCompressedFiles(results.map(r => r.finalFile)); setImagePreviews(results.map(r => r.preview)); }
    } finally { setIsCommentCompressing(false); setIsCompressing(false); }
  };

  const handlePostComment = async () => {
    const input = document.getElementById('comment-input') as HTMLTextAreaElement;
    if (!input || !input.value || !editingTask) return;
    const content = input.value;
    const formData = new FormData();
    formData.append('task_id', editingTask.id);
    formData.append('author_name', currentUser!);
    formData.append('author_avatar', currentAvatar);
    formData.append('content', content);
    formData.append('parent_id', replyTo?.id || 'null');
    commentCompressedFiles.forEach(f => formData.append('comment_images', f));

    const newComment = { id: Math.random().toString(), author_name: currentUser, author_avatar: currentAvatar, content, parent_id: replyTo?.id || null, image_urls: commentImagePreviews, created_at: new Date().toISOString() };
    setEditingTask({ ...editingTask, comments: [...(editingTask.comments || []), newComment] });
    await addCommentAction(formData);
    input.value = ''; setReplyTo(null); setCommentImagePreviews([]); setCommentCompressedFiles([]);
  };

  const filteredTasks = optimisticTasks.filter(t => t.category_id === selectedCategoryId);

  const renderComments = (comments: any[], parentId: any = null, depth = 0) => {
    return comments.filter(c => c.parent_id == parentId).map(c => (
      <div key={c.id} className={`${depth > 0 ? 'ml-8 md:ml-12 border-l border-white/5 pl-4 md:pl-6' : ''} space-y-4`}>
        <div className="bg-white/[0.03] p-5 rounded-[2rem] border border-white/5 relative group">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{c.author_avatar || '👤'}</span>
              <span className={`text-[10px] font-black uppercase tracking-widest ${c.author_name === 'Admin' ? 'text-yellow-500' : 'text-slate-300'}`}>{c.author_name}</span>
              {c.author_name === 'Admin' && <ShieldCheck size={12} className="text-yellow-500" />}
            </div>
            <button onClick={() => { setReplyTo(c); document.getElementById('comment-input')?.focus(); }} className="text-[8px] font-black text-slate-600 hover:text-blue-400 uppercase flex items-center gap-1"><CornerDownRight size={10} /> 回覆</button>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed mb-4 whitespace-pre-wrap">{c.content}</p>
          {c.image_urls && c.image_urls.length > 0 && (
            <div className="flex gap-2 mb-2 overflow-x-auto pb-2 custom-scrollbar">
              {c.image_urls.map((url: string, i: number) => (
                <img key={i} src={url} onClick={() => setFullscreenImage(url)} className="h-20 w-20 object-cover rounded-xl border border-white/10 cursor-zoom-in" />
              ))}
            </div>
          )}
        </div>
        {renderComments(comments, c.id, depth + 1)}
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-blue-500/30 font-sans">
      <div className="fixed inset-0 pointer-events-none opacity-20"><div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[150px]" /><div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px]" /></div>

      <AnimatePresence>
        {showAuth && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900 border border-white/10 p-10 rounded-[3.5rem] w-full max-w-md shadow-2xl">
              <h2 className="text-3xl font-black mb-8 italic text-center">INITIALIZE ACCESS</h2>
              <form onSubmit={handleAuth} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 tracking-widest uppercase text-center block">Select Avatar</label>
                  <div className="grid grid-cols-5 gap-3">
                    {DEFAULT_AVATARS.map(emoji => (
                      <button key={emoji} type="button" onClick={() => setCurrentAvatar(emoji)} className={`text-2xl p-2 rounded-xl transition-all ${currentAvatar === emoji ? 'bg-blue-600 scale-110 shadow-lg' : 'bg-white/5 hover:bg-white/10'}`}>{emoji}</button>
                    ))}
                  </div>
                  <input type="hidden" name="avatar" value={currentAvatar} />
                </div>
                <div className="space-y-4">
                  <input name="username" placeholder="Codename..." onChange={(e) => { if(e.target.value === 'Admin') setAuthError('需要管理員授權'); else setAuthError(''); }} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-center text-lg font-bold outline-none" required />
                  <AnimatePresence>
                    {authError === '需要管理員授權' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-4 overflow-hidden">
                        <div className="flex items-center gap-2 text-yellow-500 text-[10px] font-black uppercase tracking-widest justify-center"><Lock size={12} /> Administrator Verification Required</div>
                        <input name="password" type="password" placeholder="Access Key..." className="w-full bg-yellow-500/10 border border-yellow-500/20 rounded-2xl px-6 py-4 text-center text-lg font-bold outline-none text-yellow-500" required />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {authError && authError !== '需要管理員授權' && <p className="text-red-400 text-[10px] text-center font-bold uppercase">{authError}</p>}
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-3xl font-black tracking-widest transition-all">ESTABLISH LINK</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto p-6 md:p-12 relative z-10">
        <div className="flex justify-end mb-10"><div className="flex items-center gap-4 px-5 py-2.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-xl shadow-lg">{isAdmin ? <ShieldCheck size={16} className="text-yellow-500" /> : <span className="text-xl">{currentAvatar}</span>}<span className={`text-xs font-black uppercase tracking-widest ${isAdmin ? 'text-yellow-500' : 'text-slate-300'}`}>{currentUser}</span><div className="w-[1px] h-4 bg-white/10"></div><button onClick={() => { localStorage.removeItem('task_user'); window.location.reload(); }} className="text-[10px] text-slate-500 hover:text-red-400 font-black">LOGOUT</button></div></div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* 左側邊欄：輸入與討論區 */}
          <div className="lg:col-span-4 space-y-8">
            <motion.header initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h1 className="text-5xl font-black italic text-shadow-glow leading-none">AI COMMAND</h1>
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-blue-400 mt-3">Tactical Operations Network</p>
            </motion.header>

            <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem] backdrop-blur-2xl shadow-2xl space-y-6">
              <form action={async (formData) => {
                const title = formData.get('title') as string;
                if (!title || !selectedCategoryId) return;
                formData.append('author_name', currentUser!);
                formData.append('author_avatar', currentAvatar);
                formData.append('category_id', selectedCategoryId.toString());
                formData.delete('image');
                compressedFiles.forEach(f => formData.append('image', f));
                addOptimisticTask({ id: Math.random().toString(), title, description: formData.get('description') as string, author_name: currentUser!, author_avatar: currentAvatar, category_id: selectedCategoryId, status: 'Active', is_sent: false, image_url: imagePreviews[0], image_urls: imagePreviews });
                await formAction(formData);
                setImagePreviews([]); setCompressedFiles([]); (document.getElementById('task-form') as HTMLFormElement).reset();
              }} id="task-form" className="space-y-6">
                <input name="title" placeholder="Objective Headline..." className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-lg font-bold outline-none" required />
                <textarea name="description" placeholder="Intel log (Markdown)..." rows={4} className="w-full bg-black/20 border border-white/10 rounded-2xl px-6 py-4 outline-none resize-none text-sm font-mono" />
                <div className="relative cursor-pointer bg-black/40 border border-white/10 rounded-2xl p-4 flex items-center justify-center gap-3 overflow-hidden">
                  <input type="file" multiple accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleImageChange} />
                  {imagePreviews.length > 0 && <img src={imagePreviews[0]} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-[1px]" />}
                  {isCompressing ? <Loader2 className="animate-spin text-blue-400" /> : <ImageIcon size={18} className={imagePreviews.length > 0 ? 'text-blue-400' : 'text-slate-600'} />}
                  <span className="text-[10px] font-black uppercase text-slate-500 z-20">{imagePreviews.length > 0 ? `${imagePreviews.length} Media Ready` : 'Add Media'}</span>
                </div>
                <button type="submit" disabled={isPending || isCompressing} className="w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-3xl font-black shadow-xl">DEPLOY MISSION</button>
              </form>
            </div>

            {/* 討論區導覽 */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between px-4">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sector Navigation</h3>
                {isAdmin && <button onClick={async () => { const name = prompt('輸入新討論區名稱:'); if(name) await createCategoryAction(name); }} className="text-blue-400 hover:text-blue-300"><PlusCircle size={16} /></button>}
              </div>
              <div className="space-y-2">
                {categories.map(cat => (
                  <button key={cat.id} onClick={() => setSelectedCategoryId(cat.id)} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all border ${selectedCategoryId === cat.id ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-900/20 translate-x-2' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                    <div className="flex items-center gap-3">
                      <Hash size={14} className={selectedCategoryId === cat.id ? 'text-white' : 'text-slate-500'} />
                      <span className={`text-sm font-bold ${selectedCategoryId === cat.id ? 'text-white' : 'text-slate-400'}`}>{cat.name}</span>
                    </div>
                    {isAdmin && <Trash2 size={12} className="text-white/20 hover:text-red-400" onClick={(e) => { e.stopPropagation(); if(confirm('確定刪除？')) deleteCategoryAction(cat.id); }} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 右側：主內容串流 */}
          <div className="lg:col-span-8 space-y-8">
            <div className="flex items-center gap-3 px-4">
              <Activity size={16} className="text-emerald-400" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Live Mission Stream / {categories.find(c => c.id === selectedCategoryId)?.name}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredTasks.map((task, idx) => (
                  <motion.div layout key={task.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }} onClick={() => { setEditingTask(task); setIsSidebarOpen(true); setCurrentImgIdx(0); setIsEditMode(false); }} className="group cursor-pointer bg-white/[0.03] border border-white/5 hover:border-blue-500/40 p-6 rounded-[2.5rem] transition-all duration-500 hover:bg-white/[0.05] relative shadow-xl flex flex-col gap-5">
                    {((task.image_urls && task.image_urls.length > 0) || task.image_url) ? (
                      <div className="w-full h-48 rounded-3xl overflow-hidden border border-white/10 bg-black/40 relative shadow-inner">
                        <img src={task.image_urls?.[0] || task.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        {task.image_urls && task.image_urls.length > 1 && <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md p-2 rounded-xl border border-white/10"><Layers size={14} className="text-white" /></div>}
                      </div>
                    ) : null}
                    <div>
                      <div className="flex justify-between items-start mb-3 gap-4">
                        <h3 className="font-black text-2xl text-white tracking-tight leading-tight line-clamp-2">{task.title}</h3>
                        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5 flex-shrink-0">
                          <span className="text-[14px]">{task.author_avatar}</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{task.author_name}</span>
                        </div>
                      </div>
                      <p className="text-slate-500 text-sm line-clamp-3 font-mono leading-relaxed">{task.description || 'No additional briefing.'}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Details Modal */}
        <AnimatePresence>
          {editingTask && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-12 bg-slate-950/95 backdrop-blur-2xl overflow-y-auto">
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900/50 border border-white/10 w-full max-w-6xl rounded-[4rem] shadow-2xl flex flex-col md:flex-row overflow-hidden h-full max-h-[90vh]">
                <AnimatePresence mode="wait">
                  {isSidebarOpen && ((editingTask.image_urls && editingTask.image_urls.length > 0) || editingTask.image_url) && (
                    <motion.div key="sidebar" initial={{ width: 0 }} animate={{ width: '50%' }} exit={{ width: 0 }} className="hidden md:flex bg-black/40 items-center justify-center relative border-r border-white/5 overflow-hidden p-12">
                      <div className="w-full h-full relative flex items-center justify-center">
                        <motion.img key={currentImgIdx} src={editingTask.image_urls?.[currentImgIdx] || editingTask.image_url} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full h-full object-contain drop-shadow-2xl cursor-zoom-in" onClick={() => setFullscreenImage(editingTask.image_urls?.[currentImgIdx] || editingTask.image_url!)} />
                        {editingTask.image_urls && editingTask.image_urls.length > 1 && (
                          <div className="absolute bottom-6 flex gap-2">{editingTask.image_urls.map((_, i) => <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === currentImgIdx ? 'bg-blue-500 w-6' : 'bg-white/20'}`} />)}</div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className={`p-10 md:p-20 flex flex-col overflow-y-auto custom-scrollbar transition-all duration-500 ${isSidebarOpen && ((editingTask.image_urls && editingTask.image_urls.length > 0) || editingTask.image_url) ? 'md:w-1/2' : 'w-full'}`}>
                  <div className="flex justify-between items-center mb-16">
                    <div className="flex items-center gap-4"><CheckCircle2 size={28} className="text-blue-500" /><h2 className="text-xs font-black text-slate-500 tracking-[0.4em] uppercase">Intelligence Detail</h2></div>
                    <div className="flex items-center gap-5">
                      {((editingTask.image_urls && editingTask.image_urls.length > 0) || editingTask.image_url) && <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3 bg-white/5 rounded-2xl text-blue-400 transition-all">{isSidebarOpen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</button>}
                      {(isAdmin || editingTask.author_name === currentUser) && <button onClick={() => setIsEditMode(!isEditMode)} className="p-3 bg-white/5 rounded-2xl text-emerald-400 transition-all">{isEditMode ? <Eye size={20} /> : <Edit3 size={20} />}</button>}
                      <button onClick={() => setEditingTask(null)} className="text-slate-600 hover:text-white transition-colors"><X size={36} /></button>
                    </div>
                  </div>

                  <div className="space-y-12 flex-1">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-xs font-black text-blue-500/60 ml-1 italic">{editingTask.author_avatar} @{editingTask.author_name} / DEPLOY_OFFICER</div>
                      <input id="edit-title" disabled={!isAdmin && editingTask.author_name !== currentUser} defaultValue={editingTask.title} className="w-full bg-transparent text-5xl font-black text-white outline-none border-b border-white/5 focus:border-blue-500 transition-all pb-4" />
                    </div>
                    <div className="space-y-8">
                      {isEditMode ? <textarea id="edit-desc" defaultValue={editingTask.description} rows={12} className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] p-10 outline-none focus:ring-1 focus:ring-blue-500/50 text-slate-300 font-mono text-sm leading-relaxed" /> : <div className="prose prose-invert prose-sm max-w-none prose-blue font-sans bg-white/[0.02] p-10 rounded-[3rem] border border-white/5 shadow-inner overflow-x-hidden break-words cursor-pointer hover:bg-white/[0.04] transition-all" onClick={() => (isAdmin || editingTask.author_name === currentUser) && setIsEditMode(true)}><ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{editingTask.description || ''}</ReactMarkdown></div>}
                    </div>

                    <div className="pt-16 border-t border-white/5 space-y-12">
                      <div className="flex items-center gap-4"><MessageSquare size={22} className="text-blue-500" /><h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">Comm Log (COMMS)</h3></div>
                      <div className="bg-white/[0.03] border border-white/5 p-8 rounded-[3rem] space-y-6 shadow-inner relative overflow-hidden">
                        {replyTo && <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2 mb-2"><CornerDownRight size={12} /> Replying to {replyTo.author_name}</div>}
                        <textarea id="comment-input" placeholder="Input update..." className="w-full bg-transparent outline-none text-sm font-mono leading-relaxed" rows={3} />
                        <div className="flex justify-between items-center pt-4 border-t border-white/5">
                          <div className="relative cursor-pointer hover:text-white transition-colors"><input type="file" multiple accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageChange(e, true)} /><Paperclip size={18} className={commentImagePreviews.length > 0 ? 'text-emerald-400' : 'text-slate-500'} /></div>
                          <div className="flex gap-4 items-center">{replyTo && <button onClick={() => setReplyTo(null)} className="text-[10px] text-red-400 font-black uppercase">Cancel</button>}<button onClick={handlePostComment} disabled={isCommentCompressing} className="bg-white text-black px-10 py-3 rounded-2xl text-xs font-black uppercase hover:bg-blue-500 hover:text-white transition-all shadow-lg">{isCommentCompressing ? '...' : 'SEND'}</button></div>
                        </div>
                      </div>
                      <div className="space-y-8 pb-20">{renderComments(editingTask.comments || [])}</div>
                    </div>
                  </div>

                  <div className="flex gap-5 mt-20">
                    {(isAdmin || editingTask.author_name === currentUser) && (
                      <><button onClick={async () => { await updateTaskAction(editingTask.id, (document.getElementById('edit-title') as HTMLInputElement).value, (document.getElementById('edit-desc') as HTMLTextAreaElement).value, editingTask.status); setEditingTask(null); }} className="flex-1 bg-white text-black py-6 rounded-[2rem] font-black hover:bg-blue-600 hover:text-white transition-all shadow-2xl">COMMIT UPDATE</button><button onClick={async () => { await deleteTaskAction(editingTask.id); setEditingTask(null); }} className="bg-red-500/10 text-red-500 px-12 py-6 rounded-[2rem] font-black border border-red-500/20 hover:bg-red-500 transition-all"><Trash2 size={24} /></button></>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>{fullscreenImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setFullscreenImage(null)} className="fixed inset-0 z-[100] bg-black/98 flex items-center justify-center p-4 cursor-zoom-out"><img src={fullscreenImage} className="max-w-full max-h-full object-contain" /></motion.div>
        )}</AnimatePresence>
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
        .prose a { color: #60a5fa; text-decoration: underline; font-weight: bold; }
      `}</style>
    </div>
  );
}
