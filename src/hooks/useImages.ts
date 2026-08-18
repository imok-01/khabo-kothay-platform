import { imageProvider } from '../repositories/ImageProvider';

/**
 * Image-source adapter — the hooks-layer seam for the swappable image
 * provider. Components import from here, never from the repository directly.
 */
export { imageProvider };
