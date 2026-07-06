import { PrismaClient, IssueCategory, IssueStatus, Priority } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Root dizindeki veya backend dizindeki env dosyasını yükle
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env.example') }); // Fallback

// Docker kullanmadan (lokalden) çalıştırıyorsak 'postgres' ismini 'localhost' yap
if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace('@postgres:', '@localhost:');
}

const prisma = new PrismaClient();

async function main() {
  console.log('Veritabanı temizleniyor...');
  await prisma.issue.deleteMany();
  await prisma.user.deleteMany();

  console.log('Test kullanıcısı oluşturuluyor...');
  const hashedPassword = await bcrypt.hash('123456', 10);
  const user = await prisma.user.create({
    data: {
      tcKimlik: '11111111111',
      firstName: 'Ahmet',
      lastName: 'Yılmaz',
      email: 'ahmet@example.com',
      passwordHash: hashedPassword,
      phone: '5551112233',
      role: 'CITIZEN',
      isVerified: true,
    },
  });

  console.log('Gerçekçi sorunlar ekleniyor...');
  
  const issues = [
    // İSTANBUL
    {
      title: 'Tarihi Yarımada Kaldırım Taşı Kırık',
      description: 'Eminönü Mısır Çarşısı girişinde yaya trafiğini engelleyen kırık kaldırım taşları var. Yağmurlu günlerde su sıçratıyor.',
      category: IssueCategory.TRANSPORTATION,
      status: IssueStatus.OPEN,
      priority: Priority.MEDIUM,
      city: 'İstanbul',
      district: 'Fatih',
      address: 'Rüstem Paşa, Erzak Ambarı Sok. No:1, 34116 Fatih/İstanbul',
      lat: 41.0200,
      lng: 28.9496,
      reportedById: user.id,
    },
    {
      title: 'Kadıköy Meydanı Çöp Birikintisi',
      description: 'Boğa Heykeli etrafındaki çöp kutuları tamamen dolmuş ve çöpler yollara taşmış durumda. Kötü bir koku yayılıyor.',
      category: IssueCategory.ENVIRONMENT,
      status: IssueStatus.IN_REVIEW,
      priority: Priority.HIGH,
      city: 'İstanbul',
      district: 'Kadıköy',
      address: 'Osmanağa, Söğütlü Çeşme Cd., 34714 Kadıköy/İstanbul',
      lat: 40.9904,
      lng: 29.0292,
      reportedById: user.id,
    },
    {
      title: 'Beşiktaş Sahili Aydınlatma Direği Arızalı',
      description: 'Dolmabahçe Sarayı önündeki sahil yolunda art arda 3 adet aydınlatma direği yanmıyor. Gece yürüyüşleri için tehlikeli karanlık oluşuyor.',
      category: IssueCategory.LIGHTING,
      status: IssueStatus.OPEN,
      priority: Priority.HIGH,
      city: 'İstanbul',
      district: 'Beşiktaş',
      address: 'Vişnezade, Dolmabahçe Cd., 34357 Beşiktaş/İstanbul',
      lat: 41.0396,
      lng: 28.9996,
      reportedById: user.id,
    },

    // ANKARA
    {
      title: 'Dikmen Vadisi Şebeke Suyu Patlağı',
      description: 'Vadi girişinde şebeke borusu patlamış, su boşa akıyor. Yaklaşık 2 saattir devam ediyor, yolda göllenme oldu.',
      category: IssueCategory.WATER_SANITATION,
      status: IssueStatus.OPEN,
      priority: Priority.URGENT,
      city: 'Ankara',
      district: 'Çankaya',
      address: 'Dikmen Vadisi, Çankaya/Ankara',
      lat: 39.8808,
      lng: 32.8464,
      reportedById: user.id,
    },
    {
      title: 'Kızılay Meydanı Asfalt Çökmesi',
      description: 'Güvenpark otobüs durakları önünde asfaltta derin bir çukur oluşmuş, araçların altı vuruyor.',
      category: IssueCategory.TRANSPORTATION,
      status: IssueStatus.RESOLVED,
      priority: Priority.HIGH,
      city: 'Ankara',
      district: 'Çankaya',
      address: 'Kızılay Meydanı, Çankaya/Ankara',
      lat: 39.9208,
      lng: 32.8541,
      reportedById: user.id,
    },

    // İZMİR
    {
      title: 'Karşıyaka Sahil Ağaç Budama Talebi',
      description: 'Sahildeki palmiye ağaçlarının kuru yaprakları fırtınada yaya yoluna düşüyor, tehlike arz ediyor.',
      category: IssueCategory.PARK_GARDEN,
      status: IssueStatus.OPEN,
      priority: Priority.LOW,
      city: 'İzmir',
      district: 'Karşıyaka',
      address: 'Bostanlı Sahil, Karşıyaka/İzmir',
      lat: 38.4552,
      lng: 27.0945,
      reportedById: user.id,
    },
    {
      title: 'Alsancak Sevgi Yolu Elektrik Panosu Kapağı Açık',
      description: 'Yol üzerindeki ana elektrik panosunun kapağı kırılmış ve kablolar dışarıda duruyor. Çocuklar için büyük risk.',
      category: IssueCategory.INFRASTRUCTURE,
      status: IssueStatus.IN_REVIEW,
      priority: Priority.URGENT,
      city: 'İzmir',
      district: 'Konak',
      address: 'Kültür, Sevgi Yolu, 35220 Konak/İzmir',
      lat: 38.4326,
      lng: 27.1402,
      reportedById: user.id,
    },

    // ANTALYA
    {
      title: 'Konyaaltı Plaj Yolu Kanalizasyon Taşması',
      description: 'Yağmur sonrası logar kapağı taşmış durumda, etrafa lağım suları ve kötü koku yayılıyor.',
      category: IssueCategory.WATER_SANITATION,
      status: IssueStatus.OPEN,
      priority: Priority.URGENT,
      city: 'Antalya',
      district: 'Konyaaltı',
      address: 'Kuşkavağı, Akdeniz Blv, Konyaaltı/Antalya',
      lat: 36.8722,
      lng: 30.6385,
      reportedById: user.id,
    },
    {
      title: 'Lara Düden Şelalesi Yürüyüş Yolu Korkuluk Hasarı',
      description: 'Seyir terasındaki ahşap korkuluklardan birkaçı kırılmış, uçurum kenarında güvenlik zafiyeti yaratıyor.',
      category: IssueCategory.SECURITY,
      status: IssueStatus.OPEN,
      priority: Priority.HIGH,
      city: 'Antalya',
      district: 'Muratpaşa',
      address: 'Çağlayan, Lara Cd., Muratpaşa/Antalya',
      lat: 36.8517,
      lng: 30.7828,
      reportedById: user.id,
    },

    // BURSA
    {
      title: 'Ulu Cami Çevresi Dilenci Sorunu',
      description: 'Cami çıkışında organize dilencilik yapan gruplar turistleri rahatsız ediyor.',
      category: IssueCategory.SECURITY,
      status: IssueStatus.OPEN,
      priority: Priority.MEDIUM,
      city: 'Bursa',
      district: 'Osmangazi',
      address: 'Nalbantoğlu, Atatürk Cd., Osmangazi/Bursa',
      lat: 40.1839,
      lng: 29.0620,
      reportedById: user.id,
    },
    {
      title: 'Teleferik İstasyonu Çöp Konteyneri Yetersizliği',
      description: 'Hafta sonu yoğunluğunda mevcut çöp kutuları yetmiyor, çöpler doğaya yayılıyor.',
      category: IssueCategory.ENVIRONMENT,
      status: IssueStatus.IN_REVIEW,
      priority: Priority.MEDIUM,
      city: 'Bursa',
      district: 'Yıldırım',
      address: 'Teferrüç, Teleferik İstasyonu, Yıldırım/Bursa',
      lat: 40.1654,
      lng: 29.0913,
      reportedById: user.id,
    },
    
    // ADANA (Metro yerine daha gerçekçi sorunlar)
    {
      title: 'Seyhan Baraj Gölü Kenarında Kaçak Moloz Dökümü',
      description: 'Gece saatlerinde kamyonlar göl kenarındaki boş araziye inşaat molozu döküyor. Çevre kirliliğine neden oluyor.',
      category: IssueCategory.ENVIRONMENT,
      status: IssueStatus.OPEN,
      priority: Priority.HIGH,
      city: 'Adana',
      district: 'Çukurova',
      address: 'Adnan Menderes Blv., Çukurova/Adana',
      lat: 37.0425,
      lng: 35.3090,
      reportedById: user.id,
    },
    {
      title: 'Optimum AVM Önü Trafik Lambası Arızası',
      description: 'D-400 karayolu üzerindeki yaya geçidi lambaları yanmıyor, araçlar çok hızlı geçiyor ve yayalar karşıya geçemiyor.',
      category: IssueCategory.TRANSPORTATION,
      status: IssueStatus.IN_REVIEW,
      priority: Priority.URGENT,
      city: 'Adana',
      district: 'Yüreğir',
      address: 'Sinanpaşa, D-400 Karayolu, Yüreğir/Adana',
      lat: 36.9852,
      lng: 35.3414,
      reportedById: user.id,
    },
    
    // DİYARBAKIR
    {
      title: 'Surlar Çevresinde Aşırı Otlanma',
      description: 'Tarihi surların dibinde yabani otlar çok uzamış durumda, hem görüntü kirliliği yaratıyor hem de yangın riski taşıyor.',
      category: IssueCategory.PARK_GARDEN,
      status: IssueStatus.OPEN,
      priority: Priority.MEDIUM,
      city: 'Diyarbakır',
      district: 'Sur',
      address: 'Cevat Paşa, Suriçi, Sur/Diyarbakır',
      lat: 37.9150,
      lng: 40.2312,
      reportedById: user.id,
    }
  ];

  for (const issue of issues) {
    await prisma.issue.create({
      data: issue,
    });
  }

  console.log(`${issues.length} adet gerçekçi sorun başarıyla eklendi!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
