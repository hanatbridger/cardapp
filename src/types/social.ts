export type SentimentTag = 'bullish' | 'bearish' | 'neutral' | 'just_pulled';

export interface UserProfile {
  id: string;
  displayName: string;
  handle: string;
  avatarUrl?: string;
  bio?: string;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
}

export interface FeedPost {
  id: string;
  author: UserProfile;
  text: string;
  cardId?: string;
  cardName?: string;
  cardImageUrl?: string;
  sentiment?: SentimentTag;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  author: UserProfile;
  text: string;
  likesCount: number;
  isLiked: boolean;
  createdAt: string;
}

export type NotificationType = 'price_alert' | 'like' | 'comment' | 'follow';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  avatarUrl?: string;
  cardId?: string;
  postId?: string;
  isRead: boolean;
  createdAt: string;
}
