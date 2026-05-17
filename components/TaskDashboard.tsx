// ai-task-dashboard/components/TaskDashboard.tsx
'use client';

import { useActionState, useOptimistic, useState, useEffect, useRef } from 'react';
import { createTaskAction, deleteTaskAction, updateTaskAction, addCommentAction, createCategoryAction, deleteCategoryAction, toggleLikeAction, appendImageToTaskAction, type ActionResult } from '@/app/actions';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { motion, AnimatePresence } from 'framer-motion';
import imageCompression from 'browser-image-compression';
import {
  Send, Image as ImageIcon, Trash2,
  ChevronRight, ChevronLeft, X, LayoutGrid,
  Activity, CheckCircle2, FileText, Maximize2, Minimize2, Layers, Edit3, Eye, Loader2, User, MessageSquare, ShieldCheck, CornerDownRight, LogOut, Paperclip, Lock, PlusCircle, Hash, Heart
} from 'lucide-react';

export type Task = {
  id: string; title: string; description?: string; author_name: string; author_avatar: string;
  status: string; image_url?: string; image_urls?: string[]; category_id: number; is_sent: boolean;
  comments?: any[]; likes?: any[]; last_activity_at?: string;
};

const DEFAULT_AVATARS = ['👤', '🤖', '🦊', '🐱', '🐼', '🐲', '🚀', '⭐', '💎', '🔥'];

