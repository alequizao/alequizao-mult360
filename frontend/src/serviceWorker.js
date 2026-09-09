// ALEQUIZAO: service worker do PWA com atualização imediata.
// Quando um build novo é publicado, o SW novo assume na hora (SKIP_WAITING) e a página recarrega uma vez —
// sem isso o app instalado no celular continuava rodando o build antigo até fechar todas as abas.
export function register() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;
      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          const ativarNovo = () => {
            if (registration.waiting) {
              registration.waiting.postMessage({ type: "SKIP_WAITING" });
            }
          };
          ativarNovo();
          registration.onupdatefound = () => {
            const novo = registration.installing;
            if (!novo) return;
            novo.onstatechange = () => {
              if (novo.state === "installed" && navigator.serviceWorker.controller) {
                ativarNovo();
              }
            };
          };
          // procura versão nova a cada 60 s e sempre que o app volta ao primeiro plano
          setInterval(() => registration.update().catch(() => {}), 60 * 1000);
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") registration.update().catch(() => {});
          });
        })
        .catch((error) => {
          console.error("Erro ao registrar o service worker:", error);
        });

      // só recarrega quando um SW novo SUBSTITUI um antigo (atualização); na primeira instalação não
      const tinhaController = !!navigator.serviceWorker.controller;
      let recarregou = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!tinhaController || recarregou) return;
        recarregou = true;
        window.location.reload();
      });
    });
  }
}

export function unregister() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister();
    });
  }
}
