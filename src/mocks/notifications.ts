import type { Notification } from '../types/social';

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1', type: 'price_alert', title: 'Price Alert',
    message: 'Charizard ex (PSA 10) is now above $380 — your target of $375 was hit!',
    cardId: 'sv3pt5-199', isRead: false, createdAt: '2026-04-02T14:00:00Z',
  },
  {
    id: 'n2', type: 'like', title: 'New Like',
    message: 'PokéInvestor liked your post about Umbreon ex',
    postId: 'p2', isRead: false, createdAt: '2026-04-02T13:30:00Z',
  },
  {
    id: 'n3', type: 'comment', title: 'New Comment',
    message: 'GradeKing commented: "Great pull! The centering looks PSA 10 worthy"',
    postId: 'p1', isRead: false, createdAt: '2026-04-02T12:00:00Z',
  },
  {
    id: 'n4', type: 'follow', title: 'New Follower',
    message: 'SealedCollector started following you',
    isRead: true, createdAt: '2026-04-02T10:15:00Z',
  },
  {
    id: 'n5', type: 'price_alert', title: 'Price Alert',
    message: 'Pikachu ex (PSA 10) dropped below $90 — your target of $90 was hit!',
    cardId: 'sv8-238', isRead: true, createdAt: '2026-04-01T20:00:00Z',
  },
  {
    id: 'n6', type: 'like', title: 'New Likes',
    message: 'Your post about Iono got 50+ likes',
    postId: 'p5', isRead: true, createdAt: '2026-04-01T18:30:00Z',
  },
  {
    id: 'n7', type: 'comment', title: 'New Comment',
    message: 'VintageCards replied: "151 set is carrying the market right now"',
    postId: 'p6', isRead: true, createdAt: '2026-04-01T16:00:00Z',
  },
  {
    id: 'n8', type: 'price_alert', title: 'Price Alert',
    message: 'Umbreon ex (PSA 10) is now above $210 — new 30-day high!',
    cardId: 'sv8pt5-161', isRead: true, createdAt: '2026-04-01T09:00:00Z',
  },
];
