import React, { useState, useRef } from 'react';
import styles from '@/app/profile/Profile.module.css';
import { IconX, IconMinus, IconPlus } from '@/components/ui/Icon';
import { useAppStore } from '@/store/useAppStore';

export function ProfilePhotoForm({ onClose }: { onClose: () => void }) {
  const { user } = useAppStore();
  const [imageSrc, setImageSrc] = useState<string | null>(user?.avatarUrl || null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        alert('Lütfen geçerli bir resim dosyası seçin (jpg, png, webp).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Dosya boyutu 5MB\'dan küçük olmalıdır.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
        setZoom(1);
        setPosition({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePointerDown = (clientX: number, clientY: number) => {
    if (!imageSrc) return;
    setIsDragging(true);
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging || !imageSrc) return;
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleSave = () => {
    console.log('Save profile photo clicked', { zoom, position, imageSrc });
    alert('Profil fotoğrafınız başarıyla güncellendi (Demo)');
    onClose();
  };

  const handleRemove = () => {
    setImageSrc(null);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div className={styles.photoModalOverlay} onClick={onClose}>
      <div className={styles.photoModal} onClick={e => e.stopPropagation()}>
        <div className={styles.photoModalHeader}>
          <div>
            <h2>Profil Fotoğrafını Düzenle</h2>
            <p>Fotoğrafını yükle, yakınlaştır ve profil alanına uygun şekilde konumlandır.</p>
          </div>
          <button className={styles.closeButton} onClick={onClose} title="Kapat">
            <IconX size={20} />
          </button>
        </div>

        <div className={styles.photoModalBody}>
          <div className={styles.cropPreviewWrapper}>
            <div 
              className={styles.cropCircle}
              onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
              onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={(e) => handlePointerDown(e.touches[0].clientX, e.touches[0].clientY)}
              onTouchMove={(e) => handlePointerMove(e.touches[0].clientX, e.touches[0].clientY)}
              onTouchEnd={handlePointerUp}
            >
              {imageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={imageSrc} 
                  alt="Crop preview" 
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                  }}
                  draggable={false}
                />
              ) : (
                <div className={styles.cropInitials}>
                  {user?.firstName?.[0] || 'A'}{user?.lastName?.[0] || 'Y'}
                </div>
              )}
            </div>
          </div>

          <p className={styles.helpText}>Fotoğrafı sürükleyerek konumunu ayarlayabilirsin.</p>

          <div className={styles.photoActions}>
            <button className={styles.selectPhotoButton} onClick={() => fileInputRef.current?.click()}>
              Fotoğraf Seç
            </button>
            <button className={styles.removePhotoButton} onClick={handleRemove}>
              Fotoğrafı Kaldır
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/jpeg, image/png, image/webp" 
              style={{ display: 'none' }} 
            />
          </div>

          <div className={styles.zoomControlCard}>
            <div className={styles.zoomHeader}>
              <span>Yakınlaştırma</span>
              <span>%{Math.round(zoom * 100)}</span>
            </div>
            <div className={styles.zoomSliderRow}>
              <IconMinus size={16} className={styles.zoomIcon} />
              <input 
                type="range" 
                className={styles.zoomSlider} 
                min="0.5" max="3" step="0.05" 
                value={zoom} 
                onChange={(e) => setZoom(parseFloat(e.target.value))} 
                disabled={!imageSrc}
              />
              <IconPlus size={16} className={styles.zoomIcon} />
            </div>
          </div>
        </div>

        <div className={styles.photoModalFooter}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>
            İptal
          </button>
          <button type="button" className={styles.saveButton} onClick={handleSave}>
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
