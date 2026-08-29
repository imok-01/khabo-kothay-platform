import { describe, expect, it } from 'vitest';
import { dedupePhotos, photoIdentity } from '../images';
import type { RestaurantImageSource } from '../images';

const GOOGLE = 'https://lh3.googleusercontent.com/gps-cs-s/AAA';

function photo(overrides: Partial<RestaurantImageSource> = {}): RestaurantImageSource {
  return {
    provider: 'google-photos',
    imageUrl: `${GOOGLE}=w1200-h905-k-no`,
    alt: 'a photo',
    attribution: 'Photos from Google Maps',
    license: 'Google Maps Platform',
    ...overrides,
  };
}

describe('photoIdentity', () => {
  it('ignores the width Google is being asked for', () => {
    expect(photoIdentity(`${GOOGLE}=w1200-h905-k-no`)).toBe(photoIdentity(`${GOOGLE}=w122-h92-k-no`));
    expect(photoIdentity(`${GOOGLE}=w800`)).toBe(GOOGLE);
  });

  it('leaves a URL with no sizing segment alone', () => {
    expect(photoIdentity('/images/kk-demo/cover.jpg')).toBe('/images/kk-demo/cover.jpg');
  });

  it('does not merge two different photos', () => {
    expect(photoIdentity(`${GOOGLE}=w1200-h905-k-no`)).not.toBe(photoIdentity(`${GOOGLE}B=w1200-h905-k-no`));
  });
});

describe('dedupePhotos', () => {
  it('collapses the same photo arriving twice at different widths', () => {
    // The shape that shipped the "3 / 6" counter: one `image_references` row
    // reaches the gallery once as a Google photo and once as an owner upload.
    const deduped = dedupePhotos([
      photo({ alt: 'Turkish Bazaar — photo from Google Maps' }),
      photo({ provider: 'khabo', imageUrl: `${GOOGLE}=w300-h226-k-no`, alt: 'Turkish Bazaar — owner photo' }),
    ]);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].alt).toBe('Turkish Bazaar — photo from Google Maps');
  });

  it('keeps distinct photos in order', () => {
    const deduped = dedupePhotos([
      photo({ imageUrl: `${GOOGLE}1=w1200-h905-k-no` }),
      photo({ imageUrl: `${GOOGLE}2=w1200-h905-k-no` }),
      photo({ imageUrl: `${GOOGLE}3=w1200-h905-k-no` }),
      photo({ imageUrl: `${GOOGLE}2=w240-h181-k-no` }),
    ]);
    expect(deduped.map((p) => p.imageUrl)).toEqual([
      `${GOOGLE}1=w1200-h905-k-no`,
      `${GOOGLE}2=w1200-h905-k-no`,
      `${GOOGLE}3=w1200-h905-k-no`,
    ]);
  });

  it('identifies a Place Photos entry by its reference when it has no URL yet', () => {
    const deduped = dedupePhotos([
      photo({ imageUrl: '', photoRef: 'ref-1' }),
      photo({ imageUrl: '', photoRef: 'ref-2' }),
      photo({ imageUrl: '', photoRef: 'ref-1' }),
    ]);
    expect(deduped.map((p) => p.photoRef)).toEqual(['ref-1', 'ref-2']);
  });

  it('drops an entry that identifies no photo at all', () => {
    expect(dedupePhotos([photo({ imageUrl: '' }), photo({ imageUrl: '   ' })])).toEqual([]);
  });
});
