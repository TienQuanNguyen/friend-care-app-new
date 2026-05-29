import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { useCareSpace } from '../contexts/CareSpaceContext';
import { scheduleService } from '../services/scheduleService';
import { Schedule, ScheduleCategory, ScheduleAssignedTo, ScheduleStatus } from '../types';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  parseISO
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { CalendarHeart, ChevronLeft, ChevronRight, LayoutGrid, List, TableProperties, X, Trash2 } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import { AnimatedCheck } from '../components/ui/AnimatedCheck';
import { MiniConfetti } from '../components/ui/MiniConfetti';

const CATEGORIES: { value: ScheduleCategory, label: string }[] = [
  { value: 'work', label: 'Công việc' },
  { value: 'study', label: 'Học tập' },
  { value: 'couple', label: 'Lịch' },
  { value: 'reminder', label: 'Nhắc nhở' },
  { value: 'health', label: 'Sức khỏe' },
  { value: 'other', label: 'Khác' },
];

const ASSIGNMENTS: { value: ScheduleAssignedTo, label: string }[] = [
  { value: 'me', label: 'Tôi' },
  { value: 'partner', label: 'Người ấy' },
  { value: 'both', label: 'Cả hai' },
];

const STATUSES: { value: ScheduleStatus, label: string }[] = [
  { value: 'todo', label: 'Dự định' },
  { value: 'doing', label: 'Đang diễn ra' },
  { value: 'done', label: 'Hoàn thành' },
];

const getEventColor = (category: ScheduleCategory) => {
  switch (category) {
    case 'couple': return 'bg-brand text-white'; // soft pink
    case 'reminder': return 'bg-[#e9d5ff] text-[#6b21a8]'; // lavender
    case 'work':
    case 'study': return 'bg-[#ccfbf1] text-[#0f766e]'; // mint
    case 'health': return 'bg-[#ffedd5] text-[#c2410c]'; // peach
    default: return 'bg-gray-200 text-gray-700'; // gray
  }
};

type ViewMode = 'Tháng' | 'Bảng' | 'Danh sách';

