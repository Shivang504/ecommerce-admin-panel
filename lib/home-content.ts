export type HomeCta = { label: string; href: string };

export type HeroSlide = {
  tag: string;
  title: string;
  highlight: string;
  subtitle: string;
  cta: HomeCta;
  image: string;
  background: string;
  accentColor: string;
  buttonColor: string;
};

export type SideBanner = {
  tag: string;
  tagColor: string;
  title: string;
  titleColor: string;
  subtitle: string;
  cta: HomeCta;
  image: string;
  background: string;
  buttonColor: string;
};

export type SaleBanner = {
  title: string;
  subtitle: string;
  cta: HomeCta;
  image: string;
  background: string;
  buttonColor: string;
  bigText: string;
  bigTextColor: string;
  badgeText: string;
  badgeColor: string;
};

export type PromoCard = {
  title: string;
  titleColor: string;
  subtitle: string;
  action: string;
  href: string;
  image: string;
  imageStyle: 'figure-right' | 'icon-left' | 'figure-right-wide';
  background: string;
};

export type TrendyBanner = {
  title: string;
  subtitle: string;
  cta: HomeCta;
  background: string;
  items: Array<{ label: string; image: string; href: string }>;
  offerTop: string;
  offerBig: string;
  offerSuffix: string;
  offerBottom: string;
};

export type BeautyBanner = {
  title: string;
  subtitle: string;
  cta: HomeCta;
  image: string;
  background: string;
  accent: string;
  buttonColor: string;
  offerTop: string;
  offerBig: string;
  offerBottom: string;
};

export type FooterLink = { label: string; href: string };

export type FooterContent = {
  brand: string;
  headline: string;
  highlight: string;
  features: string[];
  appTitle: string;
  playStoreUrl: string;
  appStoreUrl: string;
  shopTitle: string;
  columns: Array<{ title: string; section?: 'about' | 'help' | 'consumer-policy'; links: FooterLink[] }>;
  copyright: string;
  image: string;
};

export type HomeContent = {
  hero: { slides: HeroSlide[]; side: SideBanner[] };
  saleBanner: SaleBanner;
  promoCards: PromoCard[];
  trendy: TrendyBanner;
  beautyBanner: BeautyBanner;
  footer: FooterContent;
};

