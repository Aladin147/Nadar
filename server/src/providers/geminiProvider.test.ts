import { buildSystemPrompt } from './geminiProvider';

describe('buildSystemPrompt', () => {
  it('includes structure for scene mode and brevity', () => {
    const p = buildSystemPrompt('scene', { verbosity: 'brief' });
    expect(p).toContain('IMMEDIATE:');
    expect(p).toContain('OBJECTS:');
    expect(p).toContain('NAVIGATION:');
  });

  it('adds detail note when verbosity is detailed', () => {
    const p = buildSystemPrompt('ocr', { verbosity: 'detailed' });
    expect(p.toLowerCase()).toContain('provide more detail');
  });

  it('qa prompt encourages uncertainty when unsure', () => {
    const p = buildSystemPrompt('qa');
    expect(p.toLowerCase()).toContain('uncertain');
  });
});

