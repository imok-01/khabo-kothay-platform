import { restaurantService } from '../services/restaurantService';
import { restaurants } from '../data/restaurants';
import { saveMenuOverride, useMenusVersion } from '../store/demoDb';

/**
 * Restaurant-data adapter — the hooks-layer seam for the sync catalogue
 * (admin tables, compare tray) and the demo menu store. Pages import from
 * here, never from the service/repository/dataset directly.
 */
export const getAllRestaurantsSync = (): ReturnType<typeof restaurantService.getAllSync> =>
  restaurantService.getAllSync();

export { restaurants, saveMenuOverride, useMenusVersion };
