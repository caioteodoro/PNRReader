let airlineCodes = {};
let airportCodes = {};
var formatChoiceValue = "united";

// Carrega os arquivos JSON de companhias aéreas e aeroportos
async function carregarJson(url) {
    const response = await fetch(url);
    return await response.json();
}

async function carregarDados() {
    airlineCodes = await carregarJson('https://raw.githubusercontent.com/caioteodoro/PNRReader/refs/heads/main/airline_codes.json');
    airportCodes = await carregarJson('https://raw.githubusercontent.com/caioteodoro/PNRReader/refs/heads/main/airport_codes.json');
}

// Função para transformar múltiplos códigos PNR em uma tabela formatada
function atualizarTabelaPNR() {
    const pnrInput = document.getElementById('pnrInput').value.toUpperCase();
    const linhasPNR = pnrInput.split('\n'); // Divide o texto em várias linhas

    let theadHTML = '';
    let tabelaHTML = '';

    // Função para adicionar um dia a uma data
    function adicionarDia(data) {
        const novaData = new Date(data);
        novaData.setDate(novaData.getDate() + 1);
        return formatarData(novaData); // Formata a nova data como desejado
    }

    linhasPNR.forEach(pnrCode => {

        // Ignora qualquer coisa antes da primeira letra
        pnrCode = pnrCode.slice(pnrCode.search(/[A-Z]/));

        //LÓGICA CÓDIGO DA COMPANHIA
        const airlineCode = pnrCode.substring(0, 2); // Pega os dois primeiros caracteres após o slice

        //LÓGICA NÚMERO DO VOO
        // Encontra o número do voo: ignora tudo que não seja um número, e começa a contar o número do voo ao encontrar o primeiro dígito
        let flightNumber = '';
        let encontrouDigito = false; // Flag para identificar quando encontrar o primeiro dígito
        let i = 2; // Índice para começar após o código da companhia aérea

        for (; i < pnrCode.length; i++) {
            if (!isNaN(pnrCode[i]) && pnrCode[i] !== ' ') {
                flightNumber += pnrCode[i];
                encontrouDigito = true; // Marca que já encontrou o primeiro número
            } else if (encontrouDigito) {
                // Para ao encontrar o primeiro caractere não numérico após começar a montar o número do voo
                break;
            }
        }

        let restantePNR = pnrCode.slice(i).trim(); // Pega a parte que sobrou após o número do voo
        restantePNR = restantePNR.slice(restantePNR.search(/[0-9]/)); // Remove letras depois do numero do voo (como classe tarifária)

        //LÓGICA PARA DATA
        const dataVoo = extrairData(restantePNR); // Chama a função para extrair a data
        const date = dataVoo ? formatarData(dataVoo) : ''; // Formata a data ou deixa vazio

        // Lógica para extrair origem e destino após a data
        let origem = '';
        let destino = '';
        let iataCodesFound = 0; // Para garantir que encontramos os dois códigos IATA
        let posicaoAtual = restantePNR.search(/[A-Z]{3}/) + 3;

        for (let i = posicaoAtual; i < restantePNR.length; i++) {
            // Verifica se temos uma sequência de 3 letras consecutivas (código IATA)
            if (/[A-Z]{3}/.test(restantePNR.substring(i, i + 3))) {
                if (iataCodesFound === 0) {
                    origem = restantePNR.substring(i, i + 3); // Primeiro código IATA encontrado
                    iataCodesFound++;
                    i += 2; // Pula os 3 caracteres do código IATA
                } else if (iataCodesFound === 1) {
                    destino = restantePNR.substring(i, i + 3); // Segundo código IATA encontrado
                    break; // Já encontramos origem e destino, podemos parar aqui
                }
            }
        }

        // Agora usamos os códigos de origem e destino para buscar no JSON
        origem = formatarAeroporto(origem); // Busca no JSON de aeroportos
        destino = formatarAeroporto(destino); // Busca no JSON de aeroportos

        // Função para extrair horários
        function extrairHorarios(restantePNR, i) {
            let horarios = [];
            let horarioAtual = '';
            let numerosSeguidos = 0;

            while (i < restantePNR.length) {
                const char = restantePNR[i];

                // Verifica se o caractere é um dígito (0-9)
                if (char >= '0' && char <= '9') {
                    horarioAtual += char; // Adiciona o caractere ao horário atual
                    numerosSeguidos++;

                    // Se já temos 4 números seguidos, consideramos como um horário completo
                    if (numerosSeguidos === 4) {
                        horarios.push(horarioAtual); // Armazena o horário
                        horarioAtual = ''; // Reseta para o próximo horário
                        numerosSeguidos = 0; // Reseta o contador
                    }
                } else {
                    // Se encontramos um caractere que não é número, resetamos o contador e o horário atual
                    horarioAtual = '';
                    numerosSeguidos = 0;
                }

                i++; // Move para o próximo caractere
            }

            return horarios; // Retorna todos os horários encontrados
        }

        // Extraindo horários do restantePNR
        const horarios = extrairHorarios(restantePNR, i); // Chama a função para extrair os horários
        let horarioSaida = horarios[0] || ''; // Pega o primeiro horário
        let horarioChegada = horarios[1] || ''; // Pega o segundo horário

        // Formata os horários como desejado
        if (horarioSaida) {
            horarioSaida = new Date(`2024-01-01T${horarioSaida.slice(0, 2)}:${horarioSaida.slice(2)}:00`);
        }
        if (horarioChegada) {
            horarioChegada = new Date(`2024-01-01T${horarioChegada.slice(0, 2)}:${horarioChegada.slice(2)}:00`);
        }

        // Define a data base para a data de voo
        const dataBase = extrairData(restantePNR); // Chama a função para extrair a data base

        const dataPartidaSemFormatacao = dataBase ? formatarData(dataBase) : '';
        const dataChegadaSemFormatacao = dataBase ? formatarData(dataBase) : '';

        // Verifica se o horário de chegada é menor que o de partida
        if (horarioChegada < horarioSaida) {
            dataChegadaSemFormatacao.setDate(dataChegadaSemFormatacao.getDate() + 1); // Adiciona um dia à data de chegada
        }

        const dataPartida = dataBase ? formatarDataParaTabela(dataPartidaSemFormatacao) : ''; // Formata a data base ou deixa vazio
        const dataChegada = dataBase ? formatarDataParaTabela(dataChegadaSemFormatacao) : ''; // Usa a mesma data base para chegada



        // Agora, usamos os horários para adicionar à data de partida e chegada
        const horarioPartidaFormatado = horarioSaida ? formatarHora(horarioSaida) : ''; // Formata a hora de partida
        const horarioChegadaFormatado = horarioChegada ? formatarHora(horarioChegada) : ''; // Formata a hora de chegada



        const airlineName = airlineCodes[airlineCode] || airlineCode; // Converte código da companhia para o nome

        if (airlineName && flightNumber && origem && destino && dataPartida && horarioPartidaFormatado && dataChegada && horarioChegadaFormatado) {
            // Adiciona uma nova linha na tabela apenas se todos os campos estiverem preenchidos
            if (formatChoiceValue === "divided") {

                theadHTML = `
                <tr>
                    <th>Voo</th>
                    <th>Origem</th>
                    <th>Destino</th>
                    <th>Saída</th>
                    <th>Chegada</th>
                </tr>
                `;

                tabelaHTML += `
                <tr>
                    <td>${airlineName} ${flightNumber}</td>
                    <td>${origem}</td>
                    <td>${destino}</td>
                    <td>${dataPartida} ${horarioPartidaFormatado}</td>
                    <td>${dataChegada} ${horarioChegadaFormatado}</td>
                </tr>
            `;
            } else {
                theadHTML = `
                <tr>
                    <th>Voo</th>
                    <th>Origem - Destino</th>
                    <th>Saída</th>
                    <th>Chegada</th>
                </tr>
                `;

                tabelaHTML += `
                <tr>
                    <td>${airlineName} ${flightNumber}</td>
                    <td>${origem} - ${destino}</td>
                    <td>${dataPartida} ${horarioPartidaFormatado}</td>
                    <td>${dataChegada} ${horarioChegadaFormatado}</td>
                </tr>
            `;
            }
        }
    });

    // Atualiza a tabela com o HTML gerado
    document.getElementById("pnrTableHead").innerHTML = theadHTML;
    document.getElementById('pnrTableBody').innerHTML = tabelaHTML;
}