export default function TaskDashboard({ initialTasks, categories }: { initialTasks: Task[], categories: any[] }) {
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(createTaskAction, { success: true });
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

  const [editingTaskImageUrls, setEditingTaskImageUrls] = useState<string[]>([]);
  const [editingNewImagePreviews, setEditingNewImagePreviews] = useState<string[]>([]);
  const [editingNewCompressedFiles, setEditingNewCompressedFiles] = useState<File[]>([]);

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (categories.length > 0 && selectedCategoryId === null) {
      const workShowcase = categories.find(c => c.name === '作品發表區');
      setSelectedCategoryId(workShowcase ? workShowcase.id : categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    if (editingTask) {
      setEditingTaskImageUrls(editingTask.image_urls || (editingTask.image_url ? [editingTask.image_url] : []));
      setEditingNewImagePreviews([]);
      setEditingNewCompressedFiles([]);
    }
  }, [editingTask]);

  const [optimisticTasks, addOptimisticTask] = useOptimistic(
    initialTasks,
    (state, action: any) => {
      if (typeof action === 'function') return action(state);
      return [action, ...state];
    }
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

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'create' | 'edit' | 'comment' = 'create') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (type === 'comment') setIsCommentCompressing(true); else setIsCompressing(true);

    try {
      const results = await Promise.all(Array.from(files).map(async (file) => {
        // 智慧壓縮邏輯：小於 0.5MB (512KB) 直接上傳原檔，確保文字清晰
        if (file.size < 0.5 * 1024 * 1024) {
          return {
            finalFile: file,
            preview: await imageCompression.getDataUrlFromFile(file)
          };
        }

        // 超過 0.5MB 才壓縮，目標 1MB, 解析度 1920px
        const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
        return {
          finalFile: new File([compressed], file.name, { type: file.type }),
          preview: await imageCompression.getDataUrlFromFile(compressed)
        };
      }));

      if (type === 'comment') {
        setCommentCompressedFiles(prev => [...prev, ...results.map(r => r.finalFile)]);
        setCommentImagePreviews(prev => [...prev, ...results.map(r => r.preview)]);
      } else if (type === 'edit') {
        setEditingNewCompressedFiles(prev => [...prev, ...results.map(r => r.finalFile)]);
        setEditingNewImagePreviews(prev => [...prev, ...results.map(r => r.preview)]);
      } else {
        setCompressedFiles(prev => [...prev, ...results.map(r => r.finalFile)]);
        setImagePreviews(prev => [...prev, ...results.map(r => r.preview)]);
      }
    } finally {
      setIsCommentCompressing(false);
      setIsCompressing(false);
      e.target.value = ''; // Reset input to allow same file selection
    }
  };

  const handleRemoveImage = (index: number, type: 'create' | 'edit' | 'comment' = 'create') => {
    if (type === 'comment') {
      setCommentCompressedFiles(prev => prev.filter((_, i) => i !== index));
      setCommentImagePreviews(prev => prev.filter((_, i) => i !== index));
    } else if (type === 'edit') {
      setEditingNewCompressedFiles(prev => prev.filter((_, i) => i !== index));
      setEditingNewImagePreviews(prev => prev.filter((_, i) => i !== index));
    } else {
      setCompressedFiles(prev => prev.filter((_, i) => i !== index));
      setImagePreviews(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    if (!title || !selectedCategoryId) return;

    // 關鍵修改：發布時先不帶圖片文件，避免 Payload 過大
    const tempFormData = new FormData();
    tempFormData.append('title', title);
    tempFormData.append('description', description || '');
    tempFormData.append('author_name', currentUser!);
    tempFormData.append('author_avatar', currentAvatar);
    tempFormData.append('category_id', selectedCategoryId.toString());

    addOptimisticTask({
      id: Math.random().toString(),
      title,
      description,
      author_name: currentUser!,
      author_avatar: currentAvatar,
      category_id: selectedCategoryId,
      status: 'Pending',
      is_sent: false,
      image_url: imagePreviews[0] || undefined,
      image_urls: imagePreviews,
      last_activity_at: new Date().toISOString(),
      likes: []
    });

    // 1. 先建立貼文獲取 ID
    const res = await createTaskAction(null, tempFormData);

    if (res.success && res.taskId && compressedFiles.length > 0) {
      // 2. 序列化一張一張上傳圖片
      for (const file of compressedFiles) {
        await appendImageToTaskAction(res.taskId, file);
      }
    }

    setImagePreviews([]);
    setCompressedFiles([]);
    formRef.current?.reset();
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;
    const title = (document.getElementById('edit-title') as HTMLInputElement).value;
    const description = (document.getElementById('edit-desc') as HTMLTextAreaElement).value;

    const formData = new FormData();
    formData.append('id', editingTask.id);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('status', editingTask.status);

    editingTaskImageUrls.forEach(url => formData.append('existing_image_urls', url));
    editingNewCompressedFiles.forEach(file => formData.append('image', file));

    await updateTaskAction(formData);
    setEditingTask(null);
    setIsEditMode(false);
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

    const newComment = { id: Math.random().toString(), author_name: currentUser, author_avatar: currentAvatar, content, parent_id: replyTo?.id || null, image_urls: commentImagePreviews, created_at: new Date().toISOString(), likes: [] };
    setEditingTask({ ...editingTask, comments: [...(editingTask.comments || []), newComment] });
    await addCommentAction(formData);
    input.value = ''; setReplyTo(null); setCommentImagePreviews([]); setCommentCompressedFiles([]);
  };

  const handleToggleLike = async (id: string | number, type: 'task' | 'comment') => {
    if (!currentUser) return;
    const res = await toggleLikeAction(id, type, { name: currentUser, avatar: currentAvatar });

    if (res.success && res.likes) {
      // 1. 更新詳情視窗狀態
      if (editingTask) {
        if (type === 'task' && editingTask.id === id) {
          setEditingTask({ ...editingTask, likes: res.likes });
        } else if (type === 'comment') {
          const updatedComments = editingTask.comments?.map(c =>
            c.id === id ? { ...c, likes: res.likes } : c
          );
          setEditingTask({ ...editingTask, comments: updatedComments });
        }
      }

      // 2. 同步更新主頁面樂觀列表
      if (type === 'task') {
        addOptimisticTask((prevTasks: Task[]) =>
          prevTasks.map(t => t.id === id ? { ...t, likes: res.likes, last_activity_at: new Date().toISOString() } : t)
        );
      }
    }
  };

  const filteredTasks = optimisticTasks
    .filter(t => t.category_id === selectedCategoryId)
    .sort((a, b) => new Date(b.last_activity_at || 0).getTime() - new Date(a.last_activity_at || 0).getTime());

  const renderComments = (comments: any[], parentId: any = null, depth = 0) => {
    return comments.filter(c => c.parent_id == parentId).map(c => (
      <div key={c.id} className={`${depth > 0 ? 'ml-8 md:ml-12 border-l border-black/10 pl-4 md:pl-6' : ''} space-y-4`}>
        <div className="bg-[#fbfaf7] p-5 rounded-[2rem] border border-black/[0.07] relative group">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{c.author_avatar || '👤'}</span>
              <span className={`text-[10px] font-black uppercase tracking-widest ${c.author_name === 'Admin' ? 'text-yellow-600' : 'text-[#3d3a35]'}`}>{c.author_name}</span>
              {c.author_name === 'Admin' && <ShieldCheck size={12} className="text-yellow-600" />}
            </div>
            <button onClick={() => { setReplyTo(c); document.getElementById('comment-input')?.focus(); }} className="text-[8px] font-black text-[#a3a299] hover:text-[#d97757] uppercase flex items-center gap-1"><CornerDownRight size={10} /> 回覆</button>
          </div>
          <p className="text-sm text-[#5e5d58] leading-relaxed mb-4 whitespace-pre-wrap">{c.content}</p>
          {c.image_urls && c.image_urls.length > 0 && (
            <div className="flex gap-2 mb-2 overflow-x-auto pb-2 custom-scrollbar">
              {c.image_urls.map((url: string, i: number) => (
                <img key={i} src={url} onClick={() => setFullscreenImage(url)} className="h-20 w-20 object-cover rounded-xl border border-black/10 cursor-zoom-in" />
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={(e) => { e.stopPropagation(); handleToggleLike(c.id, 'comment'); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${c.likes?.some((l: any) => l.name === currentUser) ? 'bg-pink-500/15 text-pink-600' : 'bg-[#f4f3ec] text-[#91918a] hover:bg-[#ecebe2]'}`}
            >
              <Heart size={12} fill={c.likes?.some((l: any) => l.name === currentUser) ? 'currentColor' : 'none'} />
              <span className="text-[10px] font-black">{c.likes?.length || 0}</span>
            </button>
            {c.likes && c.likes.length > 0 && (
              <div className="flex -space-x-2">
                {c.likes.slice(0, 5).map((l: any, i: number) => (
                  <div key={i} title={l.name} className="w-5 h-5 rounded-full bg-[#f0efe8] border border-white flex items-center justify-center text-[10px] shadow-sm cursor-help">{l.avatar}</div>
                ))}
                {c.likes.length > 5 && <div className="w-5 h-5 rounded-full bg-[#e5e3da] border border-white flex items-center justify-center text-[8px] text-[#5e5d58]">+{c.likes.length - 5}</div>}
              </div>
            )}
          </div>
        </div>
        {renderComments(comments, c.id, depth + 1)}
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-[#f4f3ed] text-[#3d3a35] selection:bg-[#d97757]/25 font-sans">
      <div className="fixed inset-0 pointer-events-none opacity-60"><div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#d97757]/15 blur-[150px]" /><div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#e8b59c]/20 blur-[150px]" /></div>

      <AnimatePresence>
        {showAuth && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-[#262625]/35 backdrop-blur-md p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white border border-black/[0.08] p-10 rounded-[3.5rem] w-full max-w-md shadow-2xl">
              <h2 className="text-2xl font-black mb-8 italic text-center uppercase tracking-tighter text-[#262625]">Initialize Access</h2>
              <form onSubmit={handleAuth} className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-[#91918a] tracking-widest uppercase text-center block">選擇頭像 (Select Avatar)</label>
                  <div className="grid grid-cols-5 gap-4">
                    {DEFAULT_AVATARS.map(emoji => (
                      <button key={emoji} type="button" onClick={() => setCurrentAvatar(emoji)} className={`text-2xl aspect-square flex items-center justify-center rounded-2xl transition-all ${currentAvatar === emoji ? 'bg-[#d97757] scale-110 shadow-lg' : 'bg-black/[0.04] hover:bg-black/[0.07]'}`}>{emoji}</button>
                    ))}
                  </div>
                  <input type="hidden" name="avatar" value={currentAvatar} />
                </div>
                <div className="space-y-4">
                  <input name="username" placeholder="輸入名稱 (Codename)..." onChange={(e) => { if(e.target.value === 'Admin') setAuthError('需要管理員授權'); else setAuthError(''); }} className="w-full bg-[#f4f3ec] border border-black/10 rounded-2xl px-6 py-4 text-center text-lg font-bold outline-none transition-all text-[#262625]" required />
                  <AnimatePresence>
                    {authError === '需要管理員授權' && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-4 overflow-hidden">
                        <input name="password" type="password" placeholder="輸入密碼 (Access Key)..." className="w-full bg-amber-500/10 border border-amber-500/30 rounded-2xl px-6 py-4 text-center text-lg font-bold outline-none text-amber-700" required />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {authError && authError !== '需要管理員授權' && <p className="text-red-500 text-[10px] text-center font-bold uppercase">{authError}</p>}
                </div>
                <button type="submit" className="w-full bg-[#d97757] hover:bg-[#c2603f] text-white py-5 rounded-3xl font-black tracking-widest transition-all">ESTABLISH LINK</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto p-6 md:p-12 relative z-10">
        <div className="flex justify-end mb-10"><div className="flex items-center gap-4 px-5 py-2.5 bg-white border border-black/[0.08] rounded-full backdrop-blur-xl shadow-lg">{isAdmin ? <ShieldCheck size={16} className="text-yellow-600" /> : <span className="text-xl">{currentAvatar}</span>}<span className={`text-xs font-black uppercase tracking-widest ${isAdmin ? 'text-yellow-600' : 'text-[#3d3a35]'}`}>{currentUser}</span><div className="w-[1px] h-4 bg-black/10"></div><button onClick={() => { localStorage.removeItem('task_user'); window.location.reload(); }} className="text-[10px] text-[#91918a] hover:text-red-500 font-black">LOGOUT</button></div></div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

          <div className="lg:col-span-4 space-y-8">
            <motion.header initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <h1 className="text-5xl font-black italic text-shadow-glow leading-none text-[#262625]">AI COMMAND</h1>
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-[#bd5d3e] mt-3">Tactical Operations Network</p>
            </motion.header>

            <div className="bg-white border border-black/[0.07] p-8 rounded-[3rem] backdrop-blur-2xl shadow-xl space-y-6">
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#91918a] tracking-widest px-2 uppercase">主題名稱</label>
                  <input name="title" placeholder="輸入主題..." className="w-full bg-[#f4f3ec] border border-black/10 rounded-2xl px-6 py-4 text-lg font-bold outline-none focus:ring-2 focus:ring-[#d97757]/40 transition-all text-[#262625]" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#91918a] tracking-widest px-2 uppercase">貼文內容 (Markdown)</label>
                  <textarea name="description" placeholder="輸入詳細內容..." rows={4} className="w-full bg-[#f4f3ec] border border-black/10 rounded-2xl px-6 py-4 outline-none resize-none text-sm font-mono leading-relaxed focus:ring-2 focus:ring-[#d97757]/40 transition-all text-[#3d3a35]" />
                </div>

                {imagePreviews.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {imagePreviews.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-black/10 group">
                        <img src={url} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => handleRemoveImage(i, 'create')} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-red-300 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="relative cursor-pointer bg-[#f4f3ec] border border-black/10 rounded-2xl p-4 flex items-center justify-center gap-3 overflow-hidden group hover:bg-[#ecebe2] transition-all">
                  <input type="file" multiple accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => handleImageChange(e, 'create')} />
                  {isCompressing ? <Loader2 className="animate-spin text-[#d97757]" /> : <ImageIcon size={18} className={imagePreviews.length > 0 ? 'text-[#d97757]' : 'text-[#a3a299]'} />}
                  <span className="text-[10px] font-black uppercase text-[#91918a] z-20">{isCompressing ? '優化中...' : '添加圖片'}</span>
                </div>
                <button type="submit" disabled={isPending || isCompressing} className="w-full bg-[#d97757] hover:bg-[#c2603f] text-white py-5 rounded-3xl font-black shadow-xl transition-all active:scale-95">發布任務 (DEPLOY)</button>
              </form>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between px-4">
                <h3 className="text-[10px] font-black text-[#91918a] uppercase tracking-widest text-shadow-glow">討論區選單 (Sectors)</h3>
                {isAdmin && <button onClick={async () => { const name = prompt('輸入新討論區名稱:'); if(name) await createCategoryAction(name); }} className="text-[#d97757] hover:text-[#c2603f] transition-all"><PlusCircle size={16} /></button>}
              </div>
              <div className="space-y-2">
                {categories.map(cat => (
                  <button key={cat.id} onClick={() => setSelectedCategoryId(cat.id)} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all border ${selectedCategoryId === cat.id ? 'bg-[#d97757] border-[#d97757] shadow-lg translate-x-2' : 'bg-white border-black/[0.07] hover:bg-[#ecebe2]'}`}>
                    <div className="flex items-center gap-3">
                      <Hash size={14} className={selectedCategoryId === cat.id ? 'text-white' : 'text-[#91918a]'} />
                      <span className={`text-sm font-bold ${selectedCategoryId === cat.id ? 'text-white' : 'text-[#5e5d58]'}`}>{cat.name}</span>
                    </div>
                    {isAdmin && <Trash2 size={12} className="text-black/20 hover:text-red-500" onClick={(e) => { e.stopPropagation(); if(confirm('確定刪除？')) deleteCategoryAction(cat.id); }} />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-8">
            <div className="flex items-center gap-3 px-4">
              <Activity size={16} className="text-emerald-600 animate-pulse" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#91918a]">{categories.find(c => c.id === selectedCategoryId)?.name} / 即時串流</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
              <AnimatePresence mode="popLayout">
                {filteredTasks.map((task, idx) => (
                  <motion.div layout key={task.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }} onClick={() => { setEditingTask(task); setIsSidebarOpen(true); setCurrentImgIdx(0); setIsEditMode(false); }} className="group cursor-pointer bg-white border border-black/[0.07] hover:border-[#d97757]/50 p-6 rounded-[2.5rem] transition-all duration-500 hover:bg-[#fdfcf9] relative shadow-md flex flex-col gap-5">
                    {((task.image_urls && task.image_urls.length > 0) || task.image_url) ? (
                      <div className="w-full h-48 rounded-3xl overflow-hidden border border-black/[0.07] bg-[#f4f3ec] relative shadow-inner">
                        <img src={task.image_urls?.[0] || task.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        {task.image_urls && task.image_urls.length > 1 && <div className="absolute top-3 right-3 bg-black/55 backdrop-blur-md p-2 rounded-xl border border-white/10"><Layers size={14} className="text-white" /></div>}
                      </div>
                    ) : null}
                    <div>
                      <div className="flex justify-between items-start mb-3 gap-4">
                        <h3 className="font-black text-2xl text-[#262625] tracking-tight leading-tight line-clamp-2">{task.title}</h3>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2 px-3 py-1 bg-[#f4f3ec] rounded-full border border-black/[0.06] flex-shrink-0 shadow-sm">
                            <span className="text-[14px]">{task.author_avatar}</span>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${task.author_name === 'Admin' ? 'text-yellow-600' : 'text-[#6f6e69]'}`}>{task.author_name}</span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleLike(task.id, 'task'); }}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all ${task.likes?.some((l: any) => l.name === currentUser) ? 'bg-pink-500/15 text-pink-600' : 'bg-[#f4f3ec] text-[#91918a] hover:bg-[#ecebe2]'}`}
                          >
                            <Heart size={10} fill={task.likes?.some((l: any) => l.name === currentUser) ? 'currentColor' : 'none'} />
                            <span className="text-[9px] font-black">{task.likes?.length || 0}</span>
                          </button>
                        </div>
                      </div>
                      <p className="text-[#6f6e69] text-sm line-clamp-3 font-mono leading-relaxed mb-4">{task.description || '無詳細說明資料。'}</p>

                      {task.likes && task.likes.length > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {task.likes.slice(0, 3).map((l: any, i: number) => (
                              <div key={i} title={l.name} className="w-6 h-6 rounded-full bg-[#f0efe8] border-2 border-white flex items-center justify-center text-xs shadow-lg cursor-help">{l.avatar}</div>
                            ))}
                          </div>
                          <span className="text-[10px] font-black text-[#a3a299] uppercase tracking-tighter">
                            {task.likes[0].name}{task.likes.length > 1 ? ` and ${task.likes.length - 1} others` : ' liked this'}
                          </span>
                        </div>
                      )}
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-12 bg-[#262625]/35 backdrop-blur-md overflow-y-auto">
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white border border-black/[0.08] w-full max-w-6xl rounded-[4rem] shadow-2xl flex flex-col md:flex-row overflow-hidden h-full max-h-[90vh]">
                <AnimatePresence mode="wait">
                  {isSidebarOpen && ((editingTask.image_urls && editingTask.image_urls.length > 0) || editingTask.image_url) && (
                    <motion.div key="sidebar" initial={{ width: 0 }} animate={{ width: '50%' }} exit={{ width: 0 }} className="hidden md:flex bg-[#f4f3ec] items-center justify-center relative border-r border-black/[0.07] overflow-hidden p-12">
                      <div className="w-full h-full relative flex items-center justify-center">
                        <motion.img key={currentImgIdx} src={editingTask.image_urls?.[currentImgIdx] || editingTask.image_url} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full h-full object-contain drop-shadow-2xl cursor-zoom-in" onClick={() => setFullscreenImage(editingTask.image_urls?.[currentImgIdx] || editingTask.image_url!)} />
                        {editingTask.image_urls && editingTask.image_urls.length > 1 && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); setCurrentImgIdx(prev => (prev > 0 ? prev - 1 : editingTask.image_urls!.length - 1)) }} className="absolute left-4 p-4 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all"><ChevronLeft /></button>
                            <button onClick={(e) => { e.stopPropagation(); setCurrentImgIdx(prev => (prev < editingTask.image_urls!.length - 1 ? prev + 1 : 0)) }} className="absolute right-4 p-4 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all"><ChevronRight /></button>
                            <div className="absolute bottom-6 flex gap-2">{editingTask.image_urls.map((_, i) => <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === currentImgIdx ? 'bg-[#d97757] w-6' : 'bg-black/20'}`} />)}</div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className={`p-10 md:p-20 flex flex-col overflow-y-auto custom-scrollbar transition-all duration-500 ${isSidebarOpen && ((editingTask.image_urls && editingTask.image_urls.length > 0) || editingTask.image_url) ? 'md:w-1/2' : 'w-full'}`}>
                  <div className="flex justify-between items-center gap-3 mb-16">
                    <div className="flex items-center gap-4 min-w-0"><CheckCircle2 size={28} className="text-[#d97757] shrink-0" /><h2 className="text-xs font-black text-[#91918a] tracking-[0.4em] uppercase font-mono truncate">INTELLIGENCE_DETAILS</h2></div>
                    <div className="flex items-center gap-5 shrink-0">
                      {((editingTask.image_urls && editingTask.image_urls.length > 0) || editingTask.image_url) && <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3 bg-[#f4f3ec] hover:bg-[#ecebe2] rounded-2xl text-[#d97757]">{isSidebarOpen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</button>}
                      {(isAdmin || editingTask.author_name === currentUser) && <button onClick={() => setIsEditMode(!isEditMode)} className="p-3 bg-[#f4f3ec] hover:bg-[#ecebe2] rounded-2xl text-emerald-600">{isEditMode ? <Eye size={20} /> : <Edit3 size={20} />}</button>}
                      <button onClick={() => setEditingTask(null)} className="text-[#a3a299] hover:text-[#262625] transition-colors"><X size={36} /></button>
                    </div>
                  </div>

                  <div className="space-y-12 flex-1">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3 text-xs font-black text-[#d97757]/70 ml-1 italic tracking-tighter">@{editingTask.author_name} / AUTH_USER</div>
                        <button
                          onClick={() => handleToggleLike(editingTask.id, 'task')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${editingTask.likes?.some((l: any) => l.name === currentUser) ? 'bg-pink-500/15 text-pink-600' : 'bg-[#f4f3ec] text-[#91918a] hover:bg-[#ecebe2]'}`}
                        >
                          <Heart size={16} fill={editingTask.likes?.some((l: any) => l.name === currentUser) ? 'currentColor' : 'none'} />
                          <span className="text-xs font-black">{editingTask.likes?.length || 0}</span>
                        </button>
                      </div>
                      <input id="edit-title" disabled={!isAdmin && editingTask.author_name !== currentUser} defaultValue={editingTask.title} className="w-full bg-transparent text-5xl font-black text-[#262625] outline-none border-b border-black/10 focus:border-[#d97757] transition-all pb-4" />
                    </div>

                    {/* 全寬模式 (側欄收起時) 內嵌顯示圖片,標題下方、內文上方 */}
                    {!isSidebarOpen && ((editingTask.image_urls && editingTask.image_urls.length > 0) || editingTask.image_url) && (
                      <div className="group relative w-full rounded-[2.5rem] overflow-hidden border border-black/[0.07] bg-[#f4f3ec] flex items-center justify-center">
                        <motion.img key={currentImgIdx} src={editingTask.image_urls?.[currentImgIdx] || editingTask.image_url} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-h-[460px] object-contain cursor-zoom-in" onClick={() => setFullscreenImage(editingTask.image_urls?.[currentImgIdx] || editingTask.image_url!)} />
                        {editingTask.image_urls && editingTask.image_urls.length > 1 && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); setCurrentImgIdx(prev => (prev > 0 ? prev - 1 : editingTask.image_urls!.length - 1)) }} className="absolute left-4 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all opacity-0 group-hover:opacity-100"><ChevronLeft /></button>
                            <button onClick={(e) => { e.stopPropagation(); setCurrentImgIdx(prev => (prev < editingTask.image_urls!.length - 1 ? prev + 1 : 0)) }} className="absolute right-4 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all opacity-0 group-hover:opacity-100"><ChevronRight /></button>
                            <div className="absolute bottom-5 flex gap-2">{editingTask.image_urls.map((_, i) => <div key={i} className={`h-2 rounded-full transition-all ${i === currentImgIdx ? 'bg-[#d97757] w-6' : 'bg-black/20 w-2'}`} />)}</div>
                          </>
                        )}
                      </div>
                    )}

                    <div className="space-y-8">
                      {isEditMode ? (
                        <div className="space-y-6">
                          <div className="grid grid-cols-3 gap-4">
                            {editingTaskImageUrls.map((url, i) => (
                              <div key={`existing-${i}`} className="relative aspect-square rounded-2xl overflow-hidden border border-black/10 group">
                                <img src={url} className="w-full h-full object-cover" />
                                <button onClick={() => setEditingTaskImageUrls(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-red-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                            {editingNewImagePreviews.map((url, i) => (
                              <div key={`new-${i}`} className="relative aspect-square rounded-2xl overflow-hidden border border-[#d97757]/40 group">
                                <img src={url} className="w-full h-full object-cover" />
                                <button onClick={() => handleRemoveImage(i, 'edit')} className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-red-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                            <div className="relative aspect-square rounded-2xl border-2 border-dashed border-black/15 flex items-center justify-center hover:bg-black/[0.03] transition-all cursor-pointer">
                              <input type="file" multiple accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageChange(e, 'edit')} />
                              <PlusCircle size={24} className="text-[#a3a299]" />
                            </div>
                          </div>
                          <textarea id="edit-desc" defaultValue={editingTask.description} rows={12} className="w-full bg-[#f4f3ec] border border-black/10 rounded-[2.5rem] p-10 outline-none focus:ring-1 focus:ring-[#d97757]/40 text-[#3d3a35] font-mono text-sm leading-relaxed" />
                        </div>
                      ) : <div className="prose prose-sm prose-neutral max-w-none font-sans bg-[#fbfaf7] p-10 rounded-[3rem] border border-black/[0.07] shadow-inner overflow-x-hidden break-words cursor-pointer hover:bg-[#f4f3ec] transition-all" onClick={() => (isAdmin || editingTask.author_name === currentUser) && setIsEditMode(true)}><ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{editingTask.description || ''}</ReactMarkdown></div>}
                    </div>

                    {(isAdmin || editingTask.author_name === currentUser) && (
                      <div className="flex gap-5">
                        <button onClick={handleUpdateTask} className="flex-1 bg-[#262625] text-white py-6 rounded-[2rem] font-black shadow-2xl transition-all hover:bg-[#d97757]">更新戰術目標</button>
                        <button onClick={async () => { if(confirm('確定刪除？')) await deleteTaskAction(editingTask.id); setEditingTask(null); }} className="bg-red-500/10 text-red-500 px-12 py-6 rounded-[2rem] font-black border border-red-500/20 hover:bg-red-500/20 transition-all"><Trash2 size={24} /></button>
                      </div>
                    )}

                    <div className="pt-16 border-t border-black/[0.07] space-y-12">
                      <div className="flex items-center gap-4"><MessageSquare size={22} className="text-[#d97757]" /><h3 className="text-sm font-black text-[#262625] uppercase tracking-[0.3em]">通訊紀錄 (COMMS)</h3></div>

                      <div className="bg-[#fbfaf7] border border-black/[0.07] p-8 rounded-[3rem] space-y-6 shadow-inner relative overflow-hidden">
                        {replyTo && <div className="text-[10px] font-black text-[#bd5d3e] uppercase tracking-widest flex items-center gap-2 mb-2"><CornerDownRight size={12} /> 正在回覆 {replyTo.author_name}</div>}
                        <textarea id="comment-input" placeholder="輸入回應內容..." className="w-full bg-transparent outline-none text-sm font-mono leading-relaxed text-[#3d3a35]" rows={3} />

                        <div className="flex flex-wrap gap-2">
                          {commentImagePreviews.map((url, i) => (
                            <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-black/10 group/img">
                              <img src={url} className="w-full h-full object-cover" />
                              <button onClick={() => setCommentImagePreviews(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity"><X size={10} /></button>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-black/[0.07]">
                          <div className="relative cursor-pointer hover:text-[#262625] transition-colors">
                            <input type="file" multiple accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageChange(e, 'comment')} />
                            <div className="flex items-center gap-2 text-[10px] font-black text-[#91918a] uppercase group hover:text-[#d97757]">
                              <Paperclip size={18} className={commentImagePreviews.length > 0 ? 'text-emerald-600' : ''} />
                              <span className="hidden sm:inline">添加圖片</span>
                            </div>
                          </div>
                          <div className="flex gap-4 items-center">
                            {replyTo && <button onClick={() => setReplyTo(null)} className="text-[10px] text-red-500 font-black uppercase">取消</button>}
                            <button onClick={handlePostComment} disabled={isCommentCompressing} className="bg-[#d97757] text-white px-10 py-3 rounded-2xl text-xs font-black uppercase hover:bg-[#c2603f] transition-all shadow-lg">{isCommentCompressing ? '處理中' : '發送'}</button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-8 pb-20">{renderComments(editingTask.comments || [])}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>{fullscreenImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setFullscreenImage(null)} className="fixed inset-0 z-[100] bg-[#1c1b19]/95 flex items-center justify-center p-4 cursor-zoom-out"><img src={fullscreenImage} className="max-w-full max-h-full object-contain" /></motion.div>
        )}</AnimatePresence>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.18); border-radius: 10px; }
        .text-shadow-glow { text-shadow: 0 1px 1px rgba(0,0,0,0.04); }
        .prose pre { white-space: pre-wrap; word-break: break-all; overflow-x: auto; max-width: 100%; }
        .prose table { display: block; overflow-x: auto; max-width: 100%; border-collapse: collapse; margin: 1.5em 0; }
        .prose th, .prose td { border: 1px solid rgba(0,0,0,0.12); padding: 12px; }
        .prose p { white-space: pre-wrap; margin-bottom: 1.2em; line-height: 1.8; }
        .prose a { color: #bd5d3e; text-decoration: underline; font-weight: bold; }
      `}</style>
    </div>
  );
}
