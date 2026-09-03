```javascript
// ==UserScript==
// @name         Aviso Documento Não Anexado
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Modal centralizado moderno com aviso, texto em linha única, botões estilizados e layout atualizado
// @match        https://www.sistemaalternativa.com.br/*
// @updateURL    https://raw.githubusercontent.com/CapCambio/tampermonkey-scripts/main/aviso-documento-nao-anexado.user.js
// @downloadURL  https://raw.githubusercontent.com/CapCambio/tampermonkey-scripts/main/aviso-documento-nao-anexado.user.js
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  let interceptado = false;

  function isElementoVisivel(elem) {
    if (!elem) return false;
    if (elem.classList.contains('ng-hide')) return false;
    const style = window.getComputedStyle(elem);
    return style && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }

  function mostrarAvisoCentralizado(mensagem) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.6)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = 9999;
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease';

    function fecharModal() {
      overlay.style.opacity = '0';
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 300);
    }

    const caixa = document.createElement('div');
    caixa.style.backgroundColor = 'white';
    caixa.style.padding = '3.5rem 3rem';
    caixa.style.borderRadius = '10px';
    caixa.style.boxShadow = '0 6px 25px rgba(0,0,0,0.3)';
    caixa.style.textAlign = 'center';
    caixa.style.fontSize = '2.2rem';
    caixa.style.fontWeight = '700';
    caixa.style.color = '#b22222';
    caixa.style.fontFamily = `'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`;
    caixa.style.letterSpacing = '0.04em';
    caixa.style.lineHeight = '1.6';
    caixa.style.transform = 'scale(0.9)';
    caixa.style.transition = 'transform 0.3s ease';
    caixa.style.whiteSpace = 'nowrap';
    caixa.style.overflow = 'visible';
    caixa.style.width = 'auto';
    caixa.style.maxWidth = '90vw';

    setTimeout(() => {
      overlay.style.opacity = '1';
      caixa.style.transform = 'scale(1)';
    }, 10);

    caixa.textContent = mensagem;

    const botoesContainer = document.createElement('div');
    botoesContainer.style.marginTop = '3rem';
    botoesContainer.style.display = 'flex';
    botoesContainer.style.flexDirection = 'row';
    botoesContainer.style.gap = '2rem';
    botoesContainer.style.justifyContent = 'center';
    botoesContainer.style.flexWrap = 'wrap';

    function estilizarBotao(botao, bgColor, hoverBgColor) {
      botao.style.padding = '1.2rem 2.4rem';
      botao.style.fontSize = '1.5rem';
      botao.style.cursor = 'pointer';
      botao.style.border = 'none';
      botao.style.borderRadius = '6px';
      botao.style.backgroundColor = bgColor;
      botao.style.color = 'white';
      botao.style.fontWeight = '700';
      botao.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
      botao.style.transition = 'background-color 0.25s ease, box-shadow 0.25s ease';
      botao.style.display = 'flex';
      botao.style.alignItems = 'center';
      botao.style.gap = '0.8rem';
      botao.style.userSelect = 'none';

      botao.addEventListener('mouseenter', () => {
        botao.style.backgroundColor = hoverBgColor;
        botao.style.boxShadow = '0 6px 15px rgba(0,0,0,0.3)';
      });

      botao.addEventListener('mouseleave', () => {
        botao.style.backgroundColor = bgColor;
        botao.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
      });
    }

    const botaoAnexar = document.createElement('button');
    botaoAnexar.textContent = '📄 Anexar Documento';
    estilizarBotao(botaoAnexar, '#407c6c', '#356755');

    botaoAnexar.onclick = () => {
      fecharModal();

      const botao = document.querySelector('[ng-click="modalAdicionar()"]');

      if (botao) {
        const scope = angular.element(botao).scope();

        if (scope && typeof scope.modalAdicionar === 'function') {
          scope.modalAdicionar();

          if (!scope.$$phase) scope.$apply();
        } else {
          alert('Não foi possível acessar a função modalAdicionar().');
        }
      } else {
        alert('Botão de anexo de documento não encontrado na página.');
      }
    };

    const botaoFechar = document.createElement('button');
    botaoFechar.textContent = '⚠️ Continuar sem documento';
    estilizarBotao(botaoFechar, '#b22222', '#8b1a1a');

    botaoFechar.onclick = () => fecharModal();

    botoesContainer.appendChild(botaoAnexar);
    botoesContainer.appendChild(botaoFechar);

    caixa.appendChild(botoesContainer);
    overlay.appendChild(caixa);
    document.body.appendChild(overlay);
  }

  function interceptarEfetivar() {
    if (interceptado) return;
    if (typeof angular === 'undefined' || !angular.element) return;
    if (!window.location.href.includes('/opr/movimento-turismo')) return;

    const botao = document.querySelector('button[ng-click="efetivar()"]');

    if (!botao) return;

    const scope = angular.element(botao).scope();

    if (!scope || scope._efetivarInterceptado || typeof scope.efetivar !== 'function') return;

    scope._efetivarInterceptado = true;
    interceptado = true;

    const originalEfetivar = scope.efetivar;

    scope.efetivar = function () {
      const botaoVisualizar = document.querySelector(
        'label.btn.btn-default.ng-binding[ng-click="modalVisualizar()"]'
      );

      let temDocumento = false;

      if (botaoVisualizar && isElementoVisivel(botaoVisualizar)) {
        const texto = botaoVisualizar.textContent.trim();
        const numDocs = parseInt(texto, 10);

        temDocumento = !isNaN(numDocs) && numDocs > 0;
      }

      if (!temDocumento) {
        mostrarAvisoCentralizado(
          '⚠️🚨 ATENÇÃO: NÃO HÁ NENHUM DOCUMENTO ANEXADO 🚨⚠️'
        );

        console.warn('Aviso: efetivação sem documento.');
      }

      return originalEfetivar.apply(this, arguments);
    };

    if (!scope.$$phase) scope.$apply();
  }

  const interval = setInterval(() => {
    if (interceptado) {
      clearInterval(interval);
      return;
    }

    interceptarEfetivar();
  }, 1000);

  (function () {
    const origPush = history.pushState;
    const origReplace = history.replaceState;

    function handleUrlChange() {
      interceptado = false;
      interceptarEfetivar();
    }

    history.pushState = function () {
      origPush.apply(history, arguments);
      handleUrlChange();
    };

    history.replaceState = function () {
      origReplace.apply(history, arguments);
      handleUrlChange();
    };

    window.addEventListener('popstate', handleUrlChange);
  })();

  const observer = new MutationObserver(() => {
    if (!interceptado) interceptarEfetivar();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
```
