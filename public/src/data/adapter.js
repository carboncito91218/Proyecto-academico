// La demostración se abre explícitamente en demo.php.
const adapter = await import(document.body.dataset.mode === 'demo' ? './mock-adapter.js' : './http-adapter.js');
export const read = adapter.read;
export const execute = adapter.execute;