export const DEFAULT_HOME_CONTENT: HomeContent = {
  hero: {
    slides: [
      {
        tag: 'Korean Beauty',
        title: 'Glow Naturally,',
        highlight: 'Everyday',
        subtitle: 'Premium Korean skincare\nfor healthy, radiant skin.',
        cta: { label: 'Shop Now', href: '/products?search=korean' },
        image: '/home/hero-korean-beauty.jpg',
        background: '#F7ECFB',
        accentColor: '#7A1CB4',
        buttonColor: '#7515BA',
      },
    ],
    side: [
      {
        tag: 'Herbal & Organic',
        tagColor: '#2E7D3F',
        title: 'Pure. Natural.\nBetter for You.',
        titleColor: '#1F6131',
        subtitle: '',
        cta: { label: 'Shop Now', href: '/products?search=herbal' },
        image: '/home/side-herbal.jpg',
        background: '#F6F4EA',
        buttonColor: '#036B1B',
      },
      {
        tag: 'Beauty Essentials',
        tagColor: '#D7263D',
        title: 'Up to 35% Off',
        titleColor: '#0B0B0F',
        subtitle: 'On Top Brands',
        cta: { label: 'Shop Now', href: '/products?search=beauty' },
        image: '/home/side-beauty.jpg',
        background: '#FDECE8',
        buttonColor: '#E42530',
      },
    ],
  },
  saleBanner: {
    title: 'Big Deals. Bigger Savings.',
    subtitle: 'Up to 60% Off on Top Brands!',
    cta: { label: 'Shop Now', href: '/products?section=deals' },
    image: '/home/sale-girl.jpg',
    background: '#F3ECFC',
    buttonColor: '#7520BA',
    bigText: 'SALE',
    bigTextColor: '#6D1CA9',
    badgeText: 'LIMITED\nTIME\nOFFER',
    badgeColor: '#7C23B9',
  },
  promoCards: [
    {
      title: 'Extra 10% Off',
      titleColor: '#186A2E',
      subtitle: 'On First Order',
      action: 'Use Code: TRYVV010',
      href: '/products',
      image: '/home/promo-first-order.jpg',
      imageStyle: 'figure-right',
      background: '#F3F5F2',
    },
    {
      title: 'Tryvvo SuperCoins',
      titleColor: '#B8622E',
      subtitle: 'Earn SuperCoins\non every order',
      action: 'Know More',
      href: '/account?tab=rewards',
      image: '/home/promo-coin.png',
      imageStyle: 'icon-left',
      background: '#FEF8EC',
    },
    {
      title: 'Refer & Earn',
      titleColor: '#6A34A8',
      subtitle: 'Invite friends & earn\nexciting rewards',
      action: 'Invite Now',
      href: '/account?tab=games',
      image: '/home/promo-refer.jpg',
      imageStyle: 'figure-right-wide',
      background: '#F4EDFD',
    },
  ],
  trendy: {
    title: 'Trendy Styles\nFor Every You!',
    subtitle: 'Explore the latest fashion for\nmen, women & kids.',
    cta: { label: 'Shop Now', href: '/products?category=men' },
    background: '#FAF6F1',
    items: [
      { label: 'Men', image: '/home/trendy-men.jpg', href: '/products?category=men' },
      { label: 'Women', image: '/home/trendy-women.jpg', href: '/products?category=women' },
      { label: 'Kids', image: '/home/trendy-kids.jpg', href: '/products?category=baby%26kids' },
    ],
    offerTop: 'UP TO',
    offerBig: '40%',
    offerSuffix: 'OFF',
    offerBottom: 'On Fashion',
  },
  beautyBanner: {
    title: 'Beauty that cares,\nThe glow that shares.',
    subtitle: 'Shop skincare & cosmetics\nfor your everyday glow.',
    cta: { label: 'Shop Now', href: '/skin-beauty' },
    image: '/home/beauty-products.jpg',
    background: '#FDEAE4',
    accent: '#A3101F',
    buttonColor: '#D0313A',
    offerTop: 'UP TO',
    offerBig: '35%',
    offerBottom: 'OFF',
  },
  footer: {
    brand: 'Tryvvo',
    headline: 'Your Destination for',
    highlight: 'Quality & Happiness',
    features: ['100% Original Products', 'Secure Payments', 'Easy Returns & Refunds', 'Exciting Offers & Rewards'],
    appTitle: 'Download Our App',
    playStoreUrl: '#',
    appStoreUrl: '#',
    shopTitle: 'SHOP',
    columns: [
      {
        title: 'CUSTOMER SERVICE',
        section: 'help',
        links: [
          { label: 'Help Center', href: '/support' },
          { label: 'Track Your Order', href: '/orders' },
          { label: 'Returns & Refunds', href: '/refund-return' },
          { label: 'Shipping Policy', href: '/shipping-policy' },
          { label: 'Payment Methods', href: '/support' },
          { label: 'FAQ', href: '/support' },
        ],
      },
      {
        title: 'ABOUT TRYVVO',
        section: 'about',
        links: [
          { label: 'About Us', href: '/pages/about-us' },
          { label: 'Careers', href: '/pages/careers' },
          { label: 'Become a Seller', href: 'https://supplier.tryvvo.com' },
          { label: 'Press & Media', href: '/pages/press-media' },
          { label: 'Contact Us', href: '/contact' },
        ],
      },
      {
        title: 'POLICIES',
        section: 'consumer-policy',
        links: [
          { label: 'Terms & Conditions', href: '/terms-conditions' },
          { label: 'Privacy Policy', href: '/privacy-policy' },
          { label: 'Cancellation Policy', href: '/cancellation-policy' },
          { label: 'Return Policy', href: '/refund-return' },
          { label: 'Sitemap', href: '/sitemap.xml' },
        ],
      },
    ],
    copyright: '© {year} Tryvvo e-Commerce Private Limited. All Rights Reserved.',
    image: '/home/footer-girl.jpg',
  },
};

export function mergeHomeContent(saved: Partial<HomeContent> | null | undefined): HomeContent {
  const content = saved || {};
  return {
    hero: {
      slides: content.hero?.slides?.length ? content.hero.slides : DEFAULT_HOME_CONTENT.hero.slides,
      side: content.hero?.side?.length ? content.hero.side : DEFAULT_HOME_CONTENT.hero.side,
    },
    saleBanner: { ...DEFAULT_HOME_CONTENT.saleBanner, ...(content.saleBanner || {}) },
    promoCards: content.promoCards?.length ? content.promoCards : DEFAULT_HOME_CONTENT.promoCards,
    trendy: {
      ...DEFAULT_HOME_CONTENT.trendy,
      ...(content.trendy || {}),
      items: content.trendy?.items?.length ? content.trendy.items : DEFAULT_HOME_CONTENT.trendy.items,
    },
    beautyBanner: { ...DEFAULT_HOME_CONTENT.beautyBanner, ...(content.beautyBanner || {}) },
    footer: {
      ...DEFAULT_HOME_CONTENT.footer,
      ...(content.footer || {}),
      features: content.footer?.features?.length ? content.footer.features : DEFAULT_HOME_CONTENT.footer.features,
      columns: content.footer?.columns?.length ? content.footer.columns : DEFAULT_HOME_CONTENT.footer.columns,
    },
  };
}
