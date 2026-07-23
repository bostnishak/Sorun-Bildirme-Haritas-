'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ApprovalHub() {
  const queryClient = useQueryClient();
  const [selectedIssueForRevision, setSelectedIssueForRevision] = useState<any | null>(null);
  const [revisionNote, setRevisionNote] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-approvals'],
    queryFn: async () => {
      const response: any = await api.get('/admin/approvals');
      return response.data || [];
    },
  });

  const approvals = data ?? [];

  const handleApprove = async (issue: any) => {
    if (!window.confirm(`"${issue.title}" başvurusunun ${issue.status === 'RESOLVED_PENDING_APPROVAL' ? 'ÇÖZÜMÜNÜ' : 'REDDİNİ'} onaylamak istediğinize emin misiniz?`)) return;

    try {
      setIsProcessing(issue.id);
      await api.post(`/admin/approvals/${issue.id}/decide`, {
        decision: 'APPROVE',
      });
      toast.success('Karar başarıyla onaylandı ve vatandaşa/çalışana bildirildi.');
      queryClient.invalidateQueries({ queryKey: ['admin-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['portal-issues'] });
      queryClient.invalidateQueries({ queryKey: ['portal-stats'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Onay işlemi başarısız.');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleOpenRevisionModal = (issue: any) => {
    setSelectedIssueForRevision(issue);
    setRevisionNote('');
  };

  const handleCloseRevisionModal = () => {
    setSelectedIssueForRevision(null);
    setRevisionNote('');
  };

  const handleSubmitRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssueForRevision) return;

    if (!revisionNote.trim()) {
      toast.error('Lütfen çalışana neden revizyon/düzeltme istediğinize dair not yazın!');
      return;
    }

    try {
      setIsProcessing(selectedIssueForRevision.id);
      await api.post(`/admin/approvals/${selectedIssueForRevision.id}/decide`, {
        decision: 'REQUEST_REVISION',
        adminNote: revisionNote.trim(),
      });
      toast.success('Revizyon talebi çalışana iletildi, durum "İnceleniyor" olarak geri çekildi.');
      queryClient.invalidateQueries({ queryKey: ['admin-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['portal-issues'] });
      queryClient.invalidateQueries({ queryKey: ['portal-stats'] });
      handleCloseRevisionModal();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Revizyon isteği başarısız.');
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Info Card */}
      <div className="card" style={{ background: 'var(--color-surface)', color: 'var(--color-text)', padding: '24px', border: '1px solid var(--color-border)', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
              <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
                Çözüm ve Red Onay Merkezi (Karşılaştırmalı Denetim)
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              Saha çalışanlarının çözüldü veya reddedildi diyerek ilettiği tüm talepler burada karşılaştırmalı olarak denetlenir. Yetersiz kanıtları revizyona iade edebilir veya onaylayıp puanlayabilirsiniz.
            </p>
          </div>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '12px 22px', borderRadius: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#d97706' }}>
              {approvals.length}
            </div>
            <div style={{ fontSize: '12px', color: '#92400e', fontWeight: 600 }}>Bekleyen Karar</div>
          </div>
        </div>
      </div>

      {/* Approvals Grid */}
      {isLoading ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>Onay bekleyen talepler yükleniyor...</div>
      ) : error ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#dc2626', border: '1px solid var(--color-border)' }}>Talepler yüklenirken hata oluştu.</div>
      ) : approvals.length === 0 ? (
        <div className="card" style={{ padding: '60px 20px', textAlign: 'center', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: '#ecfdf5', color: '#059669', marginBottom: '16px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <h4 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 8px 0' }}>Harika! Bekleyen Hiçbir Onay Talebi Yok</h4>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', margin: 0 }}>
            Tüm saha çalışanlarının ilettiği çözümler ve red talepleri incelenip karara bağlanmış durumda.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 450px), 1fr))', gap: '20px' }}>
          {approvals.map((issue: any) => (
            <div
              key={issue.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '24px',
                border: issue.status === 'RESOLVED_PENDING_APPROVAL' ? '1px solid #a7f3d0' : '1px solid #fed7aa',
                background: 'var(--color-surface)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              }}
            >
              <div>
                {/* Status Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: issue.status === 'RESOLVED_PENDING_APPROVAL' ? '#ecfdf5' : '#fff7ed',
                    color: issue.status === 'RESOLVED_PENDING_APPROVAL' ? '#059669' : '#ea580c',
                    border: issue.status === 'RESOLVED_PENDING_APPROVAL' ? '1px solid #6ee7b7' : '1px solid #fdba74',
                  }}>
                    {issue.status === 'RESOLVED_PENDING_APPROVAL' ? 'ÇÖZÜM ONAYI BEKLİYOR' : 'RED ONAYI BEKLİYOR'}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    {format(new Date(issue.updated_at || issue.updatedAt || Date.now()), 'dd MMM HH:mm', { locale: tr })}
                  </span>
                </div>

                <h4 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px 0' }}>{issue.title}</h4>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 12px 0' }}>{issue.description}</p>
                
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '16px', background: 'var(--color-surface-hover)', padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <strong>Konum:</strong> {issue.city} / {issue.district} — {issue.address || 'Belirtilmedi'}
                </div>

                {/* Before vs After Comparison */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ background: 'var(--color-surface-hover)', padding: '10px', borderRadius: '10px', border: '1px dashed var(--color-border)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', marginBottom: '6px' }}>ÖNCESİ (İlk İhbar)</div>
                    {issue.imageUrl ? (
                      <a href={issue.imageUrl} target="_blank" rel="noreferrer">
                        <img src={issue.imageUrl} alt="Öncesi" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--color-border)' }} />
                      </a>
                    ) : (
                      <div style={{ width: '100%', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.03)', borderRadius: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>Görsel Yok</div>
                    )}
                  </div>

                  <div style={{ background: 'var(--color-surface-hover)', padding: '10px', borderRadius: '10px', border: '1px dashed var(--color-border)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#059669', marginBottom: '6px' }}>
                      {issue.status === 'RESOLVED_PENDING_APPROVAL' ? 'SONRASI (Saha Kanıtı)' : 'RED / KANIT GÖRSELİ'}
                    </div>
                    {issue.proofImageUrl ? (
                      <a href={issue.proofImageUrl} target="_blank" rel="noreferrer">
                        <img src={issue.proofImageUrl} alt="Sonrası" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #10b981' }} />
                      </a>
                    ) : (
                      <div style={{ width: '100%', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.03)', borderRadius: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>Kanıt Görseli Yüklenmemiş</div>
                    )}
                  </div>
                </div>

                {/* Officer Resolution Note */}
                <div style={{ background: '#eff6ff', borderLeft: '4px solid #2563eb', padding: '12px', borderRadius: '8px', marginBottom: '18px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e40af', marginBottom: '4px' }}>
                    SAHA YETKİLİSİ RAPORU VE AÇIKLAMASI:
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--color-text)', fontStyle: 'italic' }}>
                    "{issue.resolutionNote || 'Açıklama girilmedi.'}"
                  </div>
                  <div style={{ fontSize: '11px', color: '#3b82f6', marginTop: '6px' }}>
                    İşlemi Yapan: {issue.assignedOfficer?.firstName || issue.assignedOfficer?.email || 'Yetkili Personel'}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                <button
                  onClick={() => handleOpenRevisionModal(issue)}
                  disabled={isProcessing === issue.id}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'var(--color-surface)',
                    border: '1px solid #fca5a5',
                    color: '#dc2626',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: isProcessing === issue.id ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  Revizyon İste (İade)
                </button>
                <button
                  onClick={() => handleApprove(issue)}
                  disabled={isProcessing === issue.id}
                  style={{
                    flex: 1.3,
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: issue.status === 'RESOLVED_PENDING_APPROVAL' ? '#059669' : '#475569',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '13px',
                    border: 'none',
                    cursor: isProcessing === issue.id ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(5, 150, 105, 0.2)',
                    transition: 'all 0.2s',
                  }}
                >
                  {isProcessing === issue.id ? 'İşleniyor...' : issue.status === 'RESOLVED_PENDING_APPROVAL' ? 'Çözümü Resmi Onayla' : 'Reddi Resmi Onayla'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Revision Modal */}
      {selectedIssueForRevision && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0, 0, 0, 0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '28px', background: 'var(--color-surface)', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Revizyon (İade) Gerekçesi Yazın
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
              <strong>"{selectedIssueForRevision.title}"</strong> başvurusu için saha çalışanından ne gibi ek çalışmalar veya kanıtlar istediğinizi belirtin.
            </p>

            <form onSubmit={handleSubmitRevision} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <textarea
                rows={4}
                placeholder="Örn: Asfalt yama işlemi tamamlanmış ancak logar kenarında açıklık kalmış, lütfen düzeltilip yeni fotoğraf yüklesin..."
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                required
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '14px' }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={handleCloseRevisionModal}
                  style={{ padding: '10px 18px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontWeight: 600, cursor: 'pointer' }}
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isProcessing === selectedIssueForRevision.id}
                  style={{ padding: '10px 22px', borderRadius: '8px', background: '#dc2626', color: '#fff', fontWeight: 700, border: 'none', cursor: isProcessing === selectedIssueForRevision.id ? 'not-allowed' : 'pointer' }}
                >
                  {isProcessing === selectedIssueForRevision.id ? 'Gönderiliyor...' : 'Revizyona İade Et'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
