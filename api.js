/* Leitura compatível com os redirecionamentos do Apps Script, inclusive no Safari. */
window.CO2Api = {
  read(params = {}, timeout = 15000) {
    return new Promise((resolve, reject) => {
      const callback = 'co2_' + crypto.randomUUID().replace(/-/g, '');
      const script = document.createElement('script');
      const url = new URL(window.CO2_STAND_CONFIG.apiUrl);
      Object.entries({...params, callback}).forEach(([key, value]) => url.searchParams.set(key, value));
      let timer;
      const clean = () => {
        clearTimeout(timer);
        script.remove();
        // Respostas atrasadas não devem provocar erros nem mudar a tela.
        window[callback] = () => {};
        setTimeout(() => delete window[callback], 60000);
      };
      window[callback] = data => { clean(); data.ok === false ? reject(new Error(data.error || 'Falha na consulta.')) : resolve(data); };
      script.onerror = () => { clean(); reject(new Error('Não foi possível conectar à planilha.')); };
      timer = setTimeout(() => { clean(); reject(new Error('A planilha não respondeu a tempo.')); }, timeout);
      script.src = url.href;
      document.head.appendChild(script);
    });
  },
  format(value) {
    return typeof value === 'number' && Number.isFinite(value)
      ? value.toLocaleString('pt-BR', {minimumFractionDigits: 3, maximumFractionDigits: 3})
      : 'Pendente';
  }
};
