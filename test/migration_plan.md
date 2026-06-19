Nesse teste, eu pretendia as visualizações (PSB2.5D, PSB3D, Worm e Scroll) entre si, mas ao realizar o piloto percebi que não haveria diferença significativa entre elas, de modo que não vale a pena conduzir o teste assim. Durante o piloto, percebi que um fator chave é a interação com os sliders que configuram o break (o quanto a visualização esconde dados ou não). Então quero alterar o teste para que dentro do bloco eu compare a configuração manual (sliders habilitados) vs uma pré-configuração fixa otimizada por IA ou algoritmo de otimização. Como o teste já está muito longo, eu quero deixar somente o PSB 2.5D e o PSB 3D como between subject e as 3 formas de configuração do break (manual com sliders, pré-configurada por llm e pré-configurada por otimização) within subject. Nota, o between subject deve ser controlado manualmente pelo condutor do teste, alterando uma variável no código. 

Aqui está o mapeamento de alto nível das modificações necessárias no seu código para adequar a arquitetura ao novo delineamento experimental (Between-subject: PSB 2.5D vs 3D; Within-subject: Manual vs LLM vs Otimização).

**Modificações Globais e Estruturais (JavaScript)**

*   **Variável de Controle (Between-Subject):** Criar uma constante global no topo do script (ex: EXPERIMENTAL\_CONDITION = 'PSB\_2.5D') que o condutor do teste alterará manualmente antes de cada sessão para definir qual classe de visualização será instanciada.
    
*   **Redefinição do Array de Iteração:** O array atual VISUALIZATIONS (que controla o loop do within-subject) deve ser substituído por um array de CONFIGURATIONS (Manual, LLM, Otimização). A classe do gráfico a ser instanciada (ClassRef) virá da variável global, enquanto as propriedades (presença de controles, valores predefinidos) virão deste novo array.
    

**Alterações Tela a Tela**

**1\. Tela de Boas-Vindas (welcome-screen) e TCLE(tcle-screen)**

*   **Copy:** Atualizar os textos introdutórios e o objetivo da pesquisa no TCLE. O foco não é mais "avaliar novas técnicas", mas sim "avaliar diferentes métodos de configuração e automação de quebras de escala em visualizações de dados".
    

**2\. Questionário Demográfico (demographic-screen)**

*   **Manutenção:** Nenhuma alteração estrutural ou lógica é necessária. Os dados coletados continuam pertinentes.
    

**3\. Tutorial (tutorial-screen)**

*   **Redução de Passos:** Em vez de apresentar 4 gráficos iterativos, o tutorial deve apresentar apenas o gráfico atrelado à condição _between-subject_ selecionada.
    
*   **Explicação dos Métodos:** O tutorial deve ser adaptado para demonstrar ao participante que ele passará por três cenários: um onde ele precisará ajustar os _sliders_ de dobra/quebra para encontrar a informação (Manual), e dois onde o sistema já entregará a visualização pré-ajustada (LLM e Otimização), focando a instrução em como ler o gráfico já configurado.
    

**4\. Instrução da Tarefa (task-instruction-screen) e Contexto do Bloco (block-context-screen)**

*   **Ajuste de Rótulos:** Atualizar os textos dinâmicos para refletirem que a visualização é a mesma (ex: "Visualização PSB 3D"), mas a _condição de configuração_ mudou para o bloco atual.
    

**5\. Tarefa do Bloco (block-task-screen)**

*   **Renderização Condicional dos Controles:** Esta é a alteração funcional primária. A função renderBlockTaskChart deve verificar a condição _within-subject_ atual. Se for "Manual", injeta os _sliders_ na blockControls. Se for "LLM" ou "Otimização", a div de controles deve ficar vazia (ou exibir um aviso de "Configuração Automática") e o gráfico deve ser instanciado passando os parâmetros fixos calculados para aquela base de dados e tarefa.
    

**6\. Registro de Resposta (block-answer-screen)**

*   **Log de Dados:** A interface permanece inalterada. Nos bastidores, a função de salvar a resposta (currentTaskRecord) precisa ser ajustada para registrar qual foi o "método de configuração" utilizado no bloco, em vez de qual era o "tipo de visualização".
    

**7\. Avaliação NASA-TLX (nasa-tlx-screen)**

*   **Redução de Itens:** Reduzir a grade de avaliação de 4 para 3 colunas/linhas, correspondentes aos três métodos (Manual, LLM, Otimização).
    
*   **Ajuste Visual:** Substituir os rótulos e as imagens de _preview_. Como a visualização será a mesma nos três itens, os rótulos devem focar na experiência (ex: "Configuração Manual", "Configuração IA", "Configuração Algorítmica").
    

**8\. Ranking Final (final-ranking-screen)**

*   **Redução de Slots:** Alterar as colunas e posições (slots) de drag-and-drop de 4 para 3 lugares.
    
*   **Mudança de Foco:** O texto de instrução deve pedir ao participante para ordenar sua preferência entre os **modos de interação/automação** (Qual você achou mais fácil ou eficiente de usar?), e não entre técnicas visuais distintas.
    

**9\. Comentários Finais (final-comments-screen) e Agradecimento (thanks-screen)**

*   **Placeholders:** Atualizar o atributo _placeholder_ da caixa de texto para instigar o participante a falar sobre o esforço de usar os controles manuais comparado com as versões pré-configuradas automáticas.
    

Para as condições estáticas (LLM e Otimização), você planeja calcular e embutir os parâmetros ideais de quebra diretamente no JSON de cada base de dados (no objeto DATASET\_POOL), ou eles serão calculados em tempo de execução?