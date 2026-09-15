export type ListingProduct = {
  name: string;
  note: string;
  image: string;
  alt?: string;
  colors?: string[];
};

export type HeroSection = {
  id: string;
  title: string;
  mediaType: 'image' | 'video';
  src: string;
  links: Array<{
    text: string;
    href: string;
  }>;
};
