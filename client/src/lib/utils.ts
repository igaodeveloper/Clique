import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeAgo(date: Date | string) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true, locale: ptBR });
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function getContentTypeIcon(contentType: string): string {
  switch (contentType) {
    case 'image':
      return 'ri-image-line';
    case 'video':
      return 'ri-vidicon-line';
    case 'audio':
      return 'ri-mic-line';
    default:
      return 'ri-text-spacing';
  }
}

export function getPersonaIndicatorColor(personaType: string): string {
  switch (personaType) {
    case 'professional':
      return 'bg-blue-500';
    case 'casual':
      return 'bg-green-500';
    case 'creative':
      return 'bg-purple-500';
    case 'family':
      return 'bg-yellow-500';
    default:
      return 'bg-primary-500';
  }
}

export function getCategoryColor(category: string): string {
  switch (category?.toLowerCase()) {
    case 'tecnologia':
      return 'bg-primary-500';
    case 'lazer':
      return 'bg-secondary-500';
    case 'família':
      return 'bg-green-500';
    case 'educação':
    case 'educacao':
      return 'bg-yellow-500';
    case 'saúde':
    case 'saude':
      return 'bg-red-500';
    default:
      return 'bg-primary-500';
  }
}

export const defaultAvatarUrl = "https://api.dicebear.com/7.x/personas/svg?seed=";
