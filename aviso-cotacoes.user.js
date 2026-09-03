// ==UserScript==
// @name         Aviso Cotações
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Consulta planilha em tempo real de forma funcional
// @match        https://www.sistemaalternativa.com.br/*
// @updateURL    https://raw.githubusercontent.com/CapCambio/tampermonkey-scripts/main/aviso-cotacoes.user.js
// @downloadURL  https://raw.githubusercontent.com/CapCambio/tampermonkey-scripts/main/aviso-cotacoes.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ===== CONFIGURAÇÃO DE DEBUG =====
    const DEBUG = true;
    // =================================

    if (DEBUG) console.log("=== Script com Consulta Direta ===");

    const urlPlanilha = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRMSOu1CLk_IYgQzfmDKPU-EjmBvskkb-xNRouHgp09ZJLVpZhk7F70FJKTmY1901gFmTuPlZno9aoQ/pub?gid=0&single=true&output=csv';

    const mapaMoedas = {
        "DOLAR AMERICANO - AZUL": "Dólar Americano",
        "EURO": "Euro",
        "LIBRA ESTERLINA": "Libra Esterlina",
        "DOLAR AUSTRALIANO": "Dólar Australiano",
        "PESO ARGENTINO": "Peso Argentino",
        "DOLAR NOVA ZELANDIA": "Dólar Neozelandês",
        "DOLAR CANADENSE": "Dólar Canadense",
        "FRANCO SUICO": "Franco Suiço",
        "PESO URUGUAIO": "Peso Uruguaio",
        "PESO CHILENO": "Peso Chileno",
        "PESO MEXICANO": "Peso Mexicano",
        "PESO COLOMBIANO": "Peso Colombiano",
        "RENMIMBI IUAN YUAN": "Iuan Chinês",
        "IENE": "Iene Japonês",
        "NOVO SOL": "Novo Sol Peruano",
        "RANDE": "Rand Africano",
        "DIRRÃ - DIRHAM DOS EMIRADOS": "Dirham dos Emirados Árabes"
    };

    let ultimaCotacao = null;
    let ultimaMoeda = null;
    let ultimaOperacao = null;
    let ultimaTaxaLiquida = null;
    let overlayAlerta = null;
    let ultimaDiferencaMostrada = null;
    let alertaFechadoManualmente = false;
    let ultimoFinanceiroTipo = null;
    let papaParseCarregado = false;

    // --------- Overlay Dark ----------
    function criarOverlayAlerta() {
        if (overlayAlerta) return overlayAlerta;

        overlayAlerta = document.createElement('div');
        overlayAlerta.id = 'alerta-cotacao-overlay';

        overlayAlerta.style.cssText =
            `position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(30, 30, 30, 0.95);
            color: #f1f1f1;
            padding: 20px 30px;
            border-radius: 10px;
            z-index: 10000;
            box-shadow: 0 6px 20px rgba(0,0,0,0.5);
            font-family: Arial, sans-serif;
            font-size: 15px;
            max-width: 460px;
            display: none;
            border-left: 6px solid #ff3838;
            line-height: 1.5;
            backdrop-filter: blur(8px);`;

        overlayAlerta.innerHTML =
            `<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div>
                    <strong style="font-size: 17px;">⚠️ Alerta de Cotação</strong><br>
                    <span id="alerta-moeda" style="font-size: 15px;">Moeda: </span><br>
                    <span id="alerta-operacao" style="font-size: 15px;">Operação: </span><br>
                    <span id="alerta-tipo" style="font-size: 15px; opacity: 0.85;"></span>
                </div>
                <button id="fechar-alerta" style="background: none; border: none; color: #f1f1f1; cursor: pointer; font-size: 20px; padding: 0; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">×</button>
            </div>
            <div id="alerta-mensagem"></div>`;

        document.body.appendChild(overlayAlerta);

        overlayAlerta.querySelector('#fechar-alerta').addEventListener('click', () => {
            overlayAlerta.style.display = 'none';
            alertaFechadoManualmente = true;
        });

        return overlayAlerta;
    }

    function mostrarAlertaOverlay(diferencaPercentual, taxaAtual, cotacaoPlanilha) {
        const campoFinanceiro = document.querySelector('select[name="financeiroTipo"]');

        if (!campoFinanceiro || campoFinanceiro.value === "") {
            esconderAlertaOverlay();
            alertaFechadoManualmente = false;
            return;
        }

        if (alertaFechadoManualmente) return;

        if (ultimaDiferencaMostrada === diferencaPercentual && overlayAlerta.style.display === 'block') {
            return;
        }

        ultimaDiferencaMostrada = diferencaPercentual;

        const overlay = criarOverlayAlerta();
        const mensagemDiv = overlay.querySelector('#alerta-mensagem');

        overlay.style.borderLeftColor = '#ff3838';

        overlay.querySelector('#alerta-moeda').textContent =
            `Moeda: ${ultimaMoeda}`;

        overlay.querySelector('#alerta-operacao').textContent =
            `Operação: ${ultimaOperacao}`;

        overlay.querySelector('#alerta-tipo').textContent =
            diferencaPercentual > 0
                ? 'Taxa ACIMA da cotação'
                : 'Taxa ABAIXO da cotação';

        const taxaFormatada =
            parseValor(taxaAtual)?.toLocaleString('pt-BR', {
                minimumFractionDigits: 4,
                maximumFractionDigits: 4
            }) ?? '0,0000';

        const cotacaoFormatada =
            parseValor(cotacaoPlanilha)?.toLocaleString('pt-BR', {
                minimumFractionDigits: 4,
                maximumFractionDigits: 4
            }) ?? '0,0000';

        mensagemDiv.innerHTML =
            `<div style="font-size: 16px; margin-top: 10px;">
                📊 Cotação utilizada: <strong>${taxaFormatada}</strong><br>
                📈 Cotação da loja: <strong>${cotacaoFormatada}</strong>
            </div>`;

        overlay.style.display = 'block';

        if (DEBUG) console.log("🚨 ALERTA MOSTRADO");
    }

    function esconderAlertaOverlay() {
        if (overlayAlerta) {
            overlayAlerta.style.display = 'none';
        }
    }

    // Carregar PapaParse
    const scriptPapa = document.createElement('script');

    scriptPapa.src =
        'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js';

    scriptPapa.onload = () => {
        papaParseCarregado = true;

        if (DEBUG) console.log("✅ PapaParse carregado");
    };

    document.head.appendChild(scriptPapa);

    function detectarMoeda() {
        const selectMoeda = document.querySelector('select[name="moeda"]');

        if (selectMoeda) {
            const opcaoSelecionada =
                selectMoeda.options[selectMoeda.selectedIndex];

            return opcaoSelecionada ? opcaoSelecionada.text : null;
        }

        return null;
    }

    function detectarToggleAtivo() {
        const toggleLabels =
            document.querySelectorAll('div.btn-group label[btn-radio]');

        for (let label of toggleLabels) {
            if (label.classList.contains('active')) {
                const texto = label.textContent.trim();

                if (texto === "Compra" || texto === "Venda") {
                    return texto;
                }
            }
        }

        return null;
    }

    // *** FUNÇÃO SIMPLIFICADA: Busca direto na planilha ***
    async function pegarCotacao(moedaSistema, operacao) {
        if (!moedaSistema || !operacao) {
            if (DEBUG) console.log("❌ Moeda ou operação vazia");
            return null;
        }

        if (!papaParseCarregado) {
            if (DEBUG) console.log("❌ PapaParse não carregado ainda");
            return null;
        }

        try {
            if (DEBUG) console.log(`🔍 Buscando: ${moedaSistema} - ${operacao}`);

            // Adiciona timestamp para evitar cache
            const urlComTimestamp =
                urlPlanilha + '&_=' + new Date().getTime();

            const response = await fetch(urlComTimestamp);
            const texto = await response.text();

            if (DEBUG) console.log("✅ Dados recebidos, processando...");

            const cotacoes =
                Papa.parse(texto, {
                    header: true,
                    skipEmptyLines: true,
                    delimiter: ','
                }).data;

            const moedaPlanilha = mapaMoedas[moedaSistema];

            if (!moedaPlanilha) {
                if (DEBUG) {
                    console.log("❌ Moeda não mapeada:", moedaSistema);
                }

                return null;
            }

            const linha =
                cotacoes.find(l => l['Moeda'] === moedaPlanilha);

            if (!linha) {
                if (DEBUG) {
                    console.log(
                        "❌ Moeda não encontrada:",
                        moedaPlanilha
                    );
                }

                return null;
            }

            const cotacao = linha[operacao];

            if (DEBUG) {
                console.log("✅ Cotação encontrada:", cotacao);
            }

            return cotacao;

        } catch (error) {
            if (DEBUG) {
                console.error("❌ Erro ao buscar:", error);
            }

            return null;
        }
    }

    function parseValor(valor) {
        if (!valor) return null;

        // Se houver múltiplos valores separados por "/",
        // sempre utiliza somente o último valor.
        valor = valor.toString().split('/').pop().trim();

        let limpo =
            valor.replace(/[^\d.,-]/g, '');

        limpo =
            limpo.replace(',', '.');

        const numero =
            parseFloat(limpo);

        return isNaN(numero) ? null : numero;
    }

    function calcularDiferencaPercentual(cotacao, taxaLiquida) {
        const cot = parseValor(cotacao);
        const taxa = parseValor(taxaLiquida);

        if (cot === null || taxa === null) {
            return null;
        }

        const diferenca =
            ((taxa - cot) / cot) * 100;

        return parseFloat(diferenca.toFixed(2));
    }

    async function novaFuncao() {
        if (DEBUG) {
            console.log("=== novaFuncao() INICIADA ===");
        }

        // Verifica se PapaParse está carregado
        if (!papaParseCarregado) {
            if (DEBUG) {
                console.log("⏳ Aguardando PapaParse...");
            }

            setTimeout(novaFuncao, 100);
            return;
        }

        const selectMoeda =
            document.querySelector('select[name="moeda"]');

        if (!selectMoeda || selectMoeda.disabled) {
            if (DEBUG) {
                console.log("📌 Moeda desabilitada");
            }

            esconderAlertaOverlay();
            return;
        }

        const campoFinanceiro =
            document.querySelector('select[name="financeiroTipo"]');

        if (!campoFinanceiro || campoFinanceiro.value === "") {
            if (DEBUG) {
                console.log("📌 Financeiro vazio");
            }

            esconderAlertaOverlay();
            alertaFechadoManualmente = false;
            return;
        }

        const operacaoAtual =
            detectarToggleAtivo();

        if (operacaoAtual && operacaoAtual !== ultimaOperacao) {
            ultimaOperacao = operacaoAtual;

            if (DEBUG) {
                console.log("🔄 Operação:", ultimaOperacao);
            }
        }

        if (!operacaoAtual) {
            if (DEBUG) {
                console.log("⚠️ Espécie ativo");
            }

            esconderAlertaOverlay();
            return;
        }

        if (ultimaMoeda && ultimaOperacao) {
            if (DEBUG) {
                console.log(`🔍 Buscando cotação...`);
            }

            ultimaCotacao =
                await pegarCotacao(
                    ultimaMoeda,
                    ultimaOperacao
                );

            if (DEBUG) {
                console.log(`📊 Resultado: ${ultimaCotacao}`);
            }
        }

        if (ultimaCotacao && ultimaTaxaLiquida) {
            const diferenca =
                calcularDiferencaPercentual(
                    ultimaCotacao,
                    ultimaTaxaLiquida
                );

            if (diferenca !== null) {
                if (DEBUG) {
                    console.log(`📈 Diferença: ${diferenca}%`);
                }

                if (Math.abs(diferenca) > 1) {
                    if (DEBUG) {
                        console.log("🚨 Mostrando alerta!");
                    }

                    mostrarAlertaOverlay(
                        diferenca,
                        ultimaTaxaLiquida,
                        ultimaCotacao
                    );

                } else {
                    if (DEBUG) {
                        console.log("✅ Diferença OK");
                    }

                    esconderAlertaOverlay();
                }
            }
        }

        if (DEBUG) {
            console.log("=== novaFuncao() FINALIZADA ===");
        }
    }

    function configurarToggle() {
        const toggleLabels =
            document.querySelectorAll(
                'div.btn-group label[btn-radio]'
            );

        if (!toggleLabels || toggleLabels.length === 0) {
            return false;
        }

        toggleLabels.forEach(label => {
            label.addEventListener('click', () => {

                const operacaoClicada =
                    label.textContent.trim();

                if (operacaoClicada === "Espécie") {
                    if (DEBUG) {
                        console.log("❌ Espécie ignorado");
                    }

                    return;
                }

                ultimaOperacao = operacaoClicada;
                ultimaMoeda = detectarMoeda();

                if (DEBUG) {
                    console.log(
                        "🎯 Toggle clicado:",
                        ultimaOperacao,
                        ultimaMoeda
                    );
                }

                novaFuncao();
            });
        });

        return true;
    }

    // Observadores
    const observerMain =
        new MutationObserver((mutations, obs) => {

            const selectMoeda =
                document.querySelector('select[name="moeda"]');

            const toggleReady =
                configurarToggle();

            if (selectMoeda && toggleReady) {

                setTimeout(() => {

                    ultimaMoeda =
                        detectarMoeda();

                    ultimaOperacao =
                        detectarToggleAtivo();

                    if (ultimaMoeda && ultimaOperacao) {

                        if (DEBUG) {
                            console.log(
                                "🚀 SPA Carregado:",
                                ultimaMoeda,
                                ultimaOperacao
                            );
                        }

                        novaFuncao();
                    }

                }, 500);

                obs.disconnect();
            }
        });

    observerMain.observe(
        document.body,
        {
            childList: true,
            subtree: true
        }
    );

    const observerTaxa =
        new MutationObserver(() => {

            const campoTaxa =
                document.querySelector(
                    'input[name="taxaLiquida"]'
                );

            if (campoTaxa) {

                if (ultimaTaxaLiquida !== campoTaxa.value) {
                    alertaFechadoManualmente = false;
                }

                ultimaTaxaLiquida =
                    campoTaxa.value;

                if (DEBUG) {
                    console.log(
                        "💵 Taxa:",
                        ultimaTaxaLiquida
                    );
                }
            }
        });

    observerTaxa.observe(
        document.body,
        {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["value"]
        }
    );

    const observerMoeda =
        new MutationObserver(() => {

            const selectMoeda =
                document.querySelector(
                    'select[name="moeda"]'
                );

            if (selectMoeda) {

                const novaMoeda =
                    detectarMoeda();

                if (novaMoeda && novaMoeda !== ultimaMoeda) {

                    ultimaMoeda =
                        novaMoeda;

                    if (DEBUG) {
                        console.log(
                            "💰 Moeda mudou:",
                            ultimaMoeda
                        );
                    }

                    novaFuncao();
                }
            }
        });

    observerMoeda.observe(
        document.body,
        {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["value"]
        }
    );

    const observerSelect =
        new MutationObserver(() => {

            const selectCampo =
                document.querySelector(
                    'select[name="financeiroTipo"]'
                );

            if (selectCampo) {

                const valorAtual =
                    selectCampo.value;

                if (
                    valorAtual &&
                    valorAtual !== "" &&
                    valorAtual !== ultimoFinanceiroTipo
                ) {

                    alertaFechadoManualmente = false;
                    ultimoFinanceiroTipo = valorAtual;

                    if (DEBUG) {
                        console.log(
                            "🔄 Financeiro mudou:",
                            valorAtual
                        );
                    }
                }

                setTimeout(novaFuncao, 100);
            }
        });

    observerSelect.observe(
        document.body,
        {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["value"]
        }
    );

    const observerDropdownSumir =
        new MutationObserver(() => {

            const selectMoeda =
                document.querySelector(
                    'select[name="moeda"]'
                );

            if (!selectMoeda) {

                esconderAlertaOverlay();
                alertaFechadoManualmente = false;
                ultimoFinanceiroTipo = null;
            }
        });

    observerDropdownSumir.observe(
        document.body,
        {
            childList: true,
            subtree: true
        }
    );

})();
