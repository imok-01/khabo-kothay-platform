import type { ReviewSample } from '../repositories/reviewSamplesRepository';
import { reviewSamplesRepository } from '../repositories/reviewSamplesRepository';

export const reviewSamplesService = {
  fetchForRestaurant: (restaurantId: string): Promise<ReviewSample[]> =>
    reviewSamplesRepository.fetchForRestaurant(restaurantId),
};
