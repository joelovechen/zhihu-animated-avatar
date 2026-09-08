// Development-only adapter for popup interaction tests. Never packaged.
(() => {
  let saved = {};
  const iframe = document.getElementById('targetFixture');
  const ready = new Promise(resolve => iframe.addEventListener('load', resolve, { once: true }));
  const tab = { id: 77, url: 'https://www.zhihu.com/people/local-test', title: '本地模拟主页' };
  window.chrome = {
    tabs: { get: async () => tab, query: async () => [tab], create: async () => {} },
    runtime: { getURL: path => `/${path}` },
    storage: { local: {
      get: async () => saved,
      set: async value => { saved = { ...saved, ...value }; },
      remove: async keys => { keys.forEach(key => delete saved[key]); }
    } },
    scripting: { executeScript: async options => {
      await ready;
      if (options.files) return [];
      const [action, args] = options.args;
      try { return [{ result: { ok: true, state: await iframe.contentWindow.__animatedAvatarV2[action](...args) } }]; }
      catch (error) { return [{ result: { ok: false, error: error.message } }]; }
    } }
  };
})();
