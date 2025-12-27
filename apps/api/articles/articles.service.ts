import { Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma.service';
import { CacheService } from '../src/cache/cache.service';
import { ArticleDetailDto, ArticleFeedDto } from './dto/article.dto';
import { mapArticleToDetail, mapArticleToSummary } from './article.mapper';

@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) { }

  private buildSummarySelect() {
    return {
      id: true,
      slug: true,
      locale: true,
      title: true,
      subtitle: true,
      excerpt: true,
      tags: true,
      heroImageUrl: true,
      coverUrl: true,
      coverAlt: true,
      sourceName: true,
      readingMinutes: true,
      createdAt: true,
      publishedAt: true,
      viewCount: true,
    } as const;
  }

  async getFeed(page = 1, pageSize = 20, locale = 'ru'): Promise<ArticleFeedDto> {
    const cacheKey = `feed:${locale}:${page}:${pageSize}`;
    const cached = await this.cache.get<ArticleFeedDto>(cacheKey, 'articles:list');
    if (cached) {
      return cached;
    }

    const skip = (page - 1) * pageSize;
    const [articles, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where: {
          locale,
          isActive: true,
          OR: [
            { isPublished: true }, // Backward compatibility
            { isActive: true },
          ],
        },
        orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
        skip,
        take: pageSize,
        select: this.buildSummarySelect(),
      }),
      this.prisma.article.count({
        where: {
          locale,
          isActive: true,
          OR: [
            { isPublished: true }, // Backward compatibility
            { isActive: true },
          ],
        },
      }),
    ]);

    const payload: ArticleFeedDto = {
      articles: articles.map(mapArticleToSummary),
      page,
      pageSize,
      total,
    };
    await this.cache.set(cacheKey, payload, 'articles:list');
    return payload;
  }

  async getFeatured(limit = 10, locale = 'ru') {
    const cacheKey = `featured:${locale}:${limit}`;
    const cached = await this.cache.get<ArticleFeedDto['articles']>(cacheKey, 'articles:list');
    if (cached) {
      return cached;
    }

    const articles = await this.prisma.article.findMany({
      where: {
        locale,
        isActive: true,
        isFeatured: true,
        OR: [
          { isPublished: true }, // Backward compatibility
          { isActive: true },
        ],
      },
      orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
      take: limit,
      select: this.buildSummarySelect(),
    });

    const summaries = articles.map(mapArticleToSummary);
    await this.cache.set(cacheKey, summaries, 'articles:list');
    return summaries;
  }

  async getBySlug(slug: string, locale = 'ru'): Promise<ArticleDetailDto> {
    const cacheKey = `${locale}:${slug}`;
    const cached = await this.cache.get<ArticleDetailDto>(cacheKey, 'articles:detail');
    if (cached) {
      return cached;
    }

    const article = await this.prisma.article.findUnique({
      where: {
        slug_locale: {
          slug,
          locale,
        },
      },
    });

    if (!article || !article.isActive) {
      // Fallback for backward compatibility: try to find by slug only (old unique constraint)
      const legacyArticle = await this.prisma.article.findFirst({
        where: {
          slug,
          OR: [
            { isPublished: true }, // Backward compatibility
            { isActive: true },
          ],
        },
      });

      if (!legacyArticle) {
        throw new NotFoundException('Article not found');
      }

      // Update view count for legacy article
      this.prisma.article
        .update({
          where: { id: legacyArticle.id },
          data: { viewCount: { increment: 1 } },
        })
        .catch((err) => console.error('Error incrementing view count:', err));

      const detail = mapArticleToDetail(legacyArticle);
      await this.cache.set(cacheKey, detail, 'articles:detail');
      return detail;
    }

    // Update view count
    this.prisma.article
      .update({
        where: { id: article.id },
        data: { viewCount: { increment: 1 } },
      })
      .catch((err) => console.error('Error incrementing view count:', err));

    const detail = mapArticleToDetail(article);
    await this.cache.set(cacheKey, detail, 'articles:detail');
    return detail;
  }

  async search(query: string, page: number = 1, pageSize: number = 20, locale = 'ru'): Promise<ArticleFeedDto> {
    const cacheKey = this.buildSearchKey(query, page, pageSize, locale);
    const cached = await this.cache.get<ArticleFeedDto>(cacheKey, 'articles:list');
    if (cached) {
      return cached;
    }

    const skip = (page - 1) * pageSize;
    const [articles, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where: {
          locale,
          isActive: true,
          OR: [
            { isPublished: true }, // Backward compatibility
            { isActive: true },
          ],
          AND: [
            {
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { excerpt: { contains: query, mode: 'insensitive' } },
                { subtitle: { contains: query, mode: 'insensitive' } },
                { bodyMarkdown: { contains: query, mode: 'insensitive' } },
                { tags: { has: query } },
              ],
            },
          ],
        },
        orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
        skip,
        take: pageSize,
        select: this.buildSummarySelect(),
      }),
      this.prisma.article.count({
        where: {
          locale,
          isActive: true,
          OR: [
            { isPublished: true }, // Backward compatibility
            { isActive: true },
          ],
          AND: [
            {
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { excerpt: { contains: query, mode: 'insensitive' } },
                { subtitle: { contains: query, mode: 'insensitive' } },
                { bodyMarkdown: { contains: query, mode: 'insensitive' } },
                { tags: { has: query } },
              ],
            },
          ],
        },
      }),
    ]);

    const payload: ArticleFeedDto = {
      articles: articles.map(mapArticleToSummary),
      page,
      pageSize,
      total,
    };

    await this.cache.set(cacheKey, payload, 'articles:list');

    return payload;
  }

  async getByTag(tag: string, page: number = 1, pageSize: number = 20, locale = 'ru'): Promise<ArticleFeedDto> {
    const cacheKey = this.buildTagKey(tag, page, pageSize, locale);
    const cached = await this.cache.get<ArticleFeedDto>(cacheKey, 'articles:list');
    if (cached) {
      return cached;
    }

    const skip = (page - 1) * pageSize;
    const [articles, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where: {
          locale,
          isActive: true,
          tags: { has: tag },
          OR: [
            { isPublished: true }, // Backward compatibility
            { isActive: true },
          ],
        },
        orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
        skip,
        take: pageSize,
        select: this.buildSummarySelect(),
      }),
      this.prisma.article.count({
        where: {
          locale,
          isActive: true,
          tags: { has: tag },
          OR: [
            { isPublished: true }, // Backward compatibility
            { isActive: true },
          ],
        },
      }),
    ]);

    const payload: ArticleFeedDto = {
      articles: articles.map(mapArticleToSummary),
      page,
      pageSize,
      total,
    };

    await this.cache.set(cacheKey, payload, 'articles:list');

    return payload;
  }

  private buildSearchKey(query: string, page: number, pageSize: number, locale: string) {
    const hash = crypto.createHash('sha1').update(`${locale}:${query}:${page}:${pageSize}`).digest('hex');
    return `search:${hash}`;
  }

  private buildTagKey(tag: string, page: number, pageSize: number, locale: string) {
    const hash = crypto.createHash('sha1').update(`${locale}:${tag}:${page}:${pageSize}`).digest('hex');
    return `tag:${hash}`;
  }

  async findAll(locale: string, page: number = 1, pageSize: number = 1) {
    return this.getFeed(page, pageSize, locale);
  }

  async seedArticles() {
    console.log('[ArticlesService] Starting article seeding...');

    const articles = [
      {
        slug: 'healthy-eating-basics-ru',
        locale: 'ru',
        title: 'Основы здорового питания',
        subtitle: 'Начните свой путь к здоровому образу жизни',
        excerpt: 'Узнайте основные принципы здорового питания для поддержания энергии и здоровья.',
        bodyMarkdown: `# Основы здорового питания

Здоровое питание — это основа хорошего самочувствия и долголетия.

## Ключевые принципы:

1. **Баланс макронутриентов**: Белки, жиры и углеводы в правильных пропорциях
2. **Разнообразие**: Разные продукты обеспечивают разные питательные вещества
3. **Регулярность**: Ешьте в одно и то же время
4. **Умеренность**: Контролируйте размер порций

## Что включить в рацион:

- Свежие овощи и фрукты (5 порций в день)
- Цельнозерновые продукты
- Белковые продукты (рыба, птица, бобовые)
- Полезные жиры (орехи, авокадо, оливковое масло)

Помните: питание должно быть не только полезным, но и приносить удовольствие!`,
        heroImageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800',
        coverUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800',
        coverAlt: 'Здоровое питание',
        tags: ['basics', 'health', 'nutrition'],
        isFeatured: true,
        isActive: true,
        isPublished: true,
        readingMinutes: 5,
        publishedAt: new Date(),
      },
      {
        slug: 'protein-importance-ru',
        locale: 'ru',
        title: 'Важность белка в рационе',
        subtitle: 'Строительный материал для вашего тела',
        excerpt: 'Белок — строительный материал для вашего тела. Узнайте, сколько вам нужно.',
        bodyMarkdown: `# Важность белка в рационе

Белок необходим для роста и восстановления тканей организма.

## Функции белка:

- Построение мышечной массы
- Поддержка иммунной системы
- Производство ферментов и гормонов
- Транспорт питательных веществ

## Источники качественного белка:

**Животные источники:**
- Куриная грудка (31г белка на 100г)
- Рыба (20-25г на 100г)
- Яйца (13г на 100г)
- Творог (18г на 100г)

**Растительные источники:**
- Чечевица (9г на 100г)
- Киноа (4г на 100г)
- Тофу (8г на 100г)
- Нут (19г на 100г)

Рекомендуемая норма: 0.8-1.2г белка на кг веса тела.`,
        heroImageUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800',
        coverUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800',
        coverAlt: 'Белковые продукты',
        tags: ['protein', 'macros'],
        isFeatured: true,
        isActive: true,
        isPublished: true,
        readingMinutes: 4,
        publishedAt: new Date(),
      },
      {
        slug: 'hydration-guide-ru',
        locale: 'ru',
        title: 'Гидратация: сколько воды пить',
        subtitle: 'Правильное потребление воды критично для здоровья',
        excerpt: 'Правильное потребление воды критично для здоровья. Узнайте вашу норму.',
        bodyMarkdown: `# Гидратация: сколько воды пить

Вода составляет около 60% массы тела и участвует во всех процессах.

## Признаки обезвоживания:

- Темная моча
- Сухость во рту
- Усталость
- Головные боли
- Снижение концентрации

## Рекомендации по потреблению:

- **Мужчины**: 3.7 литра в день
- **Женщины**: 2.7 литра в день
- **При физической активности**: +500-1000 мл

## Советы:

1. Пейте стакан воды утром
2. Держите бутылку воды под рукой
3. Пейте перед каждым приемом пищи
4. Используйте приложения-напоминания

Помните: чай, кофе и супы тоже считаются!`,
        heroImageUrl: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
        coverUrl: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
        coverAlt: 'Вода и гидратация',
        tags: ['water', 'hydration', 'health'],
        isFeatured: false,
        isActive: true,
        isPublished: true,
        readingMinutes: 3,
        publishedAt: new Date(),
      },
      // English articles
      {
        slug: 'healthy-eating-basics-en',
        locale: 'en',
        title: 'Healthy Eating Basics',
        subtitle: 'Start your journey to a healthier lifestyle',
        excerpt: 'Learn the fundamental principles of healthy eating for maintaining energy and health.',
        bodyMarkdown: `# Healthy Eating Basics

Healthy eating is the foundation of well-being and longevity.

## Key Principles:

1. **Macronutrient Balance**: Proteins, fats, and carbs in the right proportions
2. **Variety**: Different foods provide different nutrients
3. **Regularity**: Eat at consistent times
4. **Moderation**: Control portion sizes

## What to Include in Your Diet:

- Fresh vegetables and fruits (5 servings per day)
- Whole grain products
- Protein sources (fish, poultry, legumes)
- Healthy fats (nuts, avocado, olive oil)

Remember: food should be not only healthy but also enjoyable!`,
        heroImageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800',
        coverUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800',
        coverAlt: 'Healthy eating',
        tags: ['basics', 'health', 'nutrition'],
        isFeatured: true,
        isActive: true,
        isPublished: true,
        readingMinutes: 5,
        publishedAt: new Date(),
      },
      {
        slug: 'protein-importance-en',
        locale: 'en',
        title: 'The Importance of Protein',
        subtitle: 'Building blocks for your body',
        excerpt: 'Protein is the building block for your body. Learn how much you need.',
        bodyMarkdown: `# The Importance of Protein

Protein is essential for growth and tissue repair.

## Functions of Protein:

- Building muscle mass
- Supporting immune system
- Producing enzymes and hormones
- Transporting nutrients

## Quality Protein Sources:

**Animal sources:**
- Chicken breast (31g protein per 100g)
- Fish (20-25g per 100g)
- Eggs (13g per 100g)
- Cottage cheese (18g per 100g)

**Plant sources:**
- Lentils (9g per 100g)
- Quinoa (4g per 100g)
- Tofu (8g per 100g)
- Chickpeas (19g per 100g)

Recommended intake: 0.8-1.2g protein per kg of body weight.`,
        heroImageUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800',
        coverUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800',
        coverAlt: 'Protein foods',
        tags: ['protein', 'macros'],
        isFeatured: true,
        isActive: true,
        isPublished: true,
        readingMinutes: 4,
        publishedAt: new Date(),
      },
      {
        slug: 'hydration-guide-en',
        locale: 'en',
        title: 'Hydration: How Much Water to Drink',
        subtitle: 'Proper water intake is critical for health',
        excerpt: 'Proper water intake is critical for health. Learn your daily requirement.',
        bodyMarkdown: `# Hydration: How Much Water to Drink

Water makes up about 60% of body mass and is involved in all processes.

## Signs of Dehydration:

- Dark urine
- Dry mouth
- Fatigue
- Headaches
- Reduced concentration

## Intake Recommendations:

- **Men**: 3.7 liters per day
- **Women**: 2.7 liters per day
- **During physical activity**: +500-1000 ml

## Tips:

1. Drink a glass of water in the morning
2. Keep a water bottle handy
3. Drink before each meal
4. Use reminder apps

Remember: tea, coffee, and soups count too!`,
        heroImageUrl: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
        coverUrl: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
        coverAlt: 'Water and hydration',
        tags: ['water', 'hydration', 'health'],
        isFeatured: false,
        isActive: true,
        isPublished: true,
        readingMinutes: 3,
        publishedAt: new Date(),
      },
      // Kazakh articles
      {
        slug: 'healthy-eating-basics-kk',
        locale: 'kk',
        title: 'Сау тамақтану негіздері',
        subtitle: 'Салауатты өмір салтына жолыңызды бастаңыз',
        excerpt: 'Энергия мен денсаулықты сақтау үшін сау тамақтанудың негізгі принциптерін біліңіз.',
        bodyMarkdown: `# Сау тамақтану негіздері

Сау тамақтану - жақсы денсаулық пен ұзақ өмір сүрудің негізі.

## Негізгі принциптер:

1. **Макронутриенттер балансы**: Ақуыздар, майлар және көмірсулар дұрыс пропорцияда
2. **Әртүрлілік**: Әр түрлі тағамдар әр түрлі қоректік заттар береді
3. **Тұрақтылық**: Бір уақытта тамақтаныңыз
4. **Қалыптылық**: Порция мөлшерін бақылаңыз

## Рационға не қосу керек:

- Жаңа көкөністер мен жемістер (күніне 5 порция)
- Толық дәнді өнімдер
- Ақуыз көздері (балық, құс, бұршақ тұқымдастар)
- Пайдалы майлар (жаңғақ, авокадо, зәйтүн майы)

Есіңізде болсын: тамақ тек пайдалы ғана емес, ләззат әкелетін де болуы керек!`,
        heroImageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800',
        coverUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800',
        coverAlt: 'Сау тамақтану',
        tags: ['basics', 'health', 'nutrition'],
        isFeatured: true,
        isActive: true,
        isPublished: true,
        readingMinutes: 5,
        publishedAt: new Date(),
      },
      {
        slug: 'protein-importance-kk',
        locale: 'kk',
        title: 'Ақуыздың маңыздылығы',
        subtitle: 'Денеңіз үшін құрылыс материалы',
        excerpt: 'Ақуыз - денеңіз үшін құрылыс материалы. Сізге қанша керек екенін біліңіз.',
        bodyMarkdown: `# Ақуыздың маңыздылығы

Ақуыз тіндердің өсуі мен қалпына келуі үшін қажет.

## Ақуыздың функциялары:

- Бұлшықет массасын құру
- Иммундық жүйені қолдау
- Ферменттер мен гормондар өндіру
- Қоректік заттарды тасымалдау

## Сапалы ақуыз көздері:

**Жануар көздері:**
- Тауық төсі (100г-да 31г ақуыз)
- Балық (100г-да 20-25г)
- Жұмыртқа (100г-да 13г)
- Сүзбе (100г-да 18г)

**Өсімдік көздері:**
- Жасымық (100г-да 9г)
- Киноа (100г-да 4г)
- Тофу (100г-да 8г)
- Нұт (100г-да 19г)

Ұсынылатын норма: дене салмағының 1 кг-на 0.8-1.2г ақуыз.`,
        heroImageUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800',
        coverUrl: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800',
        coverAlt: 'Ақуыз өнімдері',
        tags: ['protein', 'macros'],
        isFeatured: true,
        isActive: true,
        isPublished: true,
        readingMinutes: 4,
        publishedAt: new Date(),
      },
      {
        slug: 'hydration-guide-kk',
        locale: 'kk',
        title: 'Гидратация: қанша су ішу керек',
        subtitle: 'Дұрыс су тұтыну денсаулық үшін өте маңызды',
        excerpt: 'Дұрыс су тұтыну денсаулық үшін өте маңызды. Өзіңіздің нормаңызды біліңіз.',
        bodyMarkdown: `# Гидратация: қанша су ішу керек

Су дене массасының шамамен 60%-ын құрайды және барлық процестерге қатысады.

## Сусыздану белгілері:

- Қара несеп
- Ауыздың құрғауы
- Шаршау
- Бас ауруы
- Зейіннің төмендеуі

## Тұтыну бойынша ұсыныстар:

- **Ерлер**: күніне 3.7 литр
- **Әйелдер**: күніне 2.7 литр
- **Физикалық белсенділік кезінде**: +500-1000 мл

## Кеңестер:

1. Таңертең бір стакан су ішіңіз
2. Су бөтелкесін қолыңыздың астында ұстаңыз
3. Әр тамақтан алдын ішіңіз
4. Еске салу қолданбаларын пайдаланыңыз

Есте сақтаңыз: шай, кофе және сорпа да есептеледі!`,
        heroImageUrl: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
        coverUrl: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
        coverAlt: 'Су және гидратация',
        tags: ['water', 'hydration', 'health'],
        isFeatured: false,
        isActive: true,
        isPublished: true,
        readingMinutes: 3,
        publishedAt: new Date(),
      },
    ];

    let seededCount = 0;
    for (const article of articles) {
      try {
        await this.prisma.article.upsert({
          where: {
            slug_locale: {
              slug: article.slug,
              locale: article.locale,
            },
          },
          update: article,
          create: article,
        });
        seededCount++;
      } catch (error) {
        console.error(`[ArticlesService] Failed to seed article ${article.slug}:`, error);
      }
    }

    console.log(`[ArticlesService] ✅ Seeded ${seededCount} articles`);
    return seededCount;
  }
}

