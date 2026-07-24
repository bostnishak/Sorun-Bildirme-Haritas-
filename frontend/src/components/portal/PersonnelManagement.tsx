'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function PersonnelManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [targetRole, setTargetRole] = useState<'CITIZEN' | 'INSTITUTION_OFFICER' | 'SUPER_ADMIN'>('INSTITUTION_OFFICER');
  const [targetInstitutionId, setTargetInstitutionId] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  // User Issues State
  const [isIssuesModalOpen, setIsIssuesModalOpen] = useState(false);
  const [userIssues, setUserIssues] = useState<any[]>([]);
  const [isIssuesLoading, setIsIssuesLoading] = useState(false);

  const handleOpenIssuesModal = async (user: any) => {
    setSelectedUser(user);
    setIsIssuesModalOpen(true);
    setIsIssuesLoading(true);
    try {
      const response: any = await api.get(`/admin/users/${user.id}/issues`);
      setUserIssues(response.data || []);
    } catch (err: any) {
      toast.error('Kullanıcı ihbarları alınamadı.');
    } finally {
      setIsIssuesLoading(false);
    }
  };

  const handleCloseIssuesModal = () => {
    setIsIssuesModalOpen(false);
    setSelectedUser(null);
    setUserIssues([]);
  };

  const { data: personnelData, isLoading: isPersonnelLoading } = useQuery({
    queryKey: ['admin-personnel'],
    queryFn: async () => {
      const response: any = await api.get('/admin/personnel');
      return response.data || [];
    },
  });

  const { data: institutionsData } = useQuery({
    queryKey: ['admin-institutions'],
    queryFn: async () => {
      const response: any = await api.get('/admin/institutions');
      return response.data || [];
    },
  });

  const personnel = personnelData ?? [];
  const institutions = institutionsData ?? [];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      toast.error('Lütfen en az 2 karakter girin.');
      return;
    }
    try {
      setIsSearching(true);
      const response: any = await api.get(`/admin/users/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchResults(response.data || []);
      if ((response.data || []).length === 0) {
        toast('Bu kriterle eşleşen kullanıcı bulunamadı.');
      }
    } catch (err: any) {
      toast.error('Kullanıcı arama hatası.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenAssignModal = (user: any) => {
    setSelectedUser(user);
    setTargetRole(user.role || 'INSTITUTION_OFFICER');
    setTargetInstitutionId(user.institutionId || (institutions[0]?.id ?? ''));
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (targetRole === 'INSTITUTION_OFFICER' && !targetInstitutionId) {
      toast.error('Kurum çalışanı rolü için bir kurum atamanız zorunludur!');
      return;
    }

    try {
      setIsUpdating(true);
      await api.patch(`/admin/users/${selectedUser.id}/role`, {
        role: targetRole,
        institutionId: targetRole === 'INSTITUTION_OFFICER' ? targetInstitutionId : null,
      });
      toast.success('Kullanıcı yetkisi ve kurum ataması güncellendi.');
      queryClient.invalidateQueries({ queryKey: ['admin-personnel'] });
      handleCloseModal();
      setSearchResults((prev) => prev.map((u) => (u.id === selectedUser.id ? { ...u, role: targetRole, institutionId: targetRole === 'INSTITUTION_OFFICER' ? targetInstitutionId : null } : u)));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Yetkilendirme başarısız.');
    } finally {
      setIsUpdating(false);
    }
  };

  const ROLE_BADGES: Record<string, { label: string; color: string; bg: string; border: string }> = {
    SUPER_ADMIN: { label: 'Admin', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    INSTITUTION_OFFICER: { label: 'Kurum Yetkilisi', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
    CITIZEN: { label: 'Vatandaş / Üye', color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Search & Description Banner */}
      <div className="card" style={{ background: 'var(--color-surface)', color: 'var(--color-text)', padding: '24px', border: '1px solid var(--color-border)', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
            Kurumsal Personel ve Yetki Yönetimi
          </h3>
        </div>
        <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          Sistemde kayıtlı vatandaşları arayarak yetkilerini yükseltebilir, belediye veya kurumlara görevlendirebilirsiniz. Kurum çalışanları sadece atandıkları kurumun sınırları içindeki sorunlara müdahale edebilir.
        </p>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '260px', position: 'relative', display: 'flex', alignItems: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '14px' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              placeholder="Kullanıcı e-posta adresi, adı veya soyadı yazın..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '12px 16px 12px 42px', borderRadius: '10px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '14px' }}
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            style={{ padding: '12px 24px', borderRadius: '10px', background: 'var(--color-primary)', color: '#fff', fontWeight: 700, border: 'none', cursor: isSearching ? 'not-allowed' : 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {isSearching ? 'Aranıyor...' : 'Vatandaş Ara ve Görevlendir'}
          </button>
        </form>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div style={{ marginTop: '20px', background: 'var(--color-surface-hover)', padding: '16px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--color-primary)', fontWeight: 700 }}>Arama Sonuçları ({searchResults.length})</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {searchResults.map((user) => (
                <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{user.firstName} {user.lastName} <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>({user.email})</span></div>
                    <div style={{ fontSize: '12px', marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', background: ROLE_BADGES[user.role]?.bg || '#f8fafc', border: `1px solid ${ROLE_BADGES[user.role]?.border || '#e2e8f0'}`, color: ROLE_BADGES[user.role]?.color || '#475569', fontWeight: 700, fontSize: '11px' }}>
                        {ROLE_BADGES[user.role]?.label || user.role}
                      </span>
                      {user.institution && (
                        <span style={{ color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/></svg>
                          {user.institution.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleOpenIssuesModal(user)}
                      style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--color-surface-hover)', color: 'var(--color-text)', fontWeight: 600, fontSize: '12px', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      İhbarları Gör
                    </button>
                    <button
                      onClick={() => handleOpenAssignModal(user)}
                      style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--color-primary)', color: '#fff', fontWeight: 600, fontSize: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Yetki Değiştir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Existing Personnel Table */}
      <div className="card" style={{ padding: '0', overflowX: 'auto', border: '1px solid var(--color-border)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-text)' }}>
            Sistemdeki Tüm Kayıtlı Kullanıcılar ve Yöneticiler ({personnel.length})
          </h4>
        </div>

        {isPersonnelLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Personel Listesi Yükleniyor...</div>
        ) : personnel.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Henüz kurum çalışanı atanmamış. Yukarıdan arayarak atama yapın.</div>
        ) : (
          <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                <th style={{ padding: '14px 20px' }}>Ad Soyad ve E-posta</th>
                <th style={{ padding: '14px 20px' }}>Rol</th>
                <th style={{ padding: '14px 20px' }}>Atandığı Kurum</th>
                <th style={{ padding: '14px 20px' }}>Kayıt Tarihi</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {personnel.map((p: any) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '14px', transition: 'background 0.15s' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{p.firstName} {p.lastName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{p.email}</div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '6px', background: ROLE_BADGES[p.role]?.bg || '#f8fafc', border: `1px solid ${ROLE_BADGES[p.role]?.border || '#e2e8f0'}`, color: ROLE_BADGES[p.role]?.color || '#475569', fontWeight: 700, fontSize: '12px' }}>
                      {ROLE_BADGES[p.role]?.label || p.role}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    {p.institution ? (
                      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                        {p.institution.name}
                        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                          {p.institution.city}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', fontSize: '13px' }}>Tüm Bölgeler (Genel)</span>
                    )}
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: '13px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                    {format(new Date(p.created_at || p.createdAt || Date.now()), 'dd MMM yyyy', { locale: tr })}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleOpenIssuesModal(p)}
                        style={{ padding: '8px 14px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                        İhbarlar
                      </button>
                      <button
                        onClick={() => handleOpenAssignModal(p)}
                        style={{ padding: '8px 14px', borderRadius: '8px', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Düzenle
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Role & Institution Modal */}
      {selectedUser && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0, 0, 0, 0.45)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '28px', background: 'var(--color-surface)', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', border: '1px solid var(--color-border)' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Rol ve Kurum Görevlendirmesi
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '20px' }}>
              <strong>{selectedUser.firstName} {selectedUser.lastName}</strong> ({selectedUser.email}) için rol seçin.
            </p>

            <form onSubmit={handleSaveRole} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text)' }}>
                  Sistem Yetki Rolü
                </label>
                <select
                  value={targetRole}
                  onChange={(e: any) => setTargetRole(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '14px' }}
                >
                  <option value="CITIZEN">Vatandaş (Üye)</option>
                  <option value="INSTITUTION_OFFICER">Kurum Yetkilisi / Saha Çalışanı</option>
                  <option value="SUPER_ADMIN">Admin</option>
                </select>
              </div>

              {targetRole === 'INSTITUTION_OFFICER' && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text)' }}>
                    Atanacağı Sorumlu Kurum (Zorunlu)
                  </label>
                  <select
                    value={targetInstitutionId}
                    onChange={(e) => setTargetInstitutionId(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: '14px' }}
                  >
                    <option value="">-- Kurum Seçin --</option>
                    {institutions.map((inst: any) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.city})
                      </option>
                    ))}
                  </select>
                  <small style={{ display: 'block', marginTop: '4px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    Seçilen kurumun coğrafi sınırları (boundary) içindeki ihbarlar bu çalışana yönlendirilecektir.
                  </small>
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  style={{ padding: '10px 18px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontWeight: 600, cursor: 'pointer' }}
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  style={{ padding: '10px 22px', borderRadius: '8px', background: 'var(--color-primary)', color: '#fff', fontWeight: 700, border: 'none', cursor: isUpdating ? 'not-allowed' : 'pointer' }}
                >
                  {isUpdating ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ISSUES MODAL */}
      {isIssuesModalOpen && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--color-text)' }}>Kullanıcı İhbarları</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  {selectedUser.firstName} {selectedUser.lastName} ({selectedUser.email}) tarafından açılan tüm ihbarlar
                </p>
              </div>
              <button onClick={handleCloseIssuesModal} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            {isIssuesLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>İhbarlar yükleniyor...</div>
            ) : userIssues.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Bu kullanıcının açtığı herhangi bir ihbar bulunmuyor.</div>
            ) : (
              <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface-hover)', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                      <th style={{ padding: '12px' }}>Tarih</th>
                      <th style={{ padding: '12px' }}>Başlık & Kategori</th>
                      <th style={{ padding: '12px' }}>Konum</th>
                      <th style={{ padding: '12px' }}>Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userIssues.map((issue) => (
                      <tr key={issue.id} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '13px' }}>
                        <td style={{ padding: '12px' }}>{format(new Date(issue.createdAt), 'dd MMM yyyy', { locale: tr })}</td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{issue.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{issue.category}</div>
                        </td>
                        <td style={{ padding: '12px', color: 'var(--color-text-secondary)' }}>{issue.city}, {issue.district}</td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)' }}>
                            {issue.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
              <button onClick={handleCloseIssuesModal} style={{ padding: '10px 18px', borderRadius: '8px', background: 'var(--color-primary)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
