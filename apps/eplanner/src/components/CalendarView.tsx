import { useState } from 'react';
import type { Task } from '../hooks/usePlanner';

interface CalendarViewProps {
  tasks: Task[];
  onSelectTask: (id: string) => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444', medium: '#f59e0b', low: '#22c55e',
};

export default function CalendarView({ tasks, onSelectTask }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const getTasksForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter((t) => t.dueDate === dateStr);
  };

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <button className="calendar-nav" onClick={prevMonth}>◀</button>
        <span className="calendar-month">{MONTHS[month]} {year}</span>
        <button className="calendar-nav" onClick={nextMonth}>▶</button>
      </div>
      <div className="calendar-grid">
        {DAYS.map((d) => (
          <div key={d} className="calendar-day-header">{d}</div>
        ))}
        {cells.map((day, i) => (
          <div key={i} className={`calendar-cell ${day === null ? 'empty' : ''} ${day && isToday(day) ? 'today' : ''}`}>
            {day && (
              <>
                <div className="calendar-cell-day">{day}</div>
                <div className="calendar-cell-tasks">
                  {getTasksForDay(day).map((task) => (
                    <div
                      key={task.id}
                      className="calendar-task"
                      style={{ borderLeftColor: PRIORITY_COLORS[task.priority] }}
                      onClick={() => onSelectTask(task.id)}
                      title={task.title}
                    >
                      {task.title}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
