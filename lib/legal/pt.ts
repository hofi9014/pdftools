import type { LegalTexts } from './types';

const pt: LegalTexts = {
  privacy: {
    title: 'Política de privacidade',
    updated: 'Última atualização: 14 de outubro de 2026',
    sections: [
      {
        h: '1. O essencial',
        p: 'As ferramentas do OptimaPDF funcionam no seu navegador: os ficheiros com que trabalha não são enviados para o nosso servidor nem para outro lado. Ao servidor só chega o que duas funções precisam — texto nas funções de IA e o endereço de uma página em URL para PDF. As estatísticas de visitas (Google Analytics) só são recolhidas com o seu consentimento. Não existem contas de utilizador.',
      },
      {
        h: '2. Responsável pelo tratamento',
        p: 'O responsável pelos dados pessoais é Leszek Hofman, Dąbrówka Nowa, Polónia. Contacto: kontakt@optimapdf.com. Não foi designado um Encarregado da Proteção de Dados — escreva para o endereço acima sobre qualquer assunto relativo aos seus dados.',
      },
      {
        h: '3. Que dados tratamos',
        sub: [
          {
            h: '3.1 Os seus ficheiros',
            p: 'Todas as ferramentas de ficheiros — incluindo juntar, dividir, comprimir, OCR, editar, assinar, rasurar, proteger com palavra-passe e todas as conversões (PDF ↔ Word, Excel, PowerPoint, OpenOffice, imagens, HTML, EPUB, TXT, SVG) — funcionam inteiramente no seu navegador (JavaScript e WebAssembly). O ficheiro não é enviado para o nosso servidor. Do servidor só são descarregados os ficheiros da aplicação, os tipos de letra e os dados linguísticos do OCR.',
          },
          {
            h: '3.2 Funções de IA (Chat IA, Resumo IA, Tradutor IA)',
            p: 'Quando usa uma função de IA, o texto extraído do ficheiro (e, no chat, a sua pergunta) é enviado através do nosso servidor para a OpenRouter, Inc. (EUA), que o passa ao fornecedor do modelo de linguagem (atualmente OpenAI GPT-4o mini, servido pela OpenAI ou pela Microsoft Azure). A ferramenta avisa-o antes de qualquer envio.',
            items: [
              'Cada pedido exige um fornecedor que, segundo a OpenRouter, não guarde os dados para além do pedido nem treine modelos com eles. Se nenhum estiver disponível, o pedido falha — não é enviado a outro.',
              'O pedido é enviado pelo nosso servidor com a chave API comum do site: a OpenRouter não recebe o seu endereço IP nem dados do navegador, e não precisa de chave própria.',
              'Não guardamos o texto enviado nem a resposta.',
              'O limite é de 15 pedidos por dia por endereço IP. O contador (o seu endereço IP e o número de pedidos) é guardado numa base de dados Upstash durante 24 horas a partir do primeiro pedido e depois apagado automaticamente.',
            ],
          },
          {
            h: '3.3 URL para PDF',
            p: 'O endereço de página que introduz chega ao nosso servidor, que descarrega essa página e cria um PDF. Não guardamos o endereço, a página nem o PDF. O limite é de 30 conversões a cada 10 minutos por endereço IP — o contador é guardado numa base de dados Upstash durante 10 minutos.',
          },
          {
            h: '3.4 Dados técnicos',
            p: 'O nosso fornecedor de alojamento (Vercel Inc.) trata dados técnicos ao responder aos pedidos — endereço IP, endereço da página, hora e tipo de navegador — para fazer funcionar e proteger o site. O nosso servidor só regista pedidos à API rejeitados (por exemplo, um limite excedido ou um pedido de outro site), com o endereço IP encurtado às três primeiras partes (p. ex. 203.0.113.0).',
          },
          {
            h: '3.5 Guardado no seu navegador',
            p: 'Algumas definições são guardadas no seu dispositivo. Não são enviadas para nós nem para terceiros:',
            items: [
              'localStorage: tema (claro/escuro), idioma escolhido, a sua decisão sobre a análise, definições das ferramentas e a lista de ferramentas usadas recentemente.',
              'O cookie «x-detected-locale» (até 12 meses) com o idioma escolhido, para o site abrir no seu idioma. É necessário para as versões linguísticas funcionarem e não requer consentimento.',
              'A cache da aplicação (service worker): ficheiros do site e dados linguísticos do OCR descarregados, para as ferramentas funcionarem mais depressa e sem ligação.',
              'Depois de ligar o Google Drive: um token de acesso no sessionStorage, removido ao fechar o separador ou quando expira.',
            ],
          },
          {
            h: '3.6 Google Drive, Dropbox e OneDrive',
            p: 'Se escolher abrir um ficheiro da nuvem ou guardá-lo nela, o ficheiro passa diretamente entre o seu navegador e o fornecedor escolhido (Google, Dropbox, Microsoft) — não pelo nosso servidor. Inicia sessão na janela desse fornecedor, cujos termos e política de privacidade se aplicam a essa operação. O Google Drive só nos dá acesso aos ficheiros abertos ou criados com o OptimaPDF; o Dropbox, à gravação de ficheiros; o OneDrive e o SharePoint, aos ficheiros que a janela da Microsoft pedir.',
          },
        ],
      },
      {
        h: '4. Fundamento jurídico',
        items: [
          'Art. 6.º, n.º 1, alínea b), do RGPD — prestação do serviço que pede: funções de IA e URL para PDF.',
          'Art. 6.º, n.º 1, alínea f), do RGPD — interesse legítimo do responsável: funcionamento e segurança do site, limites de pedidos, prevenção de abusos, registos técnicos.',
          'Art. 6.º, n.º 1, alínea a), do RGPD — o seu consentimento para as estatísticas de visitas do Google Analytics. Pode retirá-lo a qualquer momento (secção 10).',
        ],
      },
      {
        h: '5. Destinatários',
        p: 'Os dados são tratados por nossa conta por, ou recebidos por:',
        items: [
          'Vercel Inc. (EUA) — alojamento do site e do servidor da aplicação.',
          'Upstash, Inc. (EUA) — base de dados dos contadores de limites (endereço IP e número de pedidos). A base de dados fica na região de Washington, D.C. (EUA, região iad1).',
          'OpenRouter, Inc. (EUA) e o fornecedor do modelo a quem a OpenRouter passar o pedido — só quando usa as funções de IA.',
          'Google LLC (EUA) — Google Analytics, só com o seu consentimento.',
          'Autoridades públicas — só quando a lei o exigir.',
        ],
      },
      {
        h: '6. Transferências para fora do EEE',
        p: 'O servidor da aplicação funciona num centro de dados da Vercel nos EUA, e todos os destinatários da secção 5 têm sede nos EUA. Os dados descritos nas secções 3.2–3.4 e os do Google Analytics são, por isso, transferidos para os EUA. A Vercel Inc. e a Google LLC estão certificadas no âmbito do Quadro de Privacidade de Dados UE-EUA (Decisão de Execução (UE) 2023/1795 da Comissão); a Vercel aplica também as cláusulas contratuais-tipo. No caso da Upstash e da OpenRouter, a transferência faz-se nos termos das suas condições de tratamento de dados. Os seus ficheiros não são transferidos para lado nenhum (secção 3.1).',
      },
      {
        h: '7. Durante quanto tempo guardamos os dados',
        items: [
          'Os seus ficheiros: nunca nos chegam. No navegador desaparecem ao fechar ou recarregar a página.',
          'Texto enviado à IA e endereços de páginas a converter: não os guardamos.',
          'Contador do limite de IA (endereço IP): 24 horas a partir do primeiro pedido. Contador de URL para PDF: 10 minutos.',
          'Registos do servidor no fornecedor de alojamento: 1 hora no plano atual da Vercel.',
          'Dados do Google Analytics: segundo a definição de retenção do Google Analytics, no máximo 14 meses.',
          'Definições no seu navegador: até as apagar; o cookie de idioma até 12 meses.',
        ],
      },
      {
        h: '8. Os seus direitos',
        p: 'Tem direito de acesso (art. 15.º do RGPD), retificação (art. 16.º), apagamento (art. 17.º), limitação do tratamento (art. 18.º), portabilidade (art. 20.º), oposição (art. 21.º) e a retirar o consentimento a qualquer momento, sem afetar a licitude do tratamento anterior. Pode também apresentar reclamação a uma autoridade de controlo — na Polónia, o Presidente do Gabinete de Proteção de Dados Pessoais (ul. Stawki 2, 00-193 Varsóvia). Não existem contas, pelo que os dados técnicos normalmente não podem ser associados a uma pessoa concreta (art. 11.º do RGPD) — escreva-nos e veremos o que podemos fazer.',
      },
      {
        h: '9. Segurança',
        items: [
          'Ligação HTTPS cifrada com HSTS.',
          'Uma Content Security Policy e cabeçalhos que impedem a incorporação do site noutros sites e bloqueiam o acesso à câmara, ao microfone e à localização.',
          'Verificação da origem dos pedidos à API (proteção CSRF), limites de pedidos e um limite de tamanho dos pedidos (100 MB).',
          'O URL para PDF não descarrega endereços de redes internas nem dos serviços na nuvem do servidor (proteção SSRF).',
          'Detalhes: a página «Segurança».',
        ],
      },
      {
        h: '10. Google Analytics e consentimento',
        p: 'Com o seu consentimento usamos o Google Analytics 4 (Google LLC) para contar as visitas e ver que ferramentas são usadas. A Google guarda então no seu navegador cookies com um identificador (_ga, _ga_*) e recebe dados da visita: páginas vistas, localização aproximada, tipo de dispositivo e navegador e a origem da visita.',
        items: [
          'Sem consentimento, o script do Google Analytics nem sequer é carregado — o site não contacta a Google.',
          'Pode alterar ou retirar o consentimento a qualquer momento com o botão «Definições de cookies» no fundo de cada página. Retirá-lo desliga de imediato o Google Analytics e apaga os seus cookies.',
          'Não usamos o Google Analytics para publicidade nem para criar perfis. Os ficheiros com que trabalha nunca chegam à Google.',
        ],
      },
      {
        h: '11. Alterações',
        p: 'Podemos alterar esta política quando o funcionamento do site mudar; a data da última alteração está no topo da página. Questões: kontakt@optimapdf.com.',
      },
    ],
  },

  rodo: {
    title: 'Informação sobre o RGPD',
    updated: 'Última atualização: 14 de outubro de 2026',
    sections: [
      {
        h: '1. Responsável pelo tratamento',
        p: 'O responsável pelos dados pessoais é Leszek Hofman, Dąbrówka Nowa, Polónia (optimapdf.com). Contacto para qualquer assunto relativo aos seus dados: kontakt@optimapdf.com.',
      },
      {
        h: '2. Que dados tratamos e para quê',
        items: [
          'Os seus ficheiros — não os tratamos num servidor. Todas as ferramentas de ficheiros funcionam no seu navegador e o ficheiro não sai do seu dispositivo.',
          'Texto enviado às funções de IA — passamo-lo através do nosso servidor à OpenRouter e ao fornecedor do modelo para executar o seu pedido (resumo, tradução, resposta). Não o guardamos.',
          'O endereço da página em URL para PDF — o nosso servidor descarrega essa página e cria um PDF. Não o guardamos.',
          'Endereço IP — para contar os limites de pedidos (IA: 24 horas; URL para PDF: 10 minutos) e prevenir abusos; no registo do servidor só num pedido rejeitado e encurtado.',
          'Dados de visitas no Google Analytics — só com o seu consentimento.',
          'Definições (tema, idioma, decisão sobre a análise) — guardadas só no seu navegador.',
        ],
      },
      {
        h: '3. Fundamentos jurídicos',
        items: [
          'Art. 6.º, n.º 1, alínea b), do RGPD — prestação do serviço pedido (funções de IA, URL para PDF).',
          'Art. 6.º, n.º 1, alínea f), do RGPD — interesse legítimo: segurança e limites de pedidos.',
          'Art. 6.º, n.º 1, alínea a), do RGPD — consentimento para o Google Analytics.',
        ],
      },
      {
        h: '4. Prazos de conservação',
        items: [
          'Ficheiros, texto enviado à IA e endereços de páginas a converter: não são guardados.',
          'Contadores de limites com o endereço IP: 24 horas (IA) e 10 minutos (URL para PDF).',
          'Registos do servidor no fornecedor de alojamento: 1 hora (plano atual da Vercel).',
          'Google Analytics: no máximo 14 meses.',
          'Definições no seu navegador: até as apagar; o cookie de idioma até 12 meses.',
        ],
      },
      {
        h: '5. Destinatários',
        p: 'Não vendemos dados nem os partilhamos para fins de marketing. Tratam dados por nossa conta: Vercel Inc. (alojamento), Upstash, Inc. (contadores de limites), OpenRouter, Inc. e o fornecedor do modelo (só funções de IA) e, com o seu consentimento, Google LLC (Google Analytics). Todos têm sede nos EUA.',
      },
      {
        h: '6. Transferências para países terceiros',
        p: 'O servidor da aplicação funciona nos EUA, pelo que os dados da secção 2 (exceto ficheiros e definições do navegador) são transferidos para os EUA. A Vercel e a Google estão certificadas no âmbito do Quadro de Privacidade de Dados UE-EUA (Decisão (UE) 2023/1795 da Comissão); a Upstash e a OpenRouter tratam os dados nos termos das suas condições de tratamento de dados.',
      },
      {
        h: '7. Os seus direitos',
        items: [
          'Acesso (art. 15.º) e retificação (art. 16.º).',
          'Apagamento (art. 17.º) e limitação do tratamento (art. 18.º).',
          'Portabilidade (art. 20.º) e oposição (art. 21.º).',
          'Retirar o consentimento a qualquer momento — para o Google Analytics com o botão «Definições de cookies» no fundo da página.',
        ],
      },
      {
        h: '8. Como exercer os seus direitos',
        p: 'Escreva para kontakt@optimapdf.com. Respondemos no prazo de 30 dias, sem custos (salvo pedidos manifestamente infundados ou excessivos — art. 12.º, n.º 5, do RGPD). Não existem contas, pelo que os dados técnicos normalmente não podem ser associados a uma pessoa concreta (art. 11.º do RGPD).',
      },
      {
        h: '9. Reclamação',
        p: 'Se considerar que tratamos os seus dados em violação do RGPD, pode apresentar reclamação a uma autoridade de controlo — na Polónia, o Presidente do Gabinete de Proteção de Dados Pessoais, ul. Stawki 2, 00-193 Varsóvia.',
      },
      {
        h: '10. Cookies e armazenamento do navegador',
        p: 'Usamos um cookie necessário (x-detected-locale — o idioma do site, até 12 meses) e o localStorage para as definições. Os cookies do Google Analytics (_ga, _ga_*) só aparecem depois do seu consentimento e são removidos quando o retira. Não usamos cookies de publicidade.',
      },
      {
        h: '11. Alterações',
        p: 'Atualizamos esta informação quando o funcionamento do site muda; a data da última alteração está no topo da página.',
      },
    ],
  },

  security: {
    title: 'Segurança',
    updated: 'Última atualização: 14 de outubro de 2026',
    intro: 'A proteção mais importante do OptimaPDF é algo que não fazemos: não enviamos os seus ficheiros para um servidor. Abaixo explicamos como funciona e quais são as outras proteções — apenas as que realmente aplicamos.',
    sections: [
      {
        h: '1. Os ficheiros ficam no seu dispositivo',
        p: 'Todas as ferramentas de ficheiros, incluindo compressão, OCR e conversões, funcionam no seu navegador (JavaScript e WebAssembly). O ficheiro não é enviado para um servidor, por isso ninguém do nosso lado tem acesso a ele. Pode verificá-lo: abra as ferramentas de programador do navegador (F12), o separador «Rede», e processe um ficheiro — não verá nenhum envio do ficheiro. Ao servidor só chegam o texto das funções de IA e o endereço de uma página em URL para PDF.',
      },
      {
        h: '2. Ligação cifrada',
        p: 'O site só funciona por HTTPS. O cabeçalho HSTS (com inclusão na lista de pré-carregamento dos navegadores) faz com que o navegador se ligue sempre de forma segura, mesmo na primeira visita.',
      },
      {
        h: '3. Proteção no navegador',
        items: [
          'Uma Content Security Policy limita de onde o site pode carregar scripts e a que se pode ligar: o nosso domínio e os serviços nela indicados (início de sessão Google, Dropbox, Microsoft e, após consentimento, Google Analytics).',
          'O site não pode ser incorporado noutros sites (X-Frame-Options: DENY, frame-ancestors) — o que protege contra clickjacking.',
          'A Permissions-Policy bloqueia o acesso à câmara, ao microfone, à localização, a USB e a pagamentos.',
          'X-Content-Type-Options e Referrer-Policy limitam a adivinhação de tipos de ficheiro e a transmissão de endereços de páginas.',
        ],
      },
      {
        h: '4. Proteção do servidor',
        items: [
          'Os pedidos à API só são aceites a partir do nosso site (verificação dos cabeçalhos Origin e Referer — proteção CSRF).',
          'Limites de pedidos: 30 por minuto por endereço IP para a API, 15 por dia para as funções de IA, 30 a cada 10 minutos para URL para PDF; limite de tamanho dos pedidos de 100 MB.',
          'O URL para PDF recusa endereços de redes privadas e locais e dos serviços na nuvem do servidor, e o endereço verificado é o mesmo a que o servidor se liga (proteção contra SSRF e DNS rebinding).',
          'As entradas da API são verificadas no servidor (comprimento do texto, idiomas de tradução permitidos).',
        ],
      },
      {
        h: '5. Funções de IA',
        p: 'À IA só enviamos o texto extraído do ficheiro e a sua pergunta — sem o seu endereço IP nem dados do navegador, através do nosso servidor e da sua chave API (não precisa de chave própria). Cada pedido exige um fornecedor que, segundo a OpenRouter, não guarde os dados para além do pedido nem treine modelos com eles; se não houver nenhum, o pedido não é executado.',
      },
      {
        h: '6. Sem contas nem perfis',
        p: 'Não pedimos registo nem início de sessão, não guardamos palavras-passe nem criamos perfis de utilizador. As palavras-passe para proteger e desbloquear PDF e os certificados para assinar só são usados no seu navegador.',
      },
      {
        h: '7. Dependências',
        p: 'Mantemos as bibliotecas atualizadas e verificamos as suas vulnerabilidades conhecidas com npm audit e um teste que assinala cada novo alerta de nível alto ou crítico nas dependências usadas pelo site.',
      },
      {
        h: '8. Comunicar uma vulnerabilidade',
        p: 'Se encontrar uma falha de segurança, escreva para kontakt@optimapdf.com. Comprometemo-nos a:',
        items: [
          'confirmar a receção em 24 horas,',
          'analisá-la e publicar uma correção em 14 dias (conforme a gravidade),',
          'informá-lo do que fizemos,',
          'não tomar medidas legais contra quem comunique vulnerabilidades de boa-fé.',
        ],
      },
      {
        h: '9. Certificações',
        p: 'O OptimaPDF não tem certificação ISO 27001 nem SOC 2 própria. O nosso fornecedor de alojamento, a Vercel, tem certificação ISO 27001:2022 e um relatório SOC 2 Tipo 2. Como os ficheiros nunca chegam ao nosso servidor, do nosso lado não há ficheiros «em repouso» para cifrar.',
      },
      {
        h: '10. Assinatura digital e eIDAS',
        p: 'A ferramenta «Assinar PDF» cria uma assinatura digital PAdES com o seu próprio certificado (.p12/.pfx) — inteiramente no navegador; nem o ficheiro nem o certificado são enviados. É uma verdadeira assinatura criptográfica, mas não automaticamente uma assinatura eletrónica qualificada (QES) nos termos do Regulamento eIDAS (UE 910/2014): o estatuto QES depende de o certificado ter sido emitido por um prestador qualificado de serviços de confiança e de a chave estar num dispositivo qualificado.',
      },
    ],
  },

  principles: {
    security: 'Usamos uma ligação HTTPS cifrada, uma Content Security Policy, proteção da API contra abusos e limites de pedidos. Acima de tudo, as ferramentas de ficheiros funcionam no seu navegador, por isso os seus ficheiros nem chegam ao nosso servidor.',
    tracking: 'Atualmente o site não mostra anúncios. No futuro poderemos introduzir anúncios discretos (p. ex. Google AdSense) para cobrir os custos de alojamento e desenvolvimento — se isso acontecer, atualizaremos esta informação. Em qualquer caso, todas as ferramentas PDF continuarão gratuitas e sem limites. Usamos o Google Analytics só com o seu consentimento, que pode retirar a qualquer momento com o botão «Definições de cookies». Não usamos píxeis de remarketing nem criação de perfis comportamentais.',
  },
};

export default pt;
