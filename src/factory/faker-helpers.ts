// Lightweight faker helpers - no external dependencies
// For production use, consider installing @faker-js/faker

const FIRST_NAMES = [
  'Ahmed', 'Mohammed', 'Ali', 'Omar', 'Khalid', 'Youssef', 'Ibrahim', 'Hassan',
  'Fatima', 'Aisha', 'Maryam', 'Noor', 'Sara', 'Layla', 'Hana', 'Zahra',
  'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emma', 'James', 'Olivia'
];

const LAST_NAMES = [
  'Al-Ahmad', 'Al-Hassan', 'Al-Ali', 'Al-Omar', 'Al-Khalid', 'Al-Ibrahim',
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'
];

const DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'example.com'];

const WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud'
];

const CITIES = [
  'Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Khobar', 'Dhahran',
  'New York', 'London', 'Dubai', 'Cairo', 'Istanbul', 'Paris', 'Berlin'
];

const COUNTRIES = ['Saudi Arabia', 'UAE', 'Egypt', 'USA', 'UK', 'Germany', 'France'];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)];
}

function randomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function firstName(): string {
  return randomElement(FIRST_NAMES);
}

export function lastName(): string {
  return randomElement(LAST_NAMES);
}

export function fullName(): string {
  return `${firstName()} ${lastName()}`;
}

export function email(name?: string): string {
  const localPart = name
    ? name.toLowerCase().replace(/\s+/g, '.') + randomInt(1, 999)
    : `user${randomInt(1000, 9999)}`;
  return `${localPart}@${randomElement(DOMAINS)}`;
}

export function phone(): string {
  return `+966${randomInt(500000000, 599999999)}`;
}

export function word(): string {
  return randomElement(WORDS);
}

export function words(count = 3): string {
  return randomElements(WORDS, count).join(' ');
}

export function sentence(wordCount = 8): string {
  const w = randomElements(WORDS, wordCount).join(' ');
  return w.charAt(0).toUpperCase() + w.slice(1) + '.';
}

export function paragraph(sentenceCount = 4): string {
  return Array.from({ length: sentenceCount }, () => sentence(randomInt(6, 12))).join(' ');
}

export function paragraphs(count = 3): string {
  return Array.from({ length: count }, () => paragraph()).join('\n\n');
}

export function number(min = 0, max = 100): number {
  return randomInt(min, max);
}

export function float(min = 0, max = 100, decimals = 2): number {
  const num = Math.random() * (max - min) + min;
  return parseFloat(num.toFixed(decimals));
}

export function boolean(): boolean {
  return Math.random() > 0.5;
}

export function date(start?: Date, end?: Date): Date {
  const startTime = start?.getTime() ?? new Date('2020-01-01').getTime();
  const endTime = end?.getTime() ?? Date.now();
  return new Date(randomInt(startTime, endTime));
}

export function pastDate(years = 1): Date {
  const now = Date.now();
  const past = now - years * 365 * 24 * 60 * 60 * 1000;
  return new Date(randomInt(past, now));
}

export function futureDate(years = 1): Date {
  const now = Date.now();
  const future = now + years * 365 * 24 * 60 * 60 * 1000;
  return new Date(randomInt(now, future));
}

export function city(): string {
  return randomElement(CITIES);
}

export function country(): string {
  return randomElement(COUNTRIES);
}

export function address(): string {
  return `${randomInt(1, 999)} ${word()} Street, ${city()}, ${country()}`;
}

export function slug(text?: string): string {
  const base = text ?? words(3);
  return base.toLowerCase().replace(/\s+/g, '-');
}

export function url(path?: string): string {
  const domain = randomElement(['example.com', 'test.com', 'demo.com']);
  return `https://${domain}${path ? `/${path}` : ''}`;
}

export function imageUrl(width = 200, height = 200): string {
  return `https://picsum.photos/${width}/${height}?random=${randomInt(1, 1000)}`;
}

export function avatar(): string {
  return `https://i.pravatar.cc/150?u=${uuid()}`;
}

export function currency(): string {
  return randomElement(['SAR', 'USD', 'EUR', 'GBP', 'AED']);
}

export function price(min = 10, max = 1000): number {
  return float(min, max, 2);
}

export function pick<T>(...options: T[]): T {
  return randomElement(options);
}

export function arrayElement<T>(array: T[]): T {
  return randomElement(array);
}

export function shuffle<T>(array: T[]): T[] {
  return [...array].sort(() => 0.5 - Math.random());
}

export function unique<T>(generator: () => T, count: number): T[] {
  const set = new Set<string>();
  const result: T[] = [];

  while (result.length < count) {
    const value = generator();
    const key = JSON.stringify(value);
    if (!set.has(key)) {
      set.add(key);
      result.push(value);
    }
  }

  return result;
}

export function sequence(start = 1): () => number {
  let current = start;
  return () => current++;
}

export function hexColor(): string {
  return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
}

export function ip(): string {
  return `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 255)}`;
}

export function userAgent(): string {
  const browsers = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Firefox/89.0'
  ];
  return randomElement(browsers);
}
