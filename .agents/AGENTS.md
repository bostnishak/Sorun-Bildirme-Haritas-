### Hata Yönetimi ve Geri Dönüş (Fallback) Kuralları
Herhangi bir derleme (build), container ayağa kaldırma veya komut çalıştırma işlemi başarısız olursa:
1. Asla inisiyatif kullanarak uygulamanın eski veya önbellekteki (cached) versiyonlarını/imajlarını çalıştırma.
2. Hatayı gizleme veya geçici çözümlerle süreci kullanıcıdan habersiz devam ettirme.
3. Derhal durumu kullanıcıya bildir, hatayı raporla ve nasıl ilerlemek istediğini sor.