// Adiciona um event listener para atualizar a tabela sempre que o texto na textarea mudar
document.getElementById('pnrInput').addEventListener('input', atualizarTabelaPNR);

// Função para encontrar a data no formato 'DDMMM'
function extrairData(restantePNR) {
    let dia = '';
    let mes = '';
    let encontrouDia = false;

    // Percorre o restante do PNR para identificar o dia e o mês
    for (let i = 0; i < restantePNR.length - 2; i++) {
        // Verifica se encontrou dois dígitos consecutivos
        if (!isNaN(restantePNR[i]) && !isNaN(restantePNR[i + 1])) {
            dia = restantePNR.substring(i, i + 2); // Pega o dia
            mes = restantePNR.substring(i + 2, i + 5); // Pega as 3 letras do mês
            encontrouDia = true;
            break; // Sai do loop ao encontrar o dia e o mês
        }
    }

    if (encontrouDia) {
        return `${dia}${mes}`; // Retorna a data no formato DDMMM
    } else {
        return null; // Retorna null se não encontrar a data
    }
}

// Função para formatar a data
function formatarData(dataStr) {
    const dia = parseInt(dataStr.substring(0, 2), 10);
    const mesAbreviado = dataStr.substring(2).toLowerCase();
    const meses = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

    const anoAtual = new Date().getFullYear(); // Ano atual
    const mesAtual = new Date().getMonth(); // Mês atual (0-indexado)
    const diaAtual = new Date().getDate(); // Dia do mês atual

    // Cria a data com o ano atual
    let data = new Date(anoAtual, meses[mesAbreviado], dia);

    // Se a data já passou este ano, adiciona um ano
    if (data.getMonth() < mesAtual || (data.getMonth() === mesAtual && data.getDate() < diaAtual)) {
        data.setFullYear(anoAtual + 1); // Ajusta o ano para o próximo
    }

    return data;
}


