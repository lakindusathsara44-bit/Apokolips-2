/* Apokolips homepage visitor counter.
   Count once per browser session; initialize the public counter at 128. */
(() => {
  const output = document.getElementById('visitor-count');
  if (!output) return;

  const key = 'apokolips_xyz_homepage_visitors_2026';
  const base = 'https://countapi.mileshilliard.com/api/v1';
  const sessionKey = 'apokolips_home_visit_counted';

  async function callApi(action) {
    const response = await fetch(base + '/' + action + '/' + key, {cache: 'no-store'});
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Visitor counter request failed');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function updateCounter() {
    let alreadyCounted = false;
    try { alreadyCounted = sessionStorage.getItem(sessionKey) === '1'; } catch (_) {}

    try {
      if (!alreadyCounted) {
        try {
          await callApi('get');
        } catch (error) {
          if (error.status !== 404) throw error;
          await fetch(base + '/set/' + key + '?value=128', {cache: 'no-store'}).then(async response => {
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Could not initialize visitor counter');
          });
        }
        const result = await callApi('hit');
        try { sessionStorage.setItem(sessionKey, '1'); } catch (_) {}
        output.textContent = Number(result.value).toLocaleString();
      } else {
        const result = await callApi('get');
        output.textContent = Number(result.value).toLocaleString();
      }
    } catch (error) {
      console.error('Apokolips visitor counter:', error);
      output.textContent = '—';
      output.title = 'Visitor count is temporarily unavailable';
    }
  }

  updateCounter();
})();
