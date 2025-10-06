test('setup: basic arithmetic', () => {
  expect(1 + 2).toBe(3);
});

test('setup: process versions available', () => {
  expect(typeof process.version).toBe('string');
});