function formatarDataParaTabela(data) {
    const diasDaSemana = ['Dom.', 'Seg.', 'Ter.', 'Qua.', 'Qui.', 'Sex.', 'Sáb.'];
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

    const diaSemana = diasDaSemana[data.getDay()]; // Obtém o dia da semana
    const dia = String(data.getDate()).padStart(2, '0'); // Obtém o dia do mês, formatando com zero à esquerda
    const mes = meses[data.getMonth()]; // Obtém o mês

    return `${diaSemana} ${dia}/${mes}`; // Retorna a string formatada
}

function formatarHora(data) {
    const horas = String(data.getHours()).padStart(2, '0');
    const minutos = String(data.getMinutes()).padStart(2, '0');
    return `${horas}:${minutos}`;
}

// Função para formatar o horário (de 0800 para 08h00)
function formatarHorario(horarioStr) {
    return `${horarioStr.substring(0, 2)}h${horarioStr.substring(2)}`;
}

// Função para converter o código IATA em nomes de aeroportos
function formatarAeroporto(iataCode) {
    return airportCodes[iataCode] || iataCode;
}

// Inicia a página carregando os dados JSON e ativando o evento de input
window.onload = async function () {
    await carregarDados(); // Carrega os JSON de companhias e aeroportos

    // Atualiza a tabela ao digitar no campo
    document.getElementById('pnrInput').addEventListener('input', function () {
        atualizarTabelaPNR(this.value.trim());
    });
}

function dividirOuUnirTabela() {
    if (formatChoiceValue === "divided") {
        formatChoiceValue = "united";
        document.cookie = "formatChoice=united; path=/; max-age=31536000";
        atualizarTabelaPNR();
    } else {
        formatChoiceValue = "divided";
        document.cookie = "formatChoice=divided; path=/; max-age=31536000";
        atualizarTabelaPNR();
    }
    updateDivideOrUniteButtonText();
}

function updateDivideOrUniteButtonText() {
    console.log(formatChoiceValue);
    const button = document.getElementById("divideButton");

    if (formatChoiceValue === "divided") {
        button.textContent = "Unir Origem - Destino";
    } else {
        button.textContent = "Dividir Origem - Destino";
    };
}

function copiarTabela() {
    var tabela = document.getElementById("pnrTable");
    var range = document.createRange();
    range.selectNode(tabela);
    window.getSelection().removeAllRanges(); // Limpa qualquer seleção anterior
    window.getSelection().addRange(range);   // Seleciona a tabela

    try {
        // Copia o conteúdo selecionado
        document.execCommand("copy");
    } catch (err) {
        alert("Não foi possível copiar a tabela.");
    }

    window.getSelection().removeAllRanges(); // Limpa a seleção
}

function getCookie(name) {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        let c = cookies[i].trim();
        if (c.indexOf(name + '=') === 0) {
            return c.substring((name + '=').length, c.length);
        }
    }
    return null;
}

const formatChoice = getCookie('formatChoice');
if (formatChoice) {
    formatChoiceValue = formatChoice
} else {
    formatChoiceValue = "united"
    console.log('Cookie formatChoice não encontrado.');
}

updateDivideOrUniteButtonText();