export const Schedules = () => {
  const { user } = useAuth();
  const { careSpace } = useCareSpace();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfettiFor, setShowConfettiFor] = useState<string | null>(null);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('Tháng');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateStr, setDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [category, setCategory] = useState<ScheduleCategory>('couple');
  const [assignedTo, setAssignedTo] = useState<ScheduleAssignedTo>('both');
  const [status, setStatus] = useState<ScheduleStatus>('todo');

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    setIsLoading(true);
    try {
      const data = await scheduleService.getSchedules();
      setSchedules(data);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStatus = async (schedule: Schedule) => {
    const newStatus: ScheduleStatus = schedule.status === 'done' ? 'todo' : 'done';
    await scheduleService.updateSchedule(schedule.id, { status: newStatus });
    if (newStatus === 'done') {
      setShowConfettiFor(schedule.id);
      setTimeout(() => setShowConfettiFor(null), 3000);
    }
    loadSchedules();
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDateStr(format(new Date(), 'yyyy-MM-dd'));
    setStartTime('09:00');
    setEndTime('10:00');
    setCategory('couple');
    setAssignedTo('both');
    setStatus('todo');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dateStr || !startTime || !user || !careSpace) return;

    setError('');
    setIsSubmitting(true);
    const startDateTime = new Date(`${dateStr}T${startTime}`);
    const endDateTime = endTime ? new Date(`${dateStr}T${endTime}`) : undefined;

    try {
      if (editingId) {
        const result = await scheduleService.updateSchedule(editingId, {
          title,
          description,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime?.toISOString(),
          category,
          assigned_to: assignedTo,
          status,
          color_type: category === 'couple' ? 'pink' : 'gray',
        });
        if (!result) throw new Error("Cập nhật lịch thất bại.");
      } else {
        const result = await scheduleService.addSchedule({
          care_space_id: careSpace.id,
          created_by: user.id,
          title,
          description,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime?.toISOString(),
          category,
          assigned_to: assignedTo,
          status,
          color_type: category === 'couple' ? 'pink' : 'gray',
        });
        if (!result) throw new Error("Tạo lịch thất bại. Vui lòng thử lại.");
      }

      resetForm();
      setIsModalOpen(false);
      loadSchedules();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi khi lưu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa lịch hẹn này?")) return;
    try {
      await scheduleService.deleteSchedule(id);
      setIsModalOpen(false);
      loadSchedules();
    } catch (err: any) {
      alert("Không thể xóa lịch hẹn.");
    }
  };

  const handleDateClick = (day: Date) => {
    resetForm();
    setDateStr(format(day, 'yyyy-MM-dd'));
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleEventClick = (e: React.MouseEvent, schedule: Schedule) => {
    e.stopPropagation();
    const st = parseISO(schedule.start_time);
    setTitle(schedule.title);
    setDescription(schedule.description || '');
    setDateStr(format(st, 'yyyy-MM-dd'));
    setStartTime(format(st, 'HH:mm'));
    if (schedule.end_time) {
      setEndTime(format(parseISO(schedule.end_time), 'HH:mm'));
    } else {
      setEndTime('');
    }
    setCategory(schedule.category);
    setAssignedTo(schedule.assigned_to);
    setStatus(schedule.status);
    setEditingId(schedule.id);
    setIsModalOpen(true);
  };

  // Calendar logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const dateFormat = "d";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getDayEvents = (day: Date) => {
    return schedules.filter(s => isSameDay(parseISO(s.start_time), day));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-main flex items-center gap-3">
            <CalendarHeart className="w-8 h-8 text-brand-accent" />
            Lịch trình
          </h1>
          <p className="text-text-soft mt-2 text-sm max-w-lg">
            Không gian đồng bộ. Ghi chú điểm hẹn và những sự kiện quan trọng cùng nhau.
          </p>
        </div>
        <Button 
          onClick={() => {
            resetForm();
            setEditingId(null);
            setIsModalOpen(true);
          }}
          className="px-6 py-2.5 rounded-pill font-bold shadow-sm transition-all bg-brand text-white"
        >
          + Tạo lịch hẹn
        </Button>
      </div>

      {/* Toolbar */}
      <Card className="flex flex-col md:flex-row justify-between items-center bg-white shadow-sm border border-brand-light py-3 px-4 rounded-pill">
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <div className="flex gap-1">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-canvas-cool rounded-full text-text-soft">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-canvas-cool rounded-full text-text-soft">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-2">
            <select 
              value={currentDate.getMonth()}
              onChange={(e) => {
                const newDate = new Date(currentDate);
                newDate.setMonth(parseInt(e.target.value));
                setCurrentDate(newDate);
              }}
              className="bg-canvas-cool border border-gray-200 rounded-pill px-3 py-1.5 text-sm font-semibold text-text-main outline-none focus:border-brand-accent"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i} value={i}>Tháng {i + 1}</option>
              ))}
            </select>
            <select 
              value={currentDate.getFullYear()}
              onChange={(e) => {
                const newDate = new Date(currentDate);
                newDate.setFullYear(parseInt(e.target.value));
                setCurrentDate(newDate);
              }}
              className="bg-canvas-cool border border-gray-200 rounded-pill px-3 py-1.5 text-sm font-semibold text-text-main outline-none focus:border-brand-accent"
            >
              {[currentDate.getFullYear() - 1, currentDate.getFullYear(), currentDate.getFullYear() + 1].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex bg-canvas-cool p-1 rounded-pill border border-gray-200">
          {(['Tháng', 'Bảng', 'Danh sách'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-pill text-sm font-semibold transition-all ${
                viewMode === mode ? 'bg-white text-brand-accent shadow-sm' : 'text-text-soft hover:text-text-main'
              }`}
            >
              {mode === 'Tháng' && <CalendarHeart className="w-4 h-4" />}
              {mode === 'Bảng' && <TableProperties className="w-4 h-4" />}
              {mode === 'Danh sách' && <List className="w-4 h-4" />}
              {mode}
            </button>
          ))}
        </div>
      </Card>

      {/* Add/Edit Event Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <div 
            className="absolute inset-0" 
            onClick={() => setIsModalOpen(false)}
          />
          <Card className="bg-white border border-brand-light shadow-2xl rounded-card w-full max-w-lg relative z-10 my-auto">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-text-soft hover:text-text-main transition-colors p-1 bg-canvas-cool rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <h2 className="font-bold text-xl text-text-main border-b border-canvas-cool pb-4">
                {editingId ? 'Chỉnh sửa sự kiện' : 'Tạo lịch hẹn mới'}
              </h2>
            
            {error && (
              <div className="p-3 mb-2 text-sm text-semantic-destructive bg-semantic-destructive/10 rounded-lg">
                {error}
              </div>
            )}
            
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="Tiêu đề *" value={title} onChange={e => setTitle(e.target.value)} required />
              <Input label="Mô tả" value={description} onChange={e => setDescription(e.target.value)} />
              
              <div>
                <label className="block text-[13px] font-semibold text-text-soft mb-1.5 uppercase tracking-wider">Ngày</label>
                <input 
                  type="date" 
                  value={dateStr} 
                  onChange={e => setDateStr(e.target.value)} 
                  required
                  className="w-full bg-canvas-cool border border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-brand-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-semibold text-text-soft mb-1.5 uppercase tracking-wider">Giờ bắt đầu</label>
                  <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required className="w-full bg-canvas-cool border border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-brand-accent" />
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-text-soft mb-1.5 uppercase tracking-wider">Giờ kết thúc</label>
                  <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-canvas-cool border border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-brand-accent" />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-text-soft mb-1.5 uppercase tracking-wider">Loại lịch</label>
                <select value={category} onChange={e => setCategory(e.target.value as ScheduleCategory)} className="w-full bg-canvas-cool border border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-brand-accent">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-semibold text-text-soft mb-1.5 uppercase tracking-wider">Gán cho</label>
                  <select value={assignedTo} onChange={e => setAssignedTo(e.target.value as ScheduleAssignedTo)} className="w-full bg-canvas-cool border border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-brand-accent">
                    {ASSIGNMENTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-semibold text-text-soft mb-1.5 uppercase tracking-wider">Trạng thái</label>
                  <select value={status} onChange={e => setStatus(e.target.value as ScheduleStatus)} className="w-full bg-canvas-cool border border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-brand-accent">
                    {STATUSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-canvas-cool mt-4">
              {editingId && (
                <Button 
                  type="button" 
                  onClick={() => handleDelete(editingId)} 
                  className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 mr-auto flex items-center gap-2 px-4"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa
                </Button>
              )}
              <Button type="button" onClick={() => setIsModalOpen(false)} className="bg-canvas-ceramic text-text-main border border-gray-200">Hủy</Button>
              <Button type="submit" className="bg-brand text-white hover:bg-brand-accent" disabled={isSubmitting}>
                {isSubmitting ? 'Đang lưu...' : 'Lưu lịch hẹn'}
              </Button>
            </div>
          </form>
        </Card>
        </div>
      )}

      {/* Main View Area */}
      <Card className="bg-white border-none p-0 overflow-hidden shadow-card rounded-card">
        {schedules.length === 0 && !isModalOpen && viewMode !== 'Tháng' ? (
          <div className="text-center py-16 px-4 border border-brand-light rounded-card">
            <div className="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarHeart className="w-8 h-8 text-brand-accent" />
            </div>
            <p className="text-text-soft">Chưa có lịch hẹn nào. Tạo một lịch nhỏ để hai bạn cùng nhớ nhé.</p>
          </div>
        ) : isLoading ? (
          <div className="p-4 space-y-4">
            <Skeleton className="h-64" />
          </div>
        ) : (
          <>
            {viewMode === 'Tháng' && (
              <div className="min-w-full">
                {/* Header Row */}
                <div className="grid grid-cols-7 border-b border-brand-light/50 bg-brand-light/10">
                  {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'].map(d => (
                    <div key={d} className="py-3 text-center text-xs font-bold text-brand uppercase tracking-wider">
                      {d}
                    </div>
                  ))}
                </div>
                {/* Days Grid */}
                <div className="grid grid-cols-7 border-l border-brand-light/50">
                  {days.map((day) => {
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isTodayMarker = isToday(day);
                    const dayEvents = getDayEvents(day);

                    return (
                      <div 
                        key={day.toString()} 
                        onClick={() => handleDateClick(day)}
                        className={`min-h-[110px] p-2 border-r border-b border-brand-light/50 transition-colors hover:bg-canvas-cool/50 cursor-pointer ${
                          !isCurrentMonth ? 'bg-canvas-cool/30 opacity-50' : 'bg-white'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                            isTodayMarker ? 'bg-brand-accent text-white' : 'text-text-main'
                          }`}>
                            {format(day, dateFormat)}
                          </span>
                        </div>
                        <div className="space-y-1 overflow-y-auto max-h-[70px] no-scrollbar">
                          {dayEvents.slice(0, 2).map(e => (
                            <div 
                              key={e.id} 
                              onClick={(event) => handleEventClick(event, e)}
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded truncate hover:opacity-80 transition-opacity ${getEventColor(e.category)}`}
                            >
                              <span className="opacity-80 mr-1">{format(parseISO(e.start_time), 'HH:mm')}</span>
                              {e.title}
                            </div>
                          ))}
                          {dayEvents.length > 2 && (
                            <div className="text-[10px] text-text-soft font-semibold text-center mt-0.5">
                              +{dayEvents.length - 2} sự kiện
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {viewMode === 'Bảng' && (
              <div className="overflow-x-auto p-4">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-canvas-cool text-sm text-text-soft uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Ngày</th>
                      <th className="pb-3 font-semibold">Thời gian</th>
                      <th className="pb-3 font-semibold">Tiêu đề</th>
                      <th className="pb-3 font-semibold">Loại</th>
                      <th className="pb-3 font-semibold">Gán cho</th>
                      <th className="pb-3 font-semibold">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map(schedule => {
                      const st = parseISO(schedule.start_time);
                      return (
                        <tr 
                          key={schedule.id} 
                          className="border-b border-canvas-cool/50 hover:bg-canvas-cool/30 cursor-pointer"
                          onClick={(e) => handleEventClick(e, schedule)}
                        >
                          <td className="py-4 font-semibold text-text-main">{format(st, 'dd/MM/yyyy')}</td>
                          <td className="py-4 text-text-soft">{format(st, 'HH:mm')}</td>
                          <td className="py-4 font-semibold text-text-main">{schedule.title}</td>
                          <td className="py-4">
                            <span className={`px-2 py-1 text-xs rounded-full font-bold ${getEventColor(schedule.category)}`}>
                              {CATEGORIES.find(c => c.value === schedule.category)?.label}
                            </span>
                          </td>
                          <td className="py-4 text-sm text-text-soft">{ASSIGNMENTS.find(a => a.value === schedule.assigned_to)?.label}</td>
                          <td className="py-4 text-sm text-text-soft">{STATUSES.find(s => s.value === schedule.status)?.label}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {viewMode === 'Danh sách' && (
              <div className="p-4 space-y-3">
                {schedules.sort((a,b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()).map(schedule => {
                  const st = parseISO(schedule.start_time);
                  return (
                    <div 
                      key={schedule.id} 
                      className="flex gap-4 p-4 border border-canvas-cool rounded-xl hover:bg-canvas-cool/30 transition-colors cursor-pointer"
                      onClick={(e) => handleEventClick(e, schedule)}
                    >
                      <div className="bg-brand-light/30 rounded-xl p-3 text-center min-w-[70px] h-fit">
                        <div className="text-xs font-bold text-brand uppercase">{format(st, 'MMM', { locale: vi })}</div>
                        <div className="text-2xl font-bold text-brand-house">{format(st, 'dd')}</div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-lg font-bold text-text-main">{schedule.title}</h4>
                          <span className={`px-2 py-1 text-xs rounded-full font-bold ${getEventColor(schedule.category)}`}>
                            {CATEGORIES.find(c => c.value === schedule.category)?.label}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-text-soft mb-2 flex gap-3">
                          <span>⏰ {format(st, 'HH:mm')}</span>
                          <span>👤 {ASSIGNMENTS.find(a => a.value === schedule.assigned_to)?.label}</span>
                        </div>
                        {schedule.description && (
                          <p className="text-sm text-text-soft bg-canvas-cool p-2 rounded-lg mb-3">{schedule.description}</p>
                        )}
                        <div className="flex justify-end border-t border-canvas-cool pt-3 mt-auto">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => toggleStatus(schedule)}
                            className={`flex items-center gap-2 rounded-full relative transition-colors ${
                              schedule.status === 'done' 
                                ? 'text-brand bg-brand-light/20 hover:bg-brand-light/40' 
                                : 'text-text-soft hover:bg-canvas-cool'
                            }`}
                          >
                            {schedule.status === 'done' ? <AnimatedCheck size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-current opacity-50" />}
                            {schedule.status === 'done' ? 'Đã xong' : 'Đánh dấu xong'}
                            {showConfettiFor === schedule.id && <MiniConfetti onComplete={() => setShowConfettiFor(null)} />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};
