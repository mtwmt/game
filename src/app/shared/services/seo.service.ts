import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';

export interface SeoConfig {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'game';
  author?: string;
  canonical?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private meta = inject(Meta);
  private title = inject(Title);
  private platformId = inject(PLATFORM_ID);
  private document = inject(DOCUMENT);
  private isBrowser = isPlatformBrowser(this.platformId);

  private readonly defaultConfig = {
    siteName: '線上小遊戲中心 - 免費經典遊戲合集',
    defaultImage: '/assets/og-image.png',
    domain: 'https://mtwmt.com/game',
    author: 'Game Hub',
    twitterHandle: '@gamehub',
  };

  /**
   * 更新頁面的所有 SEO 標籤
   */
  updateSeoTags(config: SeoConfig): void {
    // 更新標題
    const fullTitle = config.title + ' | ' + this.defaultConfig.siteName;
    this.title.setTitle(fullTitle);

    // 基本 Meta 標籤
    this.meta.updateTag({ name: 'description', content: config.description });
    if (config.keywords) {
      this.meta.updateTag({ name: 'keywords', content: config.keywords });
    }
    if (config.author) {
      this.meta.updateTag({ name: 'author', content: config.author });
    }

    // Canonical URL
    if (config.canonical) {
      this.updateCanonical(config.canonical);
    }

    // Open Graph 標籤
    this.updateOpenGraphTags(config);

    // Twitter Card 標籤
    this.updateTwitterCardTags(config);

    // JSON-LD 結構化資料
    this.updateStructuredData(config);
  }

  /**
   * 更新 Open Graph 標籤 (Facebook, LinkedIn 等)
   */
  private updateOpenGraphTags(config: SeoConfig): void {
    const url = config.url || this.defaultConfig.domain;
    const image = config.image || this.defaultConfig.domain + this.defaultConfig.defaultImage;
    const type = config.type || 'website';

    this.meta.updateTag({ property: 'og:title', content: config.title });
    this.meta.updateTag({ property: 'og:description', content: config.description });
    this.meta.updateTag({ property: 'og:type', content: type });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:image:alt', content: config.title });
    this.meta.updateTag({ property: 'og:site_name', content: this.defaultConfig.siteName });
    this.meta.updateTag({ property: 'og:locale', content: 'zh_TW' });
  }

  /**
   * 更新 Twitter Card 標籤
   */
  private updateTwitterCardTags(config: SeoConfig): void {
    const image = config.image || this.defaultConfig.domain + this.defaultConfig.defaultImage;

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: config.title });
    this.meta.updateTag({ name: 'twitter:description', content: config.description });
    this.meta.updateTag({ name: 'twitter:image', content: image });
    this.meta.updateTag({ name: 'twitter:image:alt', content: config.title });
    if (this.defaultConfig.twitterHandle) {
      this.meta.updateTag({ name: 'twitter:site', content: this.defaultConfig.twitterHandle });
      this.meta.updateTag({ name: 'twitter:creator', content: this.defaultConfig.twitterHandle });
    }
  }

  /**
   * 更新 Canonical URL
   */
  private updateCanonical(url: string): void {
    // 只在瀏覽器環境執行
    if (!this.isBrowser) {
      return;
    }

    // 移除舊的 canonical
    const existingLink = this.document.querySelector('link[rel="canonical"]');
    if (existingLink) {
      existingLink.remove();
    }

    // 加入新的 canonical
    const link = this.document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', url);
    this.document.head.appendChild(link);
  }

  /**
   * 更新結構化資料 (JSON-LD)
   */
  private updateStructuredData(config: SeoConfig): void {
    // 只在瀏覽器環境執行
    if (!this.isBrowser) {
      return;
    }

    const url = config.url || this.defaultConfig.domain;

    // 移除舊的結構化資料
    const existingScript = this.document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }

    // 建立基本的 WebSite 結構化資料
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': config.type === 'game' ? 'VideoGame' : 'WebSite',
      name: config.title,
      description: config.description,
      url: url,
      image: config.image || this.defaultConfig.domain + this.defaultConfig.defaultImage,
      author: {
        '@type': 'Organization',
        name: config.author || this.defaultConfig.author,
      },
      inLanguage: 'zh-TW',
    };

    // 如果是遊戲類型,加入額外資訊
    if (config.type === 'game') {
      Object.assign(structuredData, {
        genre: 'Casual Game',
        gamePlatform: 'Web Browser',
        operatingSystem: 'Any',
        applicationCategory: 'Game',
      });
    }

    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(structuredData);
    this.document.head.appendChild(script);
  }

  /**
   * 清理所有 SEO 標籤
   */
  clearSeoTags(): void {
    // 只在瀏覽器環境執行
    if (!this.isBrowser) {
      return;
    }

    // 移除 canonical
    const canonical = this.document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.remove();
    }

    // 移除結構化資料
    const structuredData = this.document.querySelector('script[type="application/ld+json"]');
    if (structuredData) {
      structuredData.remove();
    }
  }
}
