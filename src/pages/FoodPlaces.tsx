import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useCareSpace } from '../contexts/CareSpaceContext';
import { foodService } from '../services/foodService';
import { FoodPlace, FoodStatus } from '../types';
import { MapPin, Utensils, CheckCircle2, Circle, ExternalLink, X, Trash2, Edit2, Save } from 'lucide-react';
import { getAutofilledImageUrl } from '../utils/foodImageHelper';
import { Skeleton } from '../components/ui/Skeleton';
import { AnimatedCheck } from '../components/ui/AnimatedCheck';
import { MiniConfetti } from '../components/ui/MiniConfetti';
import { RandomFoodPicker } from '../components/ui/RandomFoodPicker';

const DISTRICTS = ["Quận 1", "Quận 3", "Quận 4", "Quận 5", "Quận 7", "Quận 10", "Bình Thạnh", "Phú Nhuận", "Tân Bình", "Gò Vấp", "Thủ Đức", "Khác"];
const CATEGORIES = ["Lẩu", "Nướng", "Trà sữa", "Cafe", "Bánh ngọt", "Ăn vặt", "Món Việt", "Món Hàn", "Món Nhật", "Món Âu", "Khác"];

export const FoodPlaces = () => {
  const { user } = useAuth();
  const { careSpace } = useCareSpace();
  const [places, setPlaces] = useState<FoodPlace[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<FoodPlace | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showConfettiFor, setShowConfettiFor] = useState<string | null>(null);
  
  // Filter state
  const [filterDistrict, setFilterDistrict] = useState<string>('Tất cả');
  const [filterCategory, setFilterCategory] = useState<string>('Tất cả');
  
  // Form state
  const [foodName, setFoodName] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [district, setDistrict] = useState('Quận 1');
  const [address, setAddress] = useState('');
  const [locationNote, setLocationNote] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [tried, setTried] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('Lẩu');
  const [note, setNote] = useState('');

  useEffect(() => {
    loadPlaces();
  }, []);

  const loadPlaces = async () => {
    setIsLoading(true);
    try {
      const data = await foodService.getPlaces();
      setPlaces(data);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFoodName('');
    setRestaurantName('');
    setDistrict('Quận 1');
    setAddress('');
    setLocationNote('');
    setGoogleMapsUrl('');
    setTried(false);
    setImageUrl('');
    setCategory('Lẩu');
    setNote('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName || !user || !careSpace) return;

    setError('');
    setIsSubmitting(true);
    const finalImageUrl = getAutofilledImageUrl(foodName, category, imageUrl);

    try {
      if (editingId) {
        const result = await foodService.updatePlace(editingId, {
          food_name: foodName,
          restaurant_name: restaurantName,
          district,
          address,
          location_note: locationNote,
          google_maps_url: googleMapsUrl,
          category,
          cuisine_type: category,
          status: tried ? 'tried' : 'want_to_try',
          tried,
          image_url: finalImageUrl,
          image_source: imageUrl.trim() ? 'url' : 'svg_generated',
          note
        });
        if (!result) throw new Error("Cập nhật thất bại. Vui lòng thử lại.");
        setEditingId(null);
      } else {
        const result = await foodService.addPlace({
          care_space_id: careSpace.id,
          created_by: user.id,
          food_name: foodName,
          restaurant_name: restaurantName,
          district,
          address,
          location_note: locationNote,
          google_maps_url: googleMapsUrl,
          category,
          cuisine_type: category,
          priority: 3,
          status: tried ? 'tried' : 'want_to_try',
          tried,
          image_url: finalImageUrl,
          image_source: imageUrl.trim() ? 'url' : 'svg_generated',
          note
        });
        if (!result) throw new Error("Thêm thất bại. Vui lòng thử lại.");
      }

      resetForm();
      setIsAdding(false);
      loadPlaces();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi khi lưu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (place: FoodPlace) => {
    setFoodName(place.food_name);
    setRestaurantName(place.restaurant_name || '');
    setDistrict(place.district || 'Quận 1');
    setAddress(place.address || '');
    setLocationNote(place.location_note || '');
    setGoogleMapsUrl(place.google_maps_url || '');
    setTried(place.tried);
    setImageUrl(place.image_source === 'url' ? place.image_url || '' : '');
    setCategory(place.category || 'Lẩu');
    setNote(place.note || '');
    setEditingId(place.id);
    setIsAdding(true);
    setSelectedPlace(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa món này?')) {
      await foodService.deletePlace(id);
      setSelectedPlace(null);
      loadPlaces();
    }
  };


  const toggleTried = async (place: FoodPlace) => {
    const newStatus: FoodStatus = place.tried ? 'want_to_try' : 'tried';
    await foodService.updatePlace(place.id, { tried: !place.tried, status: newStatus });
    if (!place.tried) {
      setShowConfettiFor(place.id);
    }
    loadPlaces();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-main flex items-center gap-3">
            <Utensils className="w-8 h-8 text-brand-accent" />
            Món ngon muốn thử
          </h1>
          <p className="text-text-soft mt-2 text-sm max-w-lg">
            Lưu lại những món ăn hấp dẫn để chúng mình cùng nhau thưởng thức nhé.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isAdding && (
            <RandomFoodPicker 
              places={places.filter(place => {
                const matchDistrict = filterDistrict === 'Tất cả' || place.district === filterDistrict;
                const matchCategory = filterCategory === 'Tất cả' || place.category === filterCategory;
                return matchDistrict && matchCategory;
              })} 
              onMarkAsTried={async (place) => {
                if (!place.tried) {
                  await toggleTried(place);
                }
              }} 
            />
          )}
          <Button 
            onClick={() => setIsAdding(!isAdding)}
            className={`px-6 py-2.5 rounded-pill font-bold shadow-sm transition-all ${
              isAdding 
                ? 'bg-canvas-ceramic text-text-main hover:bg-gray-100 border border-gray-200' 
                : 'bg-brand text-white hover:bg-brand-accent'
            }`}
          >
            {isAdding ? 'Hủy nhập' : '+ Thêm món ăn'}
          </Button>
        </div>
      </div>

      {isAdding && (
        <Card className="bg-white border border-brand-light shadow-card rounded-card overflow-hidden">
          <form onSubmit={handleSubmit} className="p-4 space-y-6">
            <h2 className="font-bold text-xl text-text-main border-b border-canvas-cool pb-4">
              {editingId ? 'Chỉnh sửa món ngon' : 'Lưu món ngon mới'}
            </h2>
            
            {error && (
              <div className="p-3 mb-4 text-sm text-semantic-destructive bg-semantic-destructive/10 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-5">
                <div>
                  <label className="block text-[13px] font-bold text-text-soft mb-1.5 uppercase tracking-wider">
                    Tên món ăn <span className="text-semantic-destructive">*</span>
                  </label>
                  <input 
                    type="text"
                    placeholder="Ví dụ: Lẩu Thái chua cay..."
                    value={foodName}
                    onChange={e => setFoodName(e.target.value)}
                    className="w-full bg-canvas-cool border border-gray-200 focus:border-brand-accent rounded-lg px-4 py-3 outline-none transition-colors text-text-main text-[15px]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-text-soft mb-1.5 uppercase tracking-wider">
                    Tên quán / nhà hàng
                  </label>
                  <input 
                    type="text"
                    placeholder="Ví dụ: Haidilao..."
                    value={restaurantName}
                    onChange={e => setRestaurantName(e.target.value)}
                    className="w-full bg-canvas-cool border border-gray-200 focus:border-brand-accent rounded-lg px-4 py-3 outline-none transition-colors text-text-main text-[15px]"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-text-soft mb-1.5 uppercase tracking-wider">
                    Quận / huyện
                  </label>
                  <select 
                    value={district} 
                    onChange={e => setDistrict(e.target.value)}
                    className="w-full bg-canvas-cool border border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-brand-accent transition-colors text-text-main text-[15px]"
                  >
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-text-soft mb-1.5 uppercase tracking-wider">
                    Địa chỉ chi tiết
                  </label>
                  <input 
                    type="text"
                    placeholder="Ví dụ: 247 Đường số 1..."
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full bg-canvas-cool border border-gray-200 focus:border-brand-accent rounded-lg px-4 py-3 outline-none transition-colors text-text-main text-[15px]"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-text-soft mb-1.5 uppercase tracking-wider">
                    Ghi chú địa điểm
                  </label>
                  <input 
                    type="text"
                    placeholder="Ví dụ: Gửi xe bên hẻm cạnh, nằm ở lầu 2..."
                    value={locationNote}
                    onChange={e => setLocationNote(e.target.value)}
                    className="w-full bg-canvas-cool border border-gray-200 focus:border-brand-accent rounded-lg px-4 py-3 outline-none transition-colors text-text-main text-[15px]"
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-5">
                <div>
                  <label className="block text-[13px] font-bold text-text-soft mb-1.5 uppercase tracking-wider">
                    Link Google Maps
                  </label>
                  <input 
                    type="text"
                    placeholder="https://maps.google.com/..."
                    value={googleMapsUrl}
                    onChange={e => setGoogleMapsUrl(e.target.value)}
                    className="w-full bg-canvas-cool border border-gray-200 focus:border-brand-accent rounded-lg px-4 py-3 outline-none transition-colors text-text-main text-[15px]"
                  />
                </div>
                
                <div>
                  <label className="block text-[13px] font-bold text-text-soft mb-1.5 uppercase tracking-wider">
                    Trạng thái trải nghiệm
                  </label>
                  <div 
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${
                      tried 
                        ? 'border-brand-accent bg-brand-light/20' 
                        : 'border-gray-200 bg-canvas-cool hover:border-gray-300'
                    }`}
                    onClick={() => setTried(!tried)}
                  >
                    <div className="flex-shrink-0">
                      {tried ? <CheckCircle2 className="w-5 h-5 text-brand-accent" /> : <Circle className="w-5 h-5 text-text-soft" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-text-main text-sm">Đã ăn món này chưa?</h4>
                      <p className="text-[11px] text-text-soft mt-0.5">Đánh dấu tích nếu đôi bạn đã cùng nhau trải nghiệm!</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-text-soft mb-1.5 uppercase tracking-wider">
                    Hình ảnh món ăn (URL)
                  </label>
                  <input 
                    type="text"
                    placeholder="https://..."
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    className="w-full bg-canvas-cool border border-gray-200 focus:border-brand-accent rounded-lg px-4 py-3 outline-none transition-colors text-text-main text-[15px]"
                  />
                </div>
                
                <div>
                  <label className="block text-[13px] font-bold text-text-soft mb-1.5 uppercase tracking-wider">
                    Phân loại
                  </label>
                  <select 
                    value={category} 
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-canvas-cool border border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-brand-accent transition-colors text-text-main text-[15px]"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] font-bold text-text-soft mb-1.5 uppercase tracking-wider">
                    Mong muốn / ghi chú
                  </label>
                  <textarea 
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Thêm lý do vì sao muốn ăn món này..."
                    className="w-full bg-canvas-cool border border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-brand-accent transition-colors resize-none h-24 text-text-main text-[15px]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-canvas-cool mt-6">
              <Button type="button" onClick={() => setIsAdding(false)} className="bg-canvas-ceramic text-text-main border border-gray-200">Hủy</Button>
              <Button type="submit" className="bg-brand text-white hover:bg-brand-accent" disabled={isSubmitting}>
                {isSubmitting ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Lưu địa điểm')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filter Toolbar */}
      {!isAdding && places.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-canvas-dark shadow-sm">
          <div className="flex-1">
            <label className="block text-xs font-bold text-text-soft mb-1 uppercase tracking-wider">Lọc theo Quận</label>
            <select 
              value={filterDistrict} 
              onChange={e => setFilterDistrict(e.target.value)}
              className="w-full bg-canvas-cool border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-brand transition-colors text-text-main text-sm cursor-pointer"
            >
              <option value="Tất cả">Tất cả quận</option>
              {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-text-soft mb-1 uppercase tracking-wider">Lọc theo Phân loại</label>
            <select 
              value={filterCategory} 
              onChange={e => setFilterCategory(e.target.value)}
              className="w-full bg-canvas-cool border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-brand transition-colors text-text-main text-sm cursor-pointer"
            >
              <option value="Tất cả">Tất cả phân loại</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading && (
          <>
            <Skeleton className="h-[24rem]" />
            <Skeleton className="h-[24rem]" />
            <Skeleton className="h-[24rem]" />
          </>
        )}
        
        {!isLoading && places.filter(place => {
          const matchDistrict = filterDistrict === 'Tất cả' || place.district === filterDistrict;
          const matchCategory = filterCategory === 'Tất cả' || place.category === filterCategory;
          return matchDistrict && matchCategory;
        }).map(place => (
          <Card 
            key={place.id} 
            padding="none" 
            className="flex flex-col overflow-hidden hover:shadow-frap-ambient transition-all border border-gray-100 rounded-[24px] cursor-pointer"
            onClick={() => setSelectedPlace(place)}
          >
            {/* Image Header */}
            <div className="h-48 relative bg-gradient-to-br from-brand-light to-canvas-cool flex items-center justify-center">
              {/* Image — always renders SVG if no URL provided */}
              <img
                src={place.image_url || ''}
                alt={place.food_name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback should not happen since we generate SVG at save time,
                  // but just in case, hide broken image gracefully
                  e.currentTarget.style.display = 'none';
                }}
              />
              
              {/* Top Pills */}
              <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                <span className="bg-white/90 backdrop-blur text-brand-accent text-xs font-bold px-3 py-1.5 rounded-pill shadow-sm">
                  {place.category}
                </span>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-pill shadow-sm backdrop-blur flex items-center gap-1.5 ${
                  place.tried ? 'bg-brand/90 text-white' : 'bg-white/90 text-text-soft'
                }`}>
                  {place.tried ? <AnimatedCheck size={14} color="#fff" /> : null}
                  {place.tried ? 'Đã ăn' : 'Chưa ăn'}
                </span>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-5 flex-1 flex flex-col">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-text-main line-clamp-2 leading-tight">
                  {place.food_name}
                </h3>
                {place.restaurant_name && (
                  <p className="text-brand-accent font-semibold mt-1">{place.restaurant_name}</p>
                )}
              </div>
              
              <div className="space-y-2 mb-6 flex-1">
                {(place.district || place.address) && (
                  <div className="flex items-start gap-2 text-sm text-text-soft">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-brand-house" />
                    <div>
                      {place.district && <span className="font-semibold block">{place.district}</span>}
                      {place.address && <span>{place.address}</span>}
                    </div>
                  </div>
                )}
                {place.note && (
                  <div className="bg-canvas p-3 rounded-xl text-sm text-text-main italic mt-3 border border-brand-light/50">
                    "{place.note}"
                  </div>
                )}
              </div>
              
              {/* Footer Actions */}
              <div className="mt-auto pt-4 border-t border-canvas-cool flex items-center justify-between gap-3" onClick={e => e.stopPropagation()}>
                <motion.button
                  onClick={() => toggleTried(place)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
                    place.tried 
                      ? 'bg-canvas-cool text-text-soft hover:bg-gray-200' 
                      : 'bg-brand-light text-brand-house hover:bg-brand hover:text-white'
                  }`}
                  whileTap={{ scale: 0.88 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                >
                  <div className="flex items-center justify-center gap-1.5 relative">
                    {place.tried ? 'Đánh dấu chưa ăn' : 'Đánh dấu đã ăn'}
                    {showConfettiFor === place.id && <MiniConfetti onComplete={() => setShowConfettiFor(null)} />}
                  </div>
                </motion.button>
                {place.google_maps_url && (
                  <a 
                    href={place.google_maps_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-canvas-cool text-brand-accent hover:bg-brand-light transition-colors"
                    title="Mở Google Maps"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          </Card>
        ))}
        {places.length > 0 && places.filter(place => {
          const matchDistrict = filterDistrict === 'Tất cả' || place.district === filterDistrict;
          const matchCategory = filterCategory === 'Tất cả' || place.category === filterCategory;
          return matchDistrict && matchCategory;
        }).length === 0 && !isAdding && !isLoading && (
          <div className="md:col-span-2 lg:col-span-3 text-center py-16 px-4">
            <div className="bg-white rounded-card shadow-card max-w-md mx-auto p-8 border border-brand-light">
              <div className="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-4">
                <Utensils className="w-8 h-8 text-brand" />
              </div>
              <h3 className="text-lg font-bold text-text-main mb-2">Không tìm thấy món nào</h3>
              <p className="text-text-soft text-sm">Thử thay đổi bộ lọc hoặc thêm món mới nhé.</p>
            </div>
          </div>
        )}
        {!isLoading && places.length === 0 && !isAdding && (
          <div className="md:col-span-2 lg:col-span-3 text-center py-16 px-4">
            <div className="bg-white rounded-card shadow-card max-w-md mx-auto p-8 border border-brand-light">
              <div className="w-16 h-16 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-4">
                <Utensils className="w-8 h-8 text-brand-accent" />
              </div>
              <h3 className="text-lg font-bold text-text-main mb-2">Mục tiêu ẩm thực trống</h3>
              <p className="text-text-soft text-sm">Chưa có món nào được lưu. Hãy thêm món đầu tiên để hai bạn cùng thử nhé.</p>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal Popup */}
      <AnimatePresence>
        {selectedPlace && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedPlace(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-[24px] shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="h-48 relative shrink-0 bg-canvas-cool">
                <img
                  src={selectedPlace.image_url || ''}
                  alt={selectedPlace.food_name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setSelectedPlace(null)}
                  className="absolute top-4 right-4 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors backdrop-blur-sm"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-text-main leading-tight mb-1">
                      {selectedPlace.food_name}
                    </h2>
                    {selectedPlace.restaurant_name && (
                      <p className="text-brand-accent font-semibold">{selectedPlace.restaurant_name}</p>
                    )}
                  </div>
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-pill shadow-sm shrink-0 flex items-center gap-1.5 ${
                    selectedPlace.tried ? 'bg-brand/10 text-brand' : 'bg-canvas-dark text-text-soft'
                  }`}>
                    {selectedPlace.tried ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                    {selectedPlace.tried ? 'Đã ăn' : 'Chưa ăn'}
                  </span>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                    <div className="text-text-main">
                      {selectedPlace.district && <span className="font-semibold block">{selectedPlace.district}</span>}
                      {selectedPlace.address && <span className="block">{selectedPlace.address}</span>}
                      {selectedPlace.location_note && <span className="block text-text-soft italic mt-1">{selectedPlace.location_note}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 text-sm">
                    <Utensils className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                    <span className="text-text-main font-semibold">{selectedPlace.category}</span>
                  </div>
                  {selectedPlace.note && (
                    <div className="bg-brand-light/20 p-4 rounded-xl border border-brand-light mt-4">
                      <span className="text-xs font-bold text-brand uppercase tracking-wider block mb-1">Ghi chú</span>
                      <p className="text-sm text-text-main leading-relaxed">"{selectedPlace.note}"</p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3 pt-4 border-t border-canvas-cool mt-auto">
                  <Button 
                    variant="outline" 
                    className="flex-1 text-semantic-destructive border-semantic-destructive hover:bg-semantic-destructive/10"
                    onClick={() => handleDelete(selectedPlace.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Xóa món
                  </Button>
                  <Button 
                    className="flex-1 bg-brand text-white hover:bg-brand-accent"
                    onClick={() => handleEdit(selectedPlace)}
                  >
                    <Edit2 className="w-4 h-4 mr-2" /> Chỉnh sửa
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
