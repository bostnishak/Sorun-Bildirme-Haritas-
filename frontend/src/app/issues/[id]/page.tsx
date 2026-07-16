'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';
import { Header } from '@/components/layout/Header';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import styles from './page.module.css';

const STATUS_MAP: Record<string, { label: string; badgeClass: string }> = {
  OPEN: { label: 'Açık', badgeClass: styles.badgeOpen },
  IN_REVIEW: { label: 'İnceleniyor', badgeClass: styles.badgeInReview },
  RESOLVED: { label: 'Çözüldü', badgeClass: styles.badgeResolved },
  REJECTED: { label: 'Reddedildi', badgeClass: styles.badgeInReview },
};

const CATEGORY_LABELS: Record<string, string> = {
  WATER_SANITATION: 'Su ve Kanalizasyon',
  TRANSPORTATION: 'Yol / Ulaşım',
  ENVIRONMENT: 'Çevre ve Temizlik',
  INFRASTRUCTURE: 'Altyapı',
  SECURITY: 'Güvenlik',
  LIGHTING: 'Aydınlatma',
  PARKS: 'Park ve Yeşil Alan',
};

export default function IssueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const issueId = params.id as string;
  const { isAuthenticated, user } = useAppStore();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');

  const { data: issue, isLoading, error } = useQuery({
    queryKey: ['issue-detail', issueId],
    queryFn: async () => {
      const res: any = await api.get(`/issues/${issueId}`);
      return res.data;
    },
    enabled: !!issueId,
  });

  const upvoteMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/issues/${issueId}/upvote`);
    },
    onSuccess: () => {
      toast.success('Desteklediniz! Destek oyu eklendi.');
      queryClient.invalidateQueries({ queryKey: ['issue-detail', issueId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Oy verme işlemi başarısız.');
    },
  });

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      return api.post(`/issues/${issueId}/comments`, { content });
    },
    onSuccess: () => {
      toast.success('Yorumunuz eklendi.');
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['issue-detail', issueId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Yorum eklenemedi.');
    },
  });

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Yorum yapmak için giriş yapmalısınız.');
      router.push('/login');
      return;
    }
    if (!newComment.trim() || newComment.trim().length < 2) {
      toast.error('Yorum en az 2 karakter olmalıdır.');
      return;
    }
    commentMutation.mutate(newComment);
  };

  if (isLoading) {
    return (
      <div>
        <Header />
        <main className={styles.container}>
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#64748b' }}>
            Sorun detayı yükleniyor...
          </div>
        </main>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div>
        <Header />
        <main className={styles.container}>
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <h2>Sorun bulunamadı</h2>
            <Link href="/" className="btn btn-primary" style={{ marginTop: 16 }}>
              Ana Sayfaya Dön
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[issue.status] || {
    label: issue.status,
    badgeClass: styles.badgeOpen,
  };

  return (
    <div>
      <Header />
      <main className={styles.container}>
        <Link href="/" className={styles.backLink}>
          ← Ana Haritaya Dön
        </Link>

        <div className={styles.headerCard}>
          <div className={styles.headerTop}>
            <div className={styles.badges}>
              <span className={`${styles.badge} ${statusInfo.badgeClass}`}>
                {statusInfo.label}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#2563eb',
                  background: '#eff6ff',
                  padding: '6px 14px',
                  borderRadius: 20,
                }}
              >
                {CATEGORY_LABELS[issue.category] || issue.category}
              </span>
            </div>
          </div>

          <h1 className={styles.title}>{issue.title}</h1>

          <div className={styles.meta}>
            <span>◆ {issue.city} / {issue.district}</span>
            {issue.address && <span>{issue.address}</span>}
            <span>
              {format(new Date(issue.createdAt || issue.created_at), 'dd MMMM yyyy HH:mm', { locale: tr })}
            </span>
            {issue.reportedBy && (
              <span>{issue.reportedBy.firstName} {issue.reportedBy.lastName}</span>
            )}
          </div>

          <p className={styles.description}>{issue.description}</p>

          <div className={styles.actions}>
            <button
              className={styles.upvoteBtn}
              onClick={() => {
                if (!isAuthenticated) {
                  toast.error('Desteklemek için oturum açmalısınız.');
                  router.push('/login');
                  return;
                }
                upvoteMutation.mutate();
              }}
              disabled={upvoteMutation.isPending}
            >
              [+] Bu Sorunu Destekle ({issue.upvoteCount || 0})
            </button>
          </div>
        </div>

        {/* Durum Geçmişi */}
        {issue.statusHistory && issue.statusHistory.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Durum ve Çözüm Süreci</h3>
            <div className={styles.timeline}>
              {issue.statusHistory.map((item: any, i: number) => (
                <div key={item.id || i} className={styles.timelineItem}>
                  <div className={styles.timelineDot} />
                  <div>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>
                      {STATUS_MAP[item.toStatus]?.label || item.toStatus}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {format(new Date(item.createdAt), 'dd MMM yyyy HH:mm', { locale: tr })}
                      {item.note && ` — ${item.note}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Yorumlar & Resmi Belediye Yanıtları */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            İletişim & Resmi Kurum Açıklamaları ({issue.comments?.length || 0})
          </h3>

          {issue.comments && issue.comments.length > 0 ? (
            <div className={styles.commentsList}>
              {issue.comments.map((comment: any) => (
                <div
                  key={comment.id}
                  className={`${styles.commentCard} ${comment.isOfficial ? styles.officialCard : ''}`}
                >
                  <div className={styles.commentHeader}>
                    <div>
                      <span className={styles.authorName}>
                        {comment.author?.firstName} {comment.author?.lastName}
                      </span>
                      {comment.isOfficial && (
                        <span className={styles.officialBadge}>RESMİ BELEDİYE AÇIKLAMASI</span>
                      )}
                    </div>
                    <span className={styles.commentDate}>
                      {format(new Date(comment.createdAt), 'dd MMM yyyy HH:mm', { locale: tr })}
                    </span>
                  </div>
                  <p className={styles.commentContent}>{comment.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
              Henüz bir açıklama veya yorum eklenmedi.
            </p>
          )}

          <form onSubmit={handleSubmitComment} className={styles.commentForm}>
            <textarea
              className={styles.textarea}
              placeholder={
                user?.role === 'INSTITUTION_OFFICER' || user?.role === 'SUPER_ADMIN'
                  ? 'Resmi belediye/kurum açıklaması veya güncel durum bilgisi ekleyin...'
                  : 'Sorunun güncel durumu hakkında yorum yazın...'
              }
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={commentMutation.isPending}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={commentMutation.isPending || !newComment.trim()}
              >
                {commentMutation.isPending ? 'Gönderiliyor...' : 'Gönder'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
