```javascript
// ==UserScript==
// @name         Aviso Validação CPF/CNPJ
// @namespace    http://tampermonkey.net/
// @version      6.1
// @description  Intercepta clique no Confirmar, exibe aviso se CPF/CNPJ não validado, com modal invisível
// @match        https://www.sistemaalternativa.com.br/*
// @updateURL    https://raw.githubusercontent.com/CapCambio/tampermonkey-scripts/main/aviso-validacao-cpf-cnpj.user.js
// @downloadURL  https://raw.githubusercontent.com/CapCambio/tampermonkey-scripts/main/aviso-validacao-cpf-cnpj.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Utilitário para esperar elemento aparecer
    function waitForElement(selector, root = document, timeoutMs = 3000) {
        return new Promise((resolve) => {
            const found = root.querySelector(selector);
            if (found) return resolve(found);

            const obs = new MutationObserver(() => {
                const el = root.querySelector(selector);
                if (el) {
                    obs.disconnect();
                    resolve(el);
                }
            });
            obs.observe(root, { childList: true, subtree: true });

            setTimeout(() => {
                obs.disconnect();
                resolve(null);
            }, timeoutMs);
        });
    }

    // Exibe aviso centralizado
    function mostrarAvisoCentralizado(mensagem, botoes = []) {
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
        caixa.style.transform = 'scale(0.9)';
        caixa.style.transition = 'transform 0.3s ease';
        caixa.style.whiteSpace = 'nowrap';
        caixa.style.maxWidth = '90vw';

        setTimeout(() => {
            overlay.style.opacity = '1';
            caixa.style.transform = 'scale(1)';
        }, 10);

        caixa.textContent = mensagem;

        const botoesContainer = document.createElement('div');
        botoesContainer.style.marginTop = '3rem';
        botoesContainer.style.display = 'flex';
        botoesContainer.style.gap = '2rem';
        botoesContainer.style.justifyContent = 'center';
        botoesContainer.style.flexWrap = 'wrap';

        botoes.forEach(({ texto, cor, corHover, acao }) => {
            const botao = document.createElement('button');
            botao.textContent = texto;
            botao.style.padding = '1.2rem 2.4rem';
            botao.style.fontSize = '1.5rem';
            botao.style.cursor = 'pointer';
            botao.style.border = 'none';
            botao.style.borderRadius = '6px';
            botao.style.backgroundColor = cor;
            botao.style.color = 'white';
            botao.style.fontWeight = '700';
            botao.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
            botao.style.transition = 'background-color 0.25s ease, box-shadow 0.25s ease';
            botao.style.display = 'flex';
            botao.style.alignItems = 'center';
            botao.style.gap = '0.8rem';
            botao.style.userSelect = 'none';

            botao.addEventListener('mouseenter', () => {
                botao.style.backgroundColor = corHover;
                botao.style.boxShadow = '0 6px 15px rgba(0,0,0,0.3)';
            });
            botao.addEventListener('mouseleave', () => {
                botao.style.backgroundColor = cor;
                botao.style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)';
            });

            botao.onclick = () => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 300);
                if (typeof acao === 'function') acao();
            };
            botoesContainer.appendChild(botao);
        });

        caixa.appendChild(botoesContainer);
        overlay.appendChild(caixa);
        document.body.appendChild(overlay);
    }

    // Abrir modal invisível e verificar textarea
    async function abrirModalInvisivelELer() {
        const btnAbrir = document.querySelector('button[ng-click="consultarSituacaoCadastral()"]');
        if (!btnAbrir) return null;

        btnAbrir.click();
        const modal = await waitForElement('div[modal-render="true"].modal, div[modal-render="true"]', document.body, 4000);
        if (!modal) return null;

        const prev = {
            opacity: modal.style.opacity,
            visibility: modal.style.visibility,
            pointerEvents: modal.style.pointerEvents,
            transform: modal.style.transform,
        };
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        modal.style.pointerEvents = 'none';
        modal.style.transform = 'scale(0.98)';

        const textarea = await waitForElement('#primeiraConsulta, #ultimaConsulta', modal, 4000);
        let validado = false;
        if (textarea) validado = !!textarea.disabled;

        const btnFechar = modal.querySelector('button[ng-click="fechar()"]');
        if (btnFechar) btnFechar.click();

        requestAnimationFrame(() => {
            modal.style.opacity = prev.opacity ?? '';
            modal.style.visibility = prev.visibility ?? '';
            modal.style.pointerEvents = prev.pointerEvents ?? '';
            modal.style.transform = prev.transform ?? '';
        });

        return { validado, textareaEncontrado: !!textarea };
    }

    let emProgresso = false;

    document.addEventListener('click', async (ev) => {
        const btn = ev.target.closest('button[ng-click="form.salvar()"]');
        if (!btn) return;

        if (emProgresso) return;
        emProgresso = true;
        ev.preventDefault();
        ev.stopImmediatePropagation();

        const scope = angular.element(btn).scope();
        const tipoPessoa = scope?.form?.tipoPessoa ?? '';

        // ✅ regra: estrangeiro não exige validação
        if (tipoPessoa === 'E') {
            scope.form.salvar();
            emProgresso = false;
            return;
        }

        const resultado = await abrirModalInvisivelELer();
        let validado = false;
        if (resultado) validado = resultado.validado;

        if (validado) {
            scope.form.salvar();
        } else {
            let mensagem = '';
            let botaoTexto = '';

            if (tipoPessoa === 'F') {
                mensagem = '⚠️ ATENÇÃO: CPF não está validado na Receita Federal ⚠️';
                botaoTexto = '🔎 Validar CPF';
            } else if (tipoPessoa === 'J') {
                mensagem = '⚠️ ATENÇÃO: CNPJ não está validado na Receita Federal ⚠️';
                botaoTexto = '🔎 Validar CNPJ';
            } else {
                mensagem = '⚠️ ATENÇÃO: CPF/CNPJ não está validado ⚠️';
                botaoTexto = '🔎 Validar CPF/CNPJ';
            }

            mostrarAvisoCentralizado(
                mensagem,
                [
                    {
                        texto: botaoTexto,
                        cor: '#407c6c',
                        corHover: '#356755',
                        acao: () => {
                            // ✅ corrigido: abrir o modal real
                            const btnModal = document.querySelector('button[ng-click="consultarSituacaoCadastral()"]');
                            if (btnModal) btnModal.click();
                        }
                    },
                    {
                        texto: '⚠️ Continuar sem validar',
                        cor: '#b22222',
                        corHover: '#8b1a1a',
                        acao: () => {
                            scope.form.salvar();
                        }
                    }
                ]
            );
        }

        emProgresso = false;
    }, true);
})();
```
