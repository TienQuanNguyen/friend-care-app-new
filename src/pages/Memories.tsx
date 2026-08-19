import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { useCareSpace } from '../contexts/CareSpaceContext';
import { memoryService } from '../services/memoryService';
import { Memory } from '../types';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Image as ImageIcon } from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import { AnimatedCheck } from '../components/ui/AnimatedCheck';
import { useActivityLog } from '../hooks/useActivityLog';

export const Memories = () => {
  const { user } = useAuth();
  const { careSpace } = useCareSpace();
  const { log } = useActivityLog();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [memoryDate, setMemoryDate] = useState('');

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    setIsLoading(true);
    try {
      const data = await memoryService.getMemories();
      setMemories(data);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !user || !careSpace) return;

    setIsSubmitting(true);
    try {
      await memoryService.addMemory({
        care_space_id: careSpace.id,
        created_by: user.id,
        title,
        description,
        memory_date: memoryDate || undefined,
      });

      setTitle('');
      setDescription('');
      setMemoryDate('');
      setIsAdding(false);
      setShowSuccess(true);
      log('memory_upload', title);
      setTimeout(() => setShowSuccess(false), 2000);
      loadMemories();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-brand tracking-tight flex items-center gap-3">
          <ImageIcon className="text-brand-accent" />
          Album kỷ niệm
        </h1>
        <Button onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Hủy' : '+ Thêm kỷ niệm'}
        </Button>
      </div>

      {isAdding && (
        <Card className="bg-canvas-cool border-none">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="font-bold text-lg mb-4 text-brand">Lưu giữ khoảnh khắc</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="Tên kỷ niệm *" value={title} onChange={e => setTitle(e.target.value)} required />
              <div className="relative">
                <label className="text-[13px] absolute -top-2 left-3 bg-canvas-cool px-1 font-semibold text-brand-accent z-10">Ngày (tuỳ chọn)</label>
                <input 
                  type="date" 
                  value={memoryDate} 
                  onChange={e => setMemoryDate(e.target.value)} 
                  className="w-full bg-white px-3 pb-2 pt-3 outline-none border border-gray-300 rounded text-[16px] text-text-main h-12 focus:border-brand-accent"
                />
              </div>
              <div className="md:col-span-2 relative border border-gray-300 rounded bg-white">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Kể lại một chút về khoảnh khắc này..."
                  className="w-full bg-transparent p-4 outline-none resize-none h-32 text-text-main"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
                {isSubmitting ? 'Đang lưu...' : 'Lưu kỷ niệm'}
                {showSuccess && <AnimatedCheck size={16} color="#fff" />}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </>
        ) : memories.map(memory => {
          const displayDate = memory.memory_date || memory.created_at;
          return (
            <Card key={memory.id} padding="none" className="overflow-hidden hover:shadow-nav transition-shadow">
              <div className="h-40 bg-brand-light/30 flex items-center justify-center text-brand/30">
                <ImageIcon className="w-12 h-12" />
              </div>
              <div className="p-4">
                <h3 className="font-bold text-text-main mb-1 line-clamp-1">{memory.title}</h3>
                <div className="text-xs text-text-soft font-medium mb-2">
                  {format(new Date(displayDate), 'dd/MM/yyyy', { locale: vi })}
                </div>
                {memory.description && (
                  <p className="text-sm text-text-main line-clamp-2">{memory.description}</p>
                )}
              </div>
            </Card>
          );
        })}
        {!isLoading && memories.length === 0 && !isAdding && (
          <div className="md:col-span-3 text-center py-12 text-text-soft italic bg-white rounded-card">
            Chưa có kỷ niệm nào.
          </div>
        )}
      </div>
    </div>
  );
};
