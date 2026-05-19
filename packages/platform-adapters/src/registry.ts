import type { PlatformVariantKind } from '@qyro/shared';
import { MockPublisher, platformForKind } from './mock-publisher.js';
import type { SocialPublisher } from './types.js';

const publishers: Record<'instagram' | 'facebook' | 'tiktok', SocialPublisher> = {
  instagram: new MockPublisher('instagram'),
  facebook: new MockPublisher('facebook'),
  tiktok: new MockPublisher('tiktok'),
};

/**
 * Devuelve el publisher correspondiente al `kind` de variante.
 *
 * Para sustituir el mock por implementación real, cambia el constructor en
 * `publishers` (p.ej. `new MetaInstagramPublisher(...)`).
 */
export function getPublisher(kind: PlatformVariantKind): SocialPublisher {
  return publishers[platformForKind(kind)];
}
