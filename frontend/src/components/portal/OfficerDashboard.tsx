'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface OfficerDashboardProps {
  user: any;
}

export default function OfficerDashboard({ user }: OfficerDashboardProps) {
  const queryClient = useQueryClient();
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [proofUrl, setProofUrl] = useState('');
  const [note, setNote] = useState('');
  const [actionType, setActionType] = useState<'RESOLVED_PENDING_APPROVAL' | 'REJECTED_PENDING_APPROVAL' | 'IN_REVIEW'>('RESOLVED_PENDING_APPROVAL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterTab, setFilterTab] = useState<'ALL' | 'OPEN' | 'IN_REVIEW' | 'PENDING' | 'REVISION'>('ALL');

  const { data, isLoading, error } = useQuery({
    queryKey: ['portal-issues'],
    queryFn: async () => {
      const response: any = await api.get('/admin/portal/issues?limit=100');
      return response.data || [];
    },
  });

  const issues = data ?? [];

  const filteredIssues = issues.filter((issue: any) => {
    if (filterTab === 'OPEN') return issue.status === 'OPEN';
    if (filterTab === 'IN_REVIEW') return issue.status === 'IN_REVIEW' && !issue.adminReviewNote;
    if (filterTab === 'PENDING') return issue.status === 'RESOLVED_PENDING_APPROVAL' || issue.status === 'REJECTED_PENDING_APPROVAL';
    if (filterTab === 'REVISION') return issue.status === 'IN_REVIEW' && issue.adminReviewNote;
    return true;
  });

  const handleOpenModal = (issue: any) => {
    setSelectedIssue(issue);
    setProofUrl(issue.proofImageUrl || '');
    setNote(issue.resolutionNote || '');
    setActionType(issue.status === 'RESOLVED_PENDING_APPROVAL' ? 'RESOLVED_PENDING_APPROVAL' : 'RESOLVED_PENDING_APPROVAL');
  };

  const handleCloseModal = () => {
    setSelectedIssue(null);
    setProofUrl('');
    setNote('');
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;

    if (actionType === 'RESOLVED_PENDING_APPROVAL' && !proofUrl.trim()) {
      toast.error('Çözüm onayı için kanıt fotoğrafı URL adresi girmeniz zorunludur!');
      return;
    }

    if (!note.trim()) {
      toast.error('Lütfen yapılan işlem veya red gerekçesi hakkında açıklama yazın!');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.patch(`/issues/${selectedIssue.id}/officer-submit`, {
        status: actionType,
        proofImageUrl: proofUrl.trim() || undefined,
        resolutionNote: note.trim(),
      });
      toast.success(
        actionType === 'RESOLVED_PENDING_APPROVAL'
          ? '🎉 Çözüm kanıtı yüklendi ve Süper Yönetici onayına iletildi!'
          : actionType === 'REJECTED_PENDING_APPROVAL'
          ? 'Red talebi Süper Yönetici onayına iletildi.'
          : 'Sorun incelemeye alındı.'
      );
      queryClient.invalidateQueries({ queryKey: ['portal-issues'] });
      queryClient.invalidateQueries({ queryKey: ['portal-stats'] });
      handleCloseModal();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'İşlem başarısız oldu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const STATUS_LABELS: Record<string, string> = {
    OPEN: 'Açık (Acil)',
    IN_REVIEW: 'İnceleniyor',
    RESOLVED_PENDING_APPROVAL: '⏳ Çözüm Onayı Bekliyor',
    REJECTED_PENDING_APPROVAL: '⏳ Red Onayı Bekliyor',
    RESOLVED: '✅ Çözüldü',
    REJECTED: '❌ Reddedildi',
  };

  const STATUS_COLORS: Record<string, string> = {
    OPEN: '#ef4444',
    IN_REVIEW: '#3b82f6',
    RESOLVED_PENDING_APPROVAL: '#f59e0b',
    REJECTED_PENDING_APPROVAL: '#f97316',
    RESOLVED: '#10b981',
    REJECTED: '#64748b',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Officer Welcome & Alert Bar */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', color: '#fff', padding: '24px', border: '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0', color: '#38bdf8' }}>
              🏢 {user?.institution?.name || 'Saha Operasyon Masası'}
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>
              Yetki Alanı: {user?.institution?.city || user?.city || 'Bölge Sınırları'} | Sahadaki ihbarları inceleyebilir, müdahale edip kanıt fotoğrafı ile admin onayına sunabilirsiniz.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', padding: '10px 16px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#ef4444' }}>
                {issues.filter((i: any) => i.status === 'OPEN').length}
              </div>
              <div style={{ fontSize: '11px', color: '#fca5a5' }}>Acil / Açık İhbar</div>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b', padding: '10px 16px', borderRadius: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#f59e0b' }}>
                {issues.filter((i: any) => i.status === 'RESOLVED_PENDING_APPROVAL' || i.status === 'REJECTED_PENDING_APPROVAL').length}
              </div>
              <div style={{ fontSize: '11px', color: '#fde68a' }}>Onay Bekleyen</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {[
          { key: 'ALL', label: `Tüm İhbarlar (${issues.length})` },
          { key: 'OPEN', label: `🚨 Acil Açık (${issues.filter((i: any) => i.status === 'OPEN').length})` },
          { key: 'IN_REVIEW', label: `🔄 İnceleniyor (${issues.filter((i: any) => i.status === 'IN_REVIEW' && !i.adminReviewNote).length})` },
          { key: 'REVISION', label: `⚠️ Revizyon İstenenler (${issues.filter((i: any) => i.status === 'IN_REVIEW' && i.adminReviewNote).length})` },
          { key: 'PENDING', label: `⏳ Admin Onayında (${issues.filter((i: any) => i.status === 'RESOLVED_PENDING_APPROVAL' || i.status === 'REJECTED_PENDING_APPROVAL').length})` },
        ].map((tab: any) => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key)}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              border: filterTab === tab.key ? '2px solid #3b82f6' : '1px solid var(--color-border)',
              background: filterTab === tab.key ? 'rgba(59, 130, 246, 0.12)' : 'var(--color-surface)',
              color: filterTab === tab.key ? '#3b82f6' : 'var(--color-text)',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Issues Table */}
      <div className="card" style={{ overflowX: 'auto', padding: '0' }}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>İhbarlar Yükleniyor...</div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>Veriler yüklenirken hata oluştu.</div>
        ) : filteredIssues.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Bu kategoride kayıt bulunamadı.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                <th style={{ padding: '14px 18px' }}>Başlık & Konum</th>
                <th style={{ padding: '14px 18px' }}>Kategori & Öncelik</th>
                <th style={{ padding: '14px 18px' }}>Durum & Notlar</th>
                <th style={{ padding: '14px 18px' }}>Tarih</th>
                <th style={{ padding: '14px 18px', textAlign: 'right' }}>Aksiyon</th>
              </tr>
            </thead>
            <tbody>
              {filteredIssues.map((issue: any) => (
                <tr key={issue.id} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '14px', transition: 'background 0.15s' }}>
                  <td style={{ padding: '16px 18px', maxWidth: '280px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--color-text)', marginBottom: '4px' }}>{issue.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      📍 {issue.city} / {issue.district}
                    </div>
                  </td>
                  <td style={{ padding: '16px 18px' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{issue.category}</div>
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: issue.priority === 'CRITICAL' || issue.priority === 'HIGH' ? '#fee2e2' : '#f1f5f9', color: issue.priority === 'CRITICAL' || issue.priority === 'HIGH' ? '#dc2626' : '#475569' }}>
                      {issue.priority}
                    </span>
                  </td>
                  <td style={{ padding: '16px 18px' }}>
                    <span style={{
                      display: 'inline-block',
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: `${STATUS_COLORS[issue.status] || '#64748b'}20`,
                      color: STATUS_COLORS[issue.status] || '#64748b',
                      border: `1px solid ${STATUS_COLORS[issue.status] || '#64748b'}40`,
                      marginBottom: issue.adminReviewNote ? '6px' : '0'
                    }}>
                      {STATUS_LABELS[issue.status] || issue.status}
                    </span>
                    {issue.adminReviewNote && (
                      <div style={{ fontSize: '11px', color: '#dc2626', background: '#fee2e2', padding: '6px 8px', borderRadius: '6px', marginTop: '4px' }}>
                        <strong>Admin Revizyon Notu:</strong> {issue.adminReviewNote}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '16px 18px', fontSize: '13px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                    {format(new Date(issue.created_at || issue.createdAt || Date.now()), 'dd MMM yyyy, HH:mm', { locale: tr })}
                  </td>
                  <td style={{ padding: '16px 18px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => handleOpenModal(issue)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        background: issue.status === 'RESOLVED' ? '#f1f5f9' : '#2563eb',
                        color: issue.status === 'RESOLVED' ? '#64748b' : '#fff',
                        fontWeight: 600,
                        fontSize: '12px',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: issue.status === 'RESOLVED' ? 'none' : '0 2px 6px rgba(37, 99, 235, 0.3)',
                      }}
                    >
                      {issue.status === 'RESOLVED_PENDING_APPROVAL' || issue.status === 'REJECTED_PENDING_APPROVAL'
                        ? '📄 Kanıtı / Raporu Güncelle'
                        : issue.status === 'RESOLVED'
                        ? '🔍 Detayları Gör'
                        : '🛠️ Müdahale & Çözüm Ekle'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Proof of Work & Action Modal */}
      {selectedIssue && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '28px', background: 'var(--color-surface)', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--color-border)', paddingBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--color-text)' }}>
                🛠️ Saha Çözüm & İşlem Bildirimi
              </h3>
              <button onClick={handleCloseModal} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>✕</button>
            </div>

            <div style={{ background: 'var(--color-surface-hover)', padding: '14px', borderRadius: '10px', marginBottom: '20px', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--color-text)' }}>{selectedIssue.title}</div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>{selectedIssue.description}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                📍 {selectedIssue.city} / {selectedIssue.district} — {selectedIssue.address || 'Adres bilgisi yok'}
              </div>
              {selectedIssue.imageUrl && (
                <div style={{ marginTop: '10px' }}>
                  <a href={selectedIssue.imageUrl} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 600, textDecoration: 'underline' }}>
                    🖼️ Vatandaşın Yüklediği Fotoğrafı İncele →
                  </a>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmitProof} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text)' }}>
                  Yapılacak İşlem Türü
                </label>
                <select
                  value={actionType}
                  onChange={(e: any) => setActionType(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '14px' }}
                >
                  <option value="RESOLVED_PENDING_APPROVAL">✅ Sorunu Çözdük (Kanıtlı Onaya Gönder)</option>
                  <option value="IN_REVIEW">🔄 Saha Ekibine Atandı / İnceleniyor</option>
                  <option value="REJECTED_PENDING_APPROVAL">❌ Yetki Dışı / Asılsız İhbar (Red Onaya Gönder)</option>
                </select>
              </div>

              {actionType === 'RESOLVED_PENDING_APPROVAL' && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text)' }}>
                    📸 Çözüm Kanıt Fotoğrafı URL (Zorunlu)
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/cozum-fotografi.jpg"
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '14px' }}
                  />
                  <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    Sorunun giderildiğini gösteren net bir fotoğraf bağlantısı girin. Süper Yönetici bu görseli ilk fotoğrafla karşılaştırıp onay verecektir.
                  </small>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text)' }}>
                  📝 Teknik Çözüm Raporu / Açıklama (Zorunlu)
                </label>
                <textarea
                  rows={4}
                  placeholder="Sahada yapılan müdahale detaylarını, değiştirilen malzemeleri veya red gerekçesini yazın..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '14px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{ padding: '10px 18px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontWeight: 600, cursor: 'pointer' }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    background: actionType === 'RESOLVED_PENDING_APPROVAL' ? '#10b981' : actionType === 'REJECTED_PENDING_APPROVAL' ? '#f97316' : '#3b82f6',
                    color: '#fff',
                    fontWeight: 700,
                    border: 'none',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                >
                  {isSubmitting ? 'Gönderiliyor...' : '🚀 İşlemi Kaydet & Onaya Sun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
