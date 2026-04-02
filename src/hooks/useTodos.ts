import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { TodoItem } from '../types/tracker';
import { localNotificationService } from '../services/localNotificationService';

const TODOS_KEY = 'tracker:todos';
const NOTIFICATION_MAP_KEY = 'tracker:todo_notifications';

/** Returns local date string YYYY-MM-DD (not UTC) */
function getDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Map todoId -> notificationIdentifier for cancellation
async function loadNotificationMap(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATION_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveNotificationMap(map: Record<string, string>): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATION_MAP_KEY, JSON.stringify(map));
}

export function useTodos() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const todosRef = useRef<TodoItem[]>(todos);
  todosRef.current = todos;

  // Refresh today/tomorrow on screen focus (handles midnight crossing)
  const [dateKey, setDateKey] = useState(() => getDateString());

  useFocusEffect(
    useCallback(() => {
      const now = getDateString();
      setDateKey(prev => prev !== now ? now : prev);
    }, [])
  );

  const today = useMemo(() => getDateString(), [dateKey]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(TODOS_KEY);
        if (raw) setTodos(JSON.parse(raw));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = useCallback(async (updated: TodoItem[]) => {
    setTodos(updated);
    await AsyncStorage.setItem(TODOS_KEY, JSON.stringify(updated));
  }, []);

  const addTodo = useCallback(async (text: string, date?: string, reminder?: string) => {
    const todoDate = date || today;
    const newTodo: TodoItem = {
      id: generateId(),
      text: text.trim(),
      completed: false,
      date: todoDate,
      reminder,
      createdAt: new Date().toISOString(),
    };

    // Schedule reminder notification if set
    if (reminder) {
      const reminderDate = new Date(reminder);
      if (reminderDate > new Date()) {
        try {
          const identifier = await localNotificationService.scheduleNotification(
            {
              title: text.trim(),
              body: reminder,
              data: { type: 'todo', todoId: newTodo.id },
            },
            { type: 'date' as any, date: reminderDate },
          );
          // Save mapping for later cancellation
          const map = await loadNotificationMap();
          map[newTodo.id] = identifier;
          await saveNotificationMap(map);
        } catch {
          // notification scheduling failed silently
        }
      }
    }

    await save([...todosRef.current, newTodo]);
    return newTodo;
  }, [save, today]);

  const toggleTodo = useCallback(async (id: string) => {
    await save(todosRef.current.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  }, [save]);

  const deleteTodo = useCallback(async (id: string) => {
    // Cancel any scheduled notification for this todo
    try {
      const map = await loadNotificationMap();
      if (map[id]) {
        await localNotificationService.cancelNotification(map[id]);
        delete map[id];
        await saveNotificationMap(map);
      }
    } catch {
      // ignore cancellation errors
    }
    await save(todosRef.current.filter(t => t.id !== id));
  }, [save]);

  const tomorrowDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return getDateString(d);
  }, [dateKey]);

  const todayItems = useMemo(() =>
    todos.filter(t => t.date === today || t.date === tomorrowDate).sort((a, b) => {
      // today before tomorrow
      if (a.date !== b.date) return a.date === today ? -1 : 1;
      // uncompleted first, then by creation time
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }),
  [todos, today, tomorrowDate]);

  return {
    todos,
    todayItems,
    loading,
    addTodo,
    toggleTodo,
    deleteTodo,
  };
}
