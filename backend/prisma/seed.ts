import { PrismaClient, Category, IssueStatus, Priority } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

function hashTCKimlik(tcKimlik: string): string {
  const pepper = process.env.TC_KIMLIK_PEPPER || 'etiya-default-pepper-secret-key-2026';
  return crypto.createHash('sha256').update(tcKimlik + pepper).digest('hex');
}

// Root dizindeki veya backend dizindeki env dosyasını yükle
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

if (process.env.RUN_LOCAL === 'true' && process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace('@postgres:', '@localhost:');
}

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Veritabanı temizleniyor...');
  await prisma.$executeRaw`TRUNCATE TABLE issues CASCADE;`;
  await prisma.$executeRaw`TRUNCATE TABLE users CASCADE;`;
  await prisma.$executeRaw`TRUNCATE TABLE institutions CASCADE;`;

  const hashedPassword = await bcrypt.hash('Etiya2026!', 10);

  console.log('🏛️ Kurumlar oluşturuluyor...');
  const geojsonDir = path.join(__dirname, 'geojson');
  if (!fs.existsSync(geojsonDir)) {
    fs.mkdirSync(geojsonDir, { recursive: true });
  }

  const istanbulInstitutionId = '22222222-2222-2222-2222-222222222222';
  const ankaraInstitutionId = '33333333-3333-3333-3333-333333333333';
  const izmirInstitutionId = '44444444-4444-4444-4444-444444444444';
  const kadikoyInstitutionId = '55555555-5555-5555-5555-555555555555';

  const istanbulBoundary = {
    type: "MultiPolygon",
    coordinates: [[[[28.0, 40.0], [29.5, 40.0], [29.5, 41.5], [28.0, 41.5], [28.0, 40.0]]]]
  };
  const ankaraBoundary = {
    type: "MultiPolygon",
    coordinates: [[[[32.0, 39.0], [33.5, 39.0], [33.5, 40.5], [32.0, 40.5], [32.0, 39.0]]]]
  };
  const izmirBoundary = {
    type: "MultiPolygon",
    coordinates: [[[[26.5, 38.0], [28.0, 38.0], [28.0, 39.0], [26.5, 39.0], [26.5, 38.0]]]]
  };

  await prisma.$executeRaw`
    INSERT INTO institutions (id, name, city, district, email_address, created_at, updated_at, boundary)
    VALUES
      (
        ${istanbulInstitutionId}::uuid,
        'İstanbul Büyükşehir Belediyesi',
        'İstanbul',
        'Merkez',
        'iletisim@istanbul.bel.tr',
        NOW(),
        NOW(),
        ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(istanbulBoundary)}), 4326)
      ),
      (
        ${ankaraInstitutionId}::uuid,
        'Ankara Büyükşehir Belediyesi',
        'Ankara',
        'Merkez',
        'iletisim@ankara.bel.tr',
        NOW(),
        NOW(),
        ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(ankaraBoundary)}), 4326)
      ),
      (
        ${izmirInstitutionId}::uuid,
        'İzmir Büyükşehir Belediyesi',
        'İzmir',
        'Merkez',
        'iletisim@izmir.bel.tr',
        NOW(),
        NOW(),
        ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(izmirBoundary)}), 4326)
      )
  `;
  console.log('✅ Kurumlar (İBB, ABB, İZBB) eklendi.');

  console.log('👥 Örnek kullanıcı profilleri oluşturuluyor...');

  // 1. Vatandaş (`CITIZEN`)
  const verifiedCitizen = await prisma.user.create({
    data: {
      email: 'vatandas@etiya.com',
      passwordHash: hashedPassword,
      firstName: 'Ayşe',
      lastName: 'Yılmaz',
      role: 'CITIZEN',
      isVerified: true,
      tcKimlikHash: hashTCKimlik('11111111110'),
      birthYear: 1992,
      phone: '0532 111 2233',
      city: 'Ankara',
    },
  });
  const citizen = verifiedCitizen;

  // 2. Çalışan / Kurum Yetkilisi (`INSTITUTION_OFFICER`)
  const officer = await prisma.user.create({
    data: {
      tcKimlikHash: hashTCKimlik('22222222220'),
      firstName: 'Mehmet',
      lastName: 'Öztürk',
      email: 'calisan@etiya.com',
      passwordHash: hashedPassword,
      role: 'INSTITUTION_OFFICER',
      institutionId: istanbulInstitutionId,
      phone: '0212 555 1010',
      city: 'İstanbul',
    },
  });
  const ibbOfficer = officer;
  const abbOfficer = officer;
  const izmirOfficer = officer;

  // 3. Süper Yönetici (`SUPER_ADMIN`)
  const admin = await prisma.user.create({
    data: {
      tcKimlikHash: hashTCKimlik('55555555550'),
      firstName: 'Sistem',
      lastName: 'Yöneticisi',
      email: 'admin@etiya.com',
      passwordHash: hashedPassword,
      role: 'SUPER_ADMIN',
      phone: '0850 111 0000',
      city: 'İzmir',
    },
  });

  console.log('✅ 3 Örnek Profil (Vatandaş: vatandas@etiya.com, Çalışan: calisan@etiya.com, Admin: admin@etiya.com) oluşturuldu.');

  console.log('🗺️ Gerçekçi sorun bildirimleri ekleniyor...');

  const issuesData = [
    // İSTANBUL (4 sorun)
    {
      title: 'Kadıköy Rıhtım Rögar Taşması',
      description: 'Rıhtım Caddesi otobüs durakları önünde rögar kapaklarından su ve kanalizasyon taşıyor. Yaya ulaşımını olumsuz etkiliyor.',
      category: 'WATER_SANITATION',
      priority: 'CRITICAL',
      status: 'IN_REVIEW',
      city: 'İstanbul',
      district: 'Kadıköy',
      address: 'Rıhtım Caddesi No:18',
      latitude: 40.9912,
      longitude: 29.0238,
      reporterId: verifiedCitizen.id,
    },
    {
      title: 'Beşiktaş Barbaros Bulvarı Derin Çukur',
      description: 'Barbaros Bulvarı sağ şerit üzerinde asfalt çökmüş durumda, araçlar için ciddi tehlike oluşturuyor.',
      category: 'TRANSPORTATION',
      priority: 'HIGH',
      status: 'OPEN',
      city: 'İstanbul',
      district: 'Beşiktaş',
      address: 'Barbaros Bulvarı No:45',
      latitude: 41.0456,
      longitude: 29.0069,
      reporterId: citizen.id,
    },
    {
      title: 'Mecidiyeköy Altgeçit Aydınlatma Arızası',
      description: 'Yaya altgeçidindeki lambaların yarısı yanmıyor, gece saatlerinde güvenlik endişesi yaratıyor.',
      category: 'LIGHTING',
      priority: 'MEDIUM',
      status: 'IN_REVIEW',
      city: 'İstanbul',
      district: 'Şişli',
      address: 'Mecidiyeköy Meydan Altgeçit',
      latitude: 41.0669,
      longitude: 28.9926,
      reporterId: verifiedCitizen.id,
    },
    {
      title: 'Salacak Sahil Yolu Temizlik Sorunu',
      description: 'Kız Kulesi karşısındaki yürüyüş yolunda çöp kutuları dolmuş ve etrafa taşmış durumda.',
      category: 'ENVIRONMENT',
      priority: 'MEDIUM',
      status: 'RESOLVED',
      city: 'İstanbul',
      district: 'Üsküdar',
      address: 'Salacak Sahil Yolu',
      latitude: 41.0234,
      longitude: 29.0083,
      reporterId: citizen.id,
    },
    // ANKARA (4 sorun)
    {
      title: 'Turan Güneş Bulvarı Çukur',
      description: 'Yolun sağ şeridinde derin bir çukur var, araç lastiklerine zarar veriyor.',
      category: 'TRANSPORTATION',
      priority: 'HIGH',
      status: 'OPEN',
      city: 'Ankara',
      district: 'Çankaya',
      address: 'Turan Güneş Bulvarı No:88',
      latitude: 39.8654,
      longitude: 32.8402,
      reporterId: verifiedCitizen.id,
    },
    {
      title: 'Dikmen Caddesi Ana Su Patlağı',
      description: 'Ana şebeke su borusu patladı, caddeyi su bastı.',
      category: 'INFRASTRUCTURE',
      priority: 'CRITICAL',
      status: 'IN_REVIEW',
      city: 'Ankara',
      district: 'Çankaya',
      address: 'Dikmen Caddesi No:112',
      latitude: 39.8789,
      longitude: 32.8315,
      reporterId: citizen.id,
    },
    {
      title: 'Güvenpark Yanı Kırık Banklar',
      description: 'Park içerisindeki oturma gruplarının tahtaları kırılmış ve bakıma muhtaç.',
      category: 'PARKS',
      priority: 'LOW',
      status: 'RESOLVED',
      city: 'Ankara',
      district: 'Çankaya',
      address: 'Kızılay Güvenpark',
      latitude: 39.9208,
      longitude: 32.8541,
      reporterId: verifiedCitizen.id,
    },
    {
      title: 'İvedik OSB Ana Yolda Çökme',
      description: 'Ağır tonajlı araç geçişinden dolayı yolda kısmi çökme meydana geldi.',
      category: 'TRANSPORTATION',
      priority: 'HIGH',
      status: 'IN_REVIEW',
      city: 'Ankara',
      district: 'Yenimahalle',
      address: 'İvedik OSB 21. Cadde',
      latitude: 39.9882,
      longitude: 32.7441,
      reporterId: citizen.id,
    },
    // İZMİR (4 sorun)
    {
      title: 'Alsancak Kordon Sahil Yolu Bakım İhtiyacı',
      description: 'Kordon boyunda yürüyüş yolu taşları yerinden çıkmış, takılıp düşme tehlikesi var.',
      category: 'PARKS',
      priority: 'MEDIUM',
      status: 'OPEN',
      city: 'İzmir',
      district: 'Konak',
      address: 'Atatürk Caddesi Kordon Sahil',
      latitude: 38.4382,
      longitude: 27.1425,
      reporterId: verifiedCitizen.id,
    },
    {
      title: 'Karşıyaka Çarşı Girişi Kanalizasyon Taşması',
      description: 'Çarşı girişindeki mazgal tıkandığı için yağmur sonrası su göllendi.',
      category: 'WATER_SANITATION',
      priority: 'CRITICAL',
      status: 'IN_REVIEW',
      city: 'İzmir',
      district: 'Karşıyaka',
      address: 'Karşıyaka İskele Meydanı',
      latitude: 38.4556,
      longitude: 27.1189,
      reporterId: citizen.id,
    },
    {
      title: 'Bornova Üniversite Caddesi Aydınlatma Arızası',
      description: 'Cadde üzerindeki 4 adet sokak lambası yanmıyor.',
      category: 'LIGHTING',
      priority: 'MEDIUM',
      status: 'OPEN',
      city: 'İzmir',
      district: 'Bornova',
      address: 'Kazımdirik Mahallesi Üniversite Cad.',
      latitude: 38.4611,
      longitude: 27.2186,
      reporterId: verifiedCitizen.id,
    },
    {
      title: 'Göztepe Sahil Güvenlik Korkuluk Hasarı',
      description: 'Sahil şeridindeki demir korkuluklardan bir kısmı kırılmış.',
      category: 'SECURITY',
      priority: 'HIGH',
      status: 'RESOLVED',
      city: 'İzmir',
      district: 'Konak',
      address: 'Mustafa Kemal Sahil Bulvarı Göztepe',
      latitude: 38.4032,
      longitude: 27.0872,
      reporterId: citizen.id,
    },
    // EK İSTANBUL
    {
      title: 'İncirli Caddesi Fiber Optik Kablo Kazısı Çukuru',
      description: 'İncirli Caddesi üzerinde yapılan altyapı kazısı sonrası çukur açık bırakıldı.',
      category: 'INFRASTRUCTURE',
      priority: 'MEDIUM',
      status: 'RESOLVED',
      city: 'İstanbul',
      district: 'Bakırköy',
      address: 'Zuhuratbaba, İncirli Cd., 34147 Bakırköy/İstanbul',
      latitude: 40.9902,
      longitude: 28.8741,
      reporterId: verifiedCitizen.id,
    },
    {
      title: 'Tepeüstü Mahallesi Başıboş Köpek Sürüsü',
      description: 'Sabah saatlerinde sokakta toplanan köpekler yayalara saldırgan tavırlar sergiliyor.',
      category: 'SECURITY',
      priority: 'HIGH',
      status: 'OPEN',
      city: 'İstanbul',
      district: 'Ümraniye',
      address: 'Tepeüstü, Alemdağ Cd., 34771 Ümraniye/İstanbul',
      latitude: 41.0211,
      longitude: 29.1362,
      reporterId: citizen.id,
    },
    {
      title: 'Maltepe Sahil Yolu Bisiklet Yolu İşgali',
      description: 'Bisiklet yoluna sürekli motor kuryeler ve araçlar park ediyor.',
      category: 'TRANSPORTATION',
      priority: 'LOW',
      status: 'IN_REVIEW',
      city: 'İstanbul',
      district: 'Maltepe',
      address: 'Yalı, Turgut Özal Blv., 34844 Maltepe/İstanbul',
      latitude: 40.9234,
      longitude: 29.1311,
      reporterId: verifiedCitizen.id,
    },
    {
      title: 'E-5 Yanyol Asfalt Çatlakları ve Çukurlar',
      description: 'Pendik çıkışında sağ şeritte derin çatlaklar oluşmuş durumda.',
      category: 'TRANSPORTATION',
      priority: 'HIGH',
      status: 'OPEN',
      city: 'İstanbul',
      district: 'Pendik',
      address: 'Doğu, E-5 Yanyol, 34890 Pendik/İstanbul',
      latitude: 40.8789,
      longitude: 29.2312,
      reporterId: citizen.id,
    },
    {
      title: 'Çam ve Sakura Hastanesi Yolu Su Baskını',
      description: 'Yağmur sonrası hastane giriş yolunu tamamen su kapladı, acil müdahale gerekiyor.',
      category: 'WATER_SANITATION',
      priority: 'CRITICAL',
      status: 'OPEN',
      city: 'İstanbul',
      district: 'Başakşehir',
      address: 'Başakşehir, Olimpiyat Blv., 34480 Başakşehir/İstanbul',
      latitude: 41.1072,
      longitude: 28.7981,
      reporterId: verifiedCitizen.id,
    },
    {
      title: 'Avrasya Tüneli Çıkışı Bariyer Hasarı',
      description: 'Tünel çıkışı sağdaki koruyucu bariyerler kaza sonucu eğilmiş.',
      category: 'INFRASTRUCTURE',
      priority: 'MEDIUM',
      status: 'RESOLVED',
      city: 'İstanbul',
      district: 'Zeytinburnu',
      address: 'Kazlıçeşme, Kennedy Cd., 34020 Zeytinburnu/İstanbul',
      latitude: 40.9856,
      longitude: 28.9167,
      reporterId: citizen.id,
    },
    {
      title: 'Yakacık Tepesi Orman Yangını Şüphesi',
      description: 'Ormanlık alandan yoğun dumanlar yükseliyor.',
      category: 'ENVIRONMENT',
      priority: 'CRITICAL',
      status: 'IN_REVIEW',
      city: 'İstanbul',
      district: 'Kartal',
      address: 'Yakacık Çarşı, Kartal Orman Yolu, 34876 Kartal/İstanbul',
      latitude: 40.9221,
      longitude: 29.2155,
      reporterId: verifiedCitizen.id,
    },
    {
      title: 'Finans Merkezi İnşaat Tozu ve Gürültü Kirliliği',
      description: 'Gece saatlerine kadar süren inşaat çalışmaları çevreyi rahatsız ediyor.',
      category: 'ENVIRONMENT',
      priority: 'MEDIUM',
      status: 'OPEN',
      city: 'İstanbul',
      district: 'Ataşehir',
      address: 'Barbaros, Gelincik Sk., 34746 Ataşehir/İstanbul',
      latitude: 41.0049,
      longitude: 29.1021,
      reporterId: citizen.id,
    },
    // EK ANKARA
    {
      title: 'Kızılay Meydanı Yaya Geçidi Çizgilerinin Silinmesi',
      description: 'Yoğun yaya trafiği olan kavşakta çizgiler tamamen silikleşmiş.',
      category: 'TRANSPORTATION',
      priority: 'MEDIUM',
      status: 'IN_REVIEW',
      city: 'Ankara',
      district: 'Çankaya',
      address: 'Kızılay, Atatürk Blv, 06420 Çankaya/Ankara',
      latitude: 39.9208,
      longitude: 32.8541,
      reporterId: verifiedCitizen.id,
    },
    {
      title: 'Tunalı Hilmi Caddesi Çöp Konteyneri Yetersizliği',
      description: 'Cadde boyunca yeterli çöp kutusu olmadığı için çöpler kaldırımlara bırakılıyor.',
      category: 'ENVIRONMENT',
      priority: 'LOW',
      status: 'OPEN',
      city: 'Ankara',
      district: 'Çankaya',
      address: 'Kavaklıdere, Tunalı Hilmi Cd., 06680 Çankaya/Ankara',
      latitude: 39.9048,
      longitude: 32.8615,
      reporterId: citizen.id,
    },
    {
      title: 'Keçiören Metro İstasyonu Yürüyen Merdiven Arızası',
      description: 'İstasyona inen yürüyen merdiven 3 gündür çalışmıyor, yaşlılar zorluk çekiyor.',
      category: 'INFRASTRUCTURE',
      priority: 'HIGH',
      status: 'OPEN',
      city: 'Ankara',
      district: 'Keçiören',
      address: 'Şefkat, Cumhuriyet Cd., 06300 Keçiören/Ankara',
      latitude: 39.9806,
      longitude: 32.8697,
      reporterId: verifiedCitizen.id,
    },
    {
      title: 'Yenimahalle Demetevler Parkı Aydınlatma Eksikliği',
      description: 'Parkın arka tarafındaki aydınlatma direkleri yanmıyor.',
      category: 'LIGHTING',
      priority: 'MEDIUM',
      status: 'RESOLVED',
      city: 'Ankara',
      district: 'Yenimahalle',
      address: 'Demetevler, 408. Cd., 06200 Yenimahalle/Ankara',
      latitude: 39.9678,
      longitude: 32.8105,
      reporterId: citizen.id,
    },
    // EK İZMİR
    {
      title: 'Bornova Küçükpark Çevresi Gürültü Kirliliği',
      description: 'Eğlence mekanlarının müzik sesleri gece geç saatlere kadar limitlerin üzerinde.',
      category: 'ENVIRONMENT',
      priority: 'LOW',
      status: 'OPEN',
      city: 'İzmir',
      district: 'Bornova',
      address: 'Kazımdirik, Küçükpark, 35100 Bornova/İzmir',
      latitude: 38.4619,
      longitude: 27.2185,
      reporterId: verifiedCitizen.id,
    },
    {
      title: 'Buca Şirinyer Metro Durağı Yaya Üst Geçit Hasarı',
      description: 'Üst geçidin merdiven basamaklarında demirler ortaya çıkmış.',
      category: 'SECURITY',
      priority: 'HIGH',
      status: 'RESOLVED',
      city: 'İzmir',
      district: 'Buca',
      address: 'Şirinyer, Aydın Hatboyu Cd., 35380 Buca/İzmir',
      latitude: 38.3892,
      longitude: 27.1517,
      reporterId: citizen.id,
    },
    // BURSA
    {
      title: 'Nilüfer FSM Bulvarı Orta Refüj Sulama Hortumu Patlağı',
      description: 'Sulama sistemi arızalandığı için tonlarca su yola akıyor.',
      category: 'PARKS',
      priority: 'MEDIUM',
      status: 'OPEN',
      city: 'Bursa',
      district: 'Nilüfer',
      address: 'İhsaniye, FSM Blv., 16130 Nilüfer/Bursa',
      latitude: 40.2184,
      longitude: 28.9567,
      reporterId: verifiedCitizen.id,
    },
    {
      title: 'Osmangazi Kapalı Çarşı Yanı Trafo Tehlikesi',
      description: 'Elektrik trafosunun kapağı açık kalmış, kablolar dışarıda duruyor.',
      category: 'SECURITY',
      priority: 'CRITICAL',
      status: 'IN_REVIEW',
      city: 'Bursa',
      district: 'Osmangazi',
      address: 'Nalbantoğlu, Kapalı Çarşı, 16010 Osmangazi/Bursa',
      latitude: 40.1837,
      longitude: 29.0601,
      reporterId: citizen.id,
    },
    {
      title: 'Yıldırım Şevket Yılmaz Hastane Yolu Asfalt Bozukluğu',
      description: 'Ambulansların sık kullandığı yolda derin çukurlar mevcut.',
      category: 'TRANSPORTATION',
      priority: 'HIGH',
      status: 'OPEN',
      city: 'Bursa',
      district: 'Yıldırım',
      address: 'Mimar Sinan, Mimar Sinan Cd., 16310 Yıldırım/Bursa',
      latitude: 40.1895,
      longitude: 29.1172,
      reporterId: verifiedCitizen.id,
    },
    // ANTALYA
    {
      title: 'Muratpaşa Kaleiçi Restorasyon Atıkları',
      description: 'Sokakta bırakılan restorasyon molozları yaya geçişini engelliyor.',
      category: 'ENVIRONMENT',
      priority: 'LOW',
      status: 'RESOLVED',
      city: 'Antalya',
      district: 'Muratpaşa',
      address: 'Kılıçarslan, Kaleiçi, 07100 Muratpaşa/Antalya',
      latitude: 36.8841,
      longitude: 30.7056,
      reporterId: citizen.id,
    },
    {
      title: 'Konyaaltı Akdeniz Bulvarı Bisiklet Yolu Çizgileri Silik',
      description: 'Sahil yolu bisiklet şeridinde boyalar silinmiş, yayalar yola giriyor.',
      category: 'TRANSPORTATION',
      priority: 'MEDIUM',
      status: 'OPEN',
      city: 'Antalya',
      district: 'Konyaaltı',
      address: 'Arapsuyu, Akdeniz Blv., 07070 Konyaaltı/Antalya',
      latitude: 36.8687,
      longitude: 30.6439,
      reporterId: verifiedCitizen.id,
    },
    {
      title: 'Kepez Dokuma Park Girişi Başıboş Köpekler',
      description: 'Park girişinde toplanan köpekler çocuklar için endişe yaratıyor.',
      category: 'SECURITY',
      priority: 'HIGH',
      status: 'IN_REVIEW',
      city: 'Antalya',
      district: 'Kepez',
      address: 'Fabrikalar, Namık Kemal Blv., 07090 Kepez/Antalya',
      latitude: 36.9142,
      longitude: 30.6728,
      reporterId: citizen.id,
    },
  ];

  const getRealisticDate = (status: string, index: number): Date => {
    const now = new Date();
    if (status === 'IN_REVIEW') {
      // 24 - 48 saat arasında incelemede olan bildirimler
      const hoursAgo = 24 + ((index * 5 + 3) % 24);
      const minutesAgo = (index * 17) % 60;
      return new Date(now.getTime() - (hoursAgo * 60 + minutesAgo) * 60 * 1000);
    } else if (status === 'RESOLVED') {
      // 48 - 96 saat arasında çözülmüş bildirimler
      const hoursAgo = 50 + ((index * 7 + 11) % 46);
      const minutesAgo = (index * 23) % 60;
      return new Date(now.getTime() - (hoursAgo * 60 + minutesAgo) * 60 * 1000);
    } else {
      // OPEN (Yeni bildirimler 1 - 18 saat)
      const hoursAgo = 1 + ((index * 3) % 18);
      const minutesAgo = (index * 13) % 60;
      return new Date(now.getTime() - (hoursAgo * 60 + minutesAgo) * 60 * 1000);
    }
  };

  for (let index = 0; index < issuesData.length; index++) {
    const item = issuesData[index];
    const createdAt = getRealisticDate(item.status, index);
    const upvotes = (item as any).upvoteCount ?? (18 + ((index * 41 + 13) % 240));

    const issueResult = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO issues (
        id, title, description, category, priority, status,
        location, latitude, longitude, city, district, address,
        exif_verified, llm_guard_passed, reported_by_id, ip_address,
        upvote_count, created_at, updated_at
      ) VALUES (
        uuid_generate_v4(),
        ${item.title}, ${item.description}, ${item.category}::"Category",
        ${item.priority}::"Priority", ${item.status}::"IssueStatus",
        ST_SetSRID(ST_MakePoint(${item.longitude}, ${item.latitude}), 4326),
        ${item.latitude}, ${item.longitude}, ${item.city}, ${item.district},
        ${item.address},
        true, true, ${item.reporterId}::uuid, '127.0.0.1',
        ${upvotes}, ${createdAt}, ${createdAt}
      )
      RETURNING id
    `;

    const issueId = issueResult[0]?.id;

    if (issueId) {
      // Yorum ekle
      await prisma.issueComment.create({
        data: {
          issueId,
          authorId: verifiedCitizen.id,
          content: 'Bu sorunun bir an önce incelenmesini rica ediyoruz, çevredeki vatandaşlar şikayetçi.',
          createdAt: new Date(createdAt.getTime() + 30 * 60 * 1000),
        },
      });

      // Beğeni (Upvote) ekle
      await prisma.issueUpvote.create({
        data: {
          issueId,
          userId: verifiedCitizen.id,
          createdAt: new Date(createdAt.getTime() + 15 * 60 * 1000),
        },
      });

      // Status history ekle (SLA raporları için)
      await prisma.issueStatusHistory.create({
        data: {
          issueId,
          fromStatus: 'OPEN',
          toStatus: 'OPEN',
          changedBy: item.reporterId,
          note: 'Sorun ilk kez sisteme bildirildi.',
          createdAt: createdAt,
        },
      });

      if (item.status === 'IN_REVIEW' || item.status === 'RESOLVED') {
        const inReviewDate = new Date(createdAt.getTime() + 6 * 3600 * 1000);
        await prisma.issueStatusHistory.create({
          data: {
            issueId,
            fromStatus: 'OPEN',
            toStatus: 'IN_REVIEW',
            changedBy: item.city === 'İstanbul' ? ibbOfficer.id : item.city === 'Ankara' ? abbOfficer.id : izmirOfficer.id,
            note: 'Ekip sahaya yönlendirildi, inceleme başlatıldı.',
            createdAt: inReviewDate,
          },
        });
      }

      if (item.status === 'RESOLVED') {
        const resolvedDate = new Date(createdAt.getTime() + 28 * 3600 * 1000);
        await prisma.issueStatusHistory.create({
          data: {
            issueId,
            fromStatus: 'IN_REVIEW',
            toStatus: 'RESOLVED',
            changedBy: item.city === 'İstanbul' ? ibbOfficer.id : item.city === 'Ankara' ? abbOfficer.id : izmirOfficer.id,
            note: 'Sorun başarıyla çözüldü ve gerekli onarımlar tamamlandı.',
            createdAt: resolvedDate,
          },
        });
      }
    }
  }

  console.log('✅ 29 Adet gerçekçi sorun, yorumlar, destekler (upvotes) ve durum tarihçesi eklendi.');
  console.log('🎉 Seed başarıyla tamamlandı!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
