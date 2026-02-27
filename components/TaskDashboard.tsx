// ai-task-dashboard/components/TaskDashboard.tsx
'use client';

import { useActionState, useOptimistic } from 'react';
import { createTaskAction } from '@/app/actions';

export type Task = { id: string; title: string; status: 'Pending' | 'Completed' };

export default function TaskDashboard({ initialTasks }: { initialTasks: Task[] }) {
  const [state, formAction, isPending] = useActionState(createTaskAction, { success: true });
  
  const [optimisticTasks, addOptimisticTask] = useOptimistic(
    initialTasks,
    (state, newTask: Task) => [newTask, ...state]
  );

  return (
    <div className="min-h-screen bg-[#020617] p-6 text-slate-200 font-sans">
      <div className="max-w-2xl mx-auto">
        {/* Header Section */}
        <header className="mb-10 p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-br from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            Task Command
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Real-time Dashboard & Telegram Sync</p>
        </header>

        {/* Action Form */}
        <form 
          action={async (formData) => {
            const title = formData.get('title') as string;
            if (!title) return;
            addOptimisticTask({ id: Math.random().toString(), title, status: 'Pending' });
            await formAction(formData);
          }} 
          className="flex gap-3 mb-10 group"
        >
          <input
            name="title"
            autoComplete="off"
            placeholder="Assign new objective..."
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white/10 transition-all placeholder:text-slate-600"
            required
          />
          <button
            type="submit"
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-500 active:scale-95 px-8 py-4 rounded-2xl font-bold text-white shadow-lg shadow-blue-900/20 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
          >
            {isPending ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : 'Deploy'}
          </button>
        </form>

        {/* List Section */}
        <div className="space-y-3">
          {optimisticTasks.length === 0 && (
            <p className="text-center py-12 text-slate-600 italic">No tasks active.</p>
          )}
          {optimisticTasks.map((task) => (
            <div 
              key={task.id} 
              className="group p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300 flex justify-between items-center shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                <span className="text-lg font-medium tracking-wide text-slate-300 group-hover:text-white transition-colors">
                  {task.title}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {task.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
