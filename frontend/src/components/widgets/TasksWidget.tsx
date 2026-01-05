import { useCallback, useEffect, useState } from 'react';
import type { Task, Note } from '../../types';
import { WidgetWrapper } from './WidgetWrapper';
import { useTranslation } from '../../i18n';

export function TasksWidget() {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [taskInput, setTaskInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, notesRes] = await Promise.all([fetch('/api/tasks'), fetch('/api/notes')]);
      if (!tasksRes.ok || !notesRes.ok) throw new Error('Load failed');
      const tasksData = await tasksRes.json();
      const notesData = await notesRes.json();
      setTasks(tasksData.tasks || []);
      setNotes(notesData.notes || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load tasks/notes', err);
      setError(t('tasks_error_loading'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addTask = async () => {
    if (!taskInput.trim()) return;
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: taskInput.trim() }),
      });
      if (!res.ok) throw new Error('Task create failed');
      const data = await res.json();
      setTasks((prev) => [data.task, ...prev]);
      setTaskInput('');
    } catch (err) {
      console.error('Failed to add task', err);
      setError(t('tasks_error_generic'));
    }
  };

  const toggleTask = async (task: Task) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed }),
      });
      if (!res.ok) throw new Error('Task update failed');
      const data = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === task.id ? data.task : t)));
    } catch (err) {
      console.error('Failed to toggle task', err);
      setError(t('tasks_error_generic'));
    }
  };

  const deleteTask = async (task: Task) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Task delete failed');
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch (err) {
      console.error('Failed to delete task', err);
      setError(t('tasks_error_generic'));
    }
  };

  const addNote = async () => {
    if (!noteInput.trim()) return;
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteInput.trim() }),
      });
      if (!res.ok) throw new Error('Note create failed');
      const data = await res.json();
      setNotes((prev) => [data.note, ...prev]);
      setNoteInput('');
    } catch (err) {
      console.error('Failed to save note', err);
      setError(t('tasks_error_generic'));
    }
  };

  const deleteNoteItem = async (note: Note) => {
    try {
      const res = await fetch(`/api/notes/${note.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Note delete failed');
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
    } catch (err) {
      console.error('Failed to delete note', err);
      setError(t('tasks_error_generic'));
    }
  };

  if (loading) {
    return (
      <WidgetWrapper titleKey="widget_tasks">
        <div className="flex items-center justify-center h-full text-[var(--color-text-secondary)]">
          <div className="animate-spin w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full mr-3" />
          <span>{t('tasks_loading')}</span>
        </div>
      </WidgetWrapper>
    );
  }

  return (
    <WidgetWrapper titleKey="widget_tasks" noPadding>
      <div className="h-full grid grid-cols-1 divide-y divide-[var(--color-widget-border)]">
        {error && <div className="p-3 text-sm text-[var(--color-error)]">{error}</div>}

        {/* Tasks */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
              placeholder={t('tasks_placeholder')}
              className="flex-1 px-3 py-2 rounded-md bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-sm text-[var(--color-text-primary)]"
            />
            <button
              onClick={addTask}
              className="px-3 py-2 rounded-md bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
            >
              {t('tasks_add')}
            </button>
          </div>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {tasks.length === 0 && (
              <div className="text-sm text-[var(--color-text-secondary)]">{t('tasks_empty')}</div>
            )}
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between gap-2 p-2 rounded-md bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)]"
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(task)}
                    className="h-4 w-4 accent-[var(--color-accent)]"
                  />
                  <span
                    className={`text-sm ${task.completed ? 'line-through text-[var(--color-text-secondary)]' : 'text-[var(--color-text-primary)]'}`}
                  >
                    {task.title}
                  </span>
                </label>
                <button
                  onClick={() => deleteTask(task)}
                  className="text-[10px] text-[var(--color-text-secondary)] hover:text-[var(--color-error)]"
                >
                  {t('tasks_delete')}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-2">
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder={t('notes_placeholder')}
              rows={3}
              className="flex-1 px-3 py-2 rounded-md bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] text-sm text-[var(--color-text-primary)] resize-none"
            />
            <button
              onClick={addNote}
              className="px-3 py-2 rounded-md bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors h-fit"
            >
              {t('notes_save')}
            </button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {notes.length === 0 && (
              <div className="text-sm text-[var(--color-text-secondary)]">{t('notes_empty')}</div>
            )}
            {notes.map((note) => (
              <div
                key={note.id}
                className="p-3 rounded-md bg-[var(--color-widget-bg)] border border-[var(--color-widget-border)] relative"
              >
                <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-line">{note.content}</p>
                <button
                  onClick={() => deleteNoteItem(note)}
                  className="absolute top-2 right-2 text-[10px] text-[var(--color-text-secondary)] hover:text-[var(--color-error)]"
                >
                  {t('notes_delete')}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WidgetWrapper>
  );
}
