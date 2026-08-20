export interface PublicReview {
  id: number;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MyReview extends PublicReview {
  isVisible: boolean;
}

export interface ReviewInput {
  rating: number;
  title?: string | null;
  body?: string | null;
}
