// ai-task-dashboard/components/TaskDashboard.tsx
'use client';

import { useActionState, useOptimistic, useState } from 'react';
import { createTaskAction, deleteTaskAction, updateTaskAction } from '@/app/actions';

export type Task = { 
  id: string; 
  title: string; 
  status: string; 
  image_url?: string; 
  scheduled_at?: string; 
  is_sent: boolean 
};

export default function TaskDashboard({ initialTasks }: { initialTasks: Task[] }) {
  const [state, formAction, isPending] = useActionState(createTaskAction, { success: true });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [optimisticTasks, addOptimisticTask] = useOptimistic(
    initialTasks,
    (state, newTask: Task) => [newTask, ...state]
  );

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-10 font-sans selection:bg-blue-500/30">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-black tracking-tighter bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent italic">
            AI COMMAND
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-xs mt-2">Mission Control & Telegram Sync</p>
        </header>

        {/* Create Task Panel */}
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 mb-10 backdrop-blur-xl shadow-inner">
          <form action={async (formData) => {
            const title = formData.get('title') as string;
            if (!title) return;
            // 樂觀更新
            addOptimisticTask({ 
              id: Math.random().toString(), 
              title, 
              status: 'Pending', 
              is_sent: formData.get('scheduled_at') ? false : true 
            });
            await formAction(formData);
            setImagePreview(null);
            (document.getElementById('task-form') as HTMLFormElement).reset();
          }} id="task-form" className="space-y-4">
            
            <div className="flex gap-3">
              <input
                name="title"
                placeholder="Assign a new objective..."
                className="flex-1 bg-black/20 border border-white/5 rounded-2xl px-6 py-4 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-700"
                required
              />
              <button
                type="submit"
                disabled={isPending}
                className="bg-blue-600 hover:bg-blue-500 active:scale-95 px-8 rounded-2xl font-black text-white shadow-xl shadow-blue-900/40 disabled:opacity-50 transition-all"
              >
                {isPending ? '...' : 'DEPLOY'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Image Upload */}
              <div className="relative group cursor-pointer bg-black/20 border border-white/5 rounded-2xl p-4 flex items-center gap-4 hover:border-white/20 transition-all">
                <input type="file" name="image" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageChange} />
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                  {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover rounded-xl" /> : '🖼️'}
                </div>
                <span className="text-sm font-semibold text-slate-400">{imagePreview ? 'Image Attached' : 'Attach Visual'}</span>
              </div>

              {/* Schedule */}
              <div className="bg-black/20 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                <div className="text-emerald-400">⏰</div>
                <input 
                  type="datetime-local" 
                  name="scheduled_at" 
                  className="bg-transparent border-none outline-none text-sm text-slate-400 font-mono w-full"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Task List */}
        <div className="space-y-4">
          {optimisticTasks.map((task) => (
            <div 
              key={task.id}
              onClick={() => setEditingTask(task)}
              className="group cursor-pointer bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/10 p-5 rounded-[2rem] flex items-center justify-between transition-all duration-500 shadow-sm"
            >
              <div className="flex items-center gap-5">
                {task.image_url ? (
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                    <img src={task.image_url} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center text-xl grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                    📋
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg tracking-tight text-slate-300 group-hover:text-white transition-colors">{task.title}</h3>
                  <div className="flex gap-3 mt-1">
                    <span className="text-[10px] font-black tracking-widest text-blue-500 uppercase">{task.status}</span>
                    {task.scheduled_at && (
                      <span className="text-[10px] font-black tracking-widest text-emerald-500 uppercase">
                        Scheduled: {new Date(task.scheduled_at).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity pr-4">
                <span className="text-slate-600 font-black text-xl">→</span>
              </div>
            </div>
          ))}
        </div>

        {/* Modal: Task Details & Editing */}
        {editingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-[3rem] p-8 shadow-2xl relative">
              <button 
                onClick={() => setEditingTask(null)}
                className="absolute top-6 right-8 text-slate-500 hover:text-white font-bold text-2xl"
              >✕</button>
              
              <h2 className="text-2xl font-black mb-6 text-white italic">TASK DETAILS</h2>
              
              {editingTask.image_url && (
                <div className="w-full h-48 rounded-[2rem] overflow-hidden mb-6 border border-white/10">
                  <img src={editingTask.image_url} className="w-full h-full object-cover" />
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-500 tracking-widest block mb-2 uppercase">Objective Title</label>
                  <input 
                    defaultValue={editingTask.title}
                    id="edit-title"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={async () => {
                      const newTitle = (document.getElementById('edit-title') as HTMLInputElement).value;
                      await updateTaskAction(editingTask.id, newTitle, editingTask.status);
                      setEditingTask(null);
                    }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-900/30"
                  >SAVE CHANGES</button>
                  <button 
                    onClick={async () => {
                      await deleteTaskAction(editingTask.id);
                      setEditingTask(null);
                    }}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-6 py-4 rounded-2xl font-bold border border-red-500/20"
                  >TERMINATE</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
