'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TableView } from '../table/TableView';

export default function AdminIssuesList() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const limit = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-issues-list', page, status, priority],
    queryFn: async () => {
      const res = await api.get('/admin/portal/issues', {
        params: { page, limit, status: status || undefined, priority: priority || undefined }
      });
      return res.data;
    }
  });

  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: '16px', padding: '24px', border: '1px solid var(--color-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
          Vatandaş İhbar Listesi (Tümü)
        </h2>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <select 
            className="input" 
            value={status} 
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            style={{ width: 'auto', padding: '8px 36px 8px 12px' }}
          >
            <option value="">Tüm Durumlar</option>
            <option value="OPEN">Açık</option>
            <option value="IN_REVIEW">İncelemede</option>
            <option value="RESOLVED_PENDING_APPROVAL">Onay Bekleyenler</option>
            <option value="RESOLVED">Çözüldü</option>
            <option value="REJECTED">Reddedildi</option>
          </select>

          <select 
            className="input" 
            value={priority} 
            onChange={(e) => { setPriority(e.target.value); setPage(1); }}
            style={{ width: 'auto', padding: '8px 36px 8px 12px' }}
          >
            <option value="">Tüm Öncelikler</option>
            <option value="CRITICAL">Kritik</option>
            <option value="HIGH">Yüksek</option>
            <option value="MEDIUM">Orta</option>
            <option value="LOW">Düşük</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>İhbarlar yükleniyor...</div>
      ) : (
        <TableView issues={data?.data || []} />
      )}

      {/* Pagination */}
      {data?.meta && data.meta.pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
          <button 
            className="btn btn-ghost" 
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
          >
            Önceki
          </button>
          <span style={{ display: 'flex', alignItems: 'center', fontWeight: 600, color: 'var(--color-text-secondary)', padding: '0 12px' }}>
            Sayfa {page} / {data.meta.pages}
          </span>
          <button 
            className="btn btn-ghost" 
            disabled={page >= data.meta.pages}
            onClick={() => setPage(p => p + 1)}
          >
            Sonraki
          </button>
        </div>
      )}
    </div>
  );
}
