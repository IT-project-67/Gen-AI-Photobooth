test('app: runs in jsdom environment', () => {
  expect(typeof window).toBe('object');
  expect(typeof document).toBe('object');
  const div = document.createElement('div');
  document.body.appendChild(div);
  expect(document.body.contains(div)).toBe(true);
});

test('app: identity-obj-proxy for CSS modules works', async () => {
  const styles = await import('~~/app/assets/css/main.css');
  expect(styles).toBeTruthy();
});
