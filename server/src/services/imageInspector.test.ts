import { ImageInspector } from './imageInspector';

describe('ImageInspector', () => {
  let inspector: ImageInspector;

  beforeEach(() => {
    inspector = new ImageInspector();
  });

  describe('validateSignals', () => {
    it('should validate and sanitize signals correctly', () => {
      const mockSignals = {
        has_text: 'true', // string instead of boolean
        hazards: ['danger', 'obstacle', 'stairs', 'extra'], // more than 3
        people_count: '5', // string instead of number
        lighting_ok: 1, // number instead of boolean
        confidence: '0.8' // string instead of number
      };

      const result = (inspector as any).validateSignals(mockSignals);

      expect(result).toEqual({
        has_text: true,
        hazards: ['danger', 'obstacle', 'stairs'], // limited to 3
        people_count: 5,
        lighting_ok: true,
        confidence: 0.8
      });
    });

    it('should handle invalid inputs gracefully', () => {
      const mockSignals = {
        has_text: null,
        hazards: 'not an array',
        people_count: -5, // negative number
        lighting_ok: undefined,
        confidence: 2.5 // over 1.0
      };

      const result = (inspector as any).validateSignals(mockSignals);

      expect(result).toEqual({
        has_text: false,
        hazards: [],
        people_count: 0, // clamped to 0
        lighting_ok: false,
        confidence: 1 // clamped to 1.0
      });
    });
  });
});