import json
import pandas as pd
import numpy as np
import scipy.stats as stats
import os
import itertools
import scikit_posthocs as sp 
from scipy.stats import friedmanchisquare, wilcoxon, shapiro

# --- CONFIGURAÇÃO ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
RESULTS_PATH = os.path.normpath(os.path.join(SCRIPT_DIR, '..', '..', 'results.json'))


TASK_MAP = {
    'T1': 'T1 (Valor Exato)',
    'T2': 'T2 (Diferença Distante)',
    'T3': 'T3 (Diferença Próxima)',
    'T4': 'T4 (Proporção Distante)',
    'T5': 'T5 (Proporção Próxima)'
}

CONFIDENCE_MAP = {
    'muito baixa': 0,
    'baixa': 1,
    'média': 2,
    'alta': 3,
    'muito alta': 4,
    'extremamente alta': 5,
    'nenhuma': 0,
    'nula': 0
}

# Lista global para armazenar resultados para a análise de poder final
power_analysis_data = []

# ==========================================
# FUNÇÕES DE CARREGAMENTO E ESTATÍSTICA
# ==========================================

def load_and_flatten_data(filepath):
    """ Lê e organiza o JSON no novo formato do experimento """
    if not os.path.exists(filepath):
        print(f"ERRO: Arquivo não encontrado em {filepath}")
        return None, None

    with open(filepath, 'r', encoding='utf-8') as f:
        raw_data = json.load(f)

    perf_rows = []
    quest_rows = []
    rank_tech_rows = []
    rank_mode_rows = []

    print(f"Processando {len(raw_data)} registros...")

    for record in raw_data:
        # Lida com o wrapper gerado pelo servidor Node.js
        exp_data = record.get('experimentData', record)
        current_pid = exp_data.get('participantId', 'Unknown')
        
        # --- Performance (Blocos de Tarefa) ---
        for block in exp_data.get('blocks', []):
            task = block.get('taskKey', 'Unknown')
            vis_full = block.get('visualizationId', 'Unknown')
            
            # Separa Técnica (psb25d, psb3d) e Modo (manual, llm, opt)
            parts = vis_full.split('_')
            technique = parts[0] if len(parts) > 0 else 'Unknown'
            mode = parts[1] if len(parts) > 1 else 'Unknown'
            
            rt = block.get('timeOnBlockTaskScreenSeconds', np.nan)
            
            # --- Cálculo do Log Error ---
            answer = block.get('answerNumber')
            correct = block.get('correctAnswer')
            is_correct = block.get('isCorrect')
            epsilon = 1e-9 # Pequena constante para evitar log(0) ou divisão por zero

            log_error = np.nan
            if task == 'T1':
                if is_correct is True:
                    log_error = 0.0
                elif is_correct is False:
                    log_error = 1.0
            elif answer is not None and correct is not None:
                # A fórmula abs(log10(ratio)) é simétrica para super/subestimação
                # Ex: err(200/100) = |log(2)| = 0.3; err(50/100) = |log(0.5)| = |-0.3| = 0.3
                log_error = np.abs(np.log10( (answer + epsilon) / (correct + epsilon) ))
            
            confidence_value = block.get('confidence')
            confidence_score = np.nan
            if isinstance(confidence_value, str):
                confidence_norm = confidence_value.strip().lower()
                confidence_score = CONFIDENCE_MAP.get(confidence_norm, np.nan)
            elif isinstance(confidence_value, (int, float)):
                confidence_score = confidence_value

            perf_rows.append({
                'Participant': current_pid,
                'Task': task,
                'Diff': 'Geral', # Sem níveis de dificuldade extras
                'Visualization': vis_full,
                'Technique': technique,
                'Mode': mode,
                'LogError': log_error,
                'RT': rt,
                'Confidence': confidence_score
            })

        # --- NASATLX (NASA-TLX) ---
        for tlx in exp_data.get('blockNasaTlx', []):
            task = tlx.get('taskKey', 'Unknown')
            visualizations = tlx.get('visualizations') or [{
                **tlx,
                'visualizationId': 'Geral'
            }]

            for vis_eval in visualizations:
                vis_full = vis_eval.get('visualizationId', 'Unknown')
                # Separa Técnica (psb25d, psb3d) e Modo (manual, llm, opt)
                parts = vis_full.split('_')
                technique = parts[0] if len(parts) > 0 else 'Unknown'
                mode = parts[1] if len(parts) > 1 else 'Unknown'

                mental = vis_eval.get('mentalDemand')
                temporal = vis_eval.get('temporalDemand')
                perf_raw = vis_eval.get('performance')
                effort = vis_eval.get('effort')
                frust = vis_eval.get('frustration')

                if any(x is None for x in [mental, temporal, perf_raw, effort, frust]):
                    perf_inverted = np.nan
                    workload = np.nan
                else:
                    # Performance é invertida somente para alinhar a carga agregada.
                    perf_inverted = 100 - perf_raw
                    workload = (mental + temporal + perf_inverted + effort + frust) / 5.0

                quest_rows.append({
                    'Participant': current_pid,
                    'Task_Full': f"TLX_{task}",
                    'Task': task,
                    'Visualization': vis_full,
                    'Technique': technique,
                    'Mode': mode,
                    'Workload': workload,
                    'Mental': mental,
                    'Temporal': temporal,
                    'Performance': perf_inverted,
                    'Effort': effort,
                    'Frustration': frust
                })

        # --- Ranking de Preferência (Fase 3 - Técnicas) ---
        final_ranking_tech = exp_data.get('finalRankingTechniques')
        if final_ranking_tech and 'order' in final_ranking_tech:
            ranking_order = final_ranking_tech['order']
            for rank_idx, vis in enumerate(ranking_order):
                rank_tech_rows.append({
                    'Participant': current_pid,
                    'Visualization': vis,
                    'Rank': rank_idx + 1
                })

        # --- Ranking de Preferência (Fase 3 - Modos) ---
        final_ranking_modes = exp_data.get('finalRankingModes')
        if final_ranking_modes and 'order' in final_ranking_modes:
            ranking_order = final_ranking_modes['order']
            for rank_idx, vis in enumerate(ranking_order):
                rank_mode_rows.append({
                    'Participant': current_pid,
                    'Visualization': vis,
                    'Rank': rank_idx + 1
                })

    df_perf = pd.DataFrame(perf_rows) if perf_rows else pd.DataFrame()
    df_quest = pd.DataFrame(quest_rows) if quest_rows else pd.DataFrame()
    df_rank_tech = pd.DataFrame(rank_tech_rows) if rank_tech_rows else pd.DataFrame()
    df_rank_mode = pd.DataFrame(rank_mode_rows) if rank_mode_rows else pd.DataFrame()

    return df_perf, df_quest, df_rank_tech, df_rank_mode

def filter_high_error_participants(df, threshold=4.0, t1_threshold=0.5):
    """
    Remove participantes que tiveram LogError médio > threshold 
    em uma tarefa específica (indicando que não entenderam a tarefa ou chutaram).
    Para a Tarefa T1 (erro binário), um limiar separado (t1_threshold) é usado.
    """
    print(f"\n{'='*20} FILTRO DE QUALIDADE DE DADOS (LOG ERROR) {'='*20}")
    
    # 1. Calcula o LogError médio de cada participante POR TAREFA
    error_summary = df.groupby(['Task', 'Participant'])['LogError'].mean().reset_index()
    
    # 2. Identifica quem falhou no critério
    bad_performers_t1 = error_summary[(error_summary['Task'] == 'T1') & (error_summary['LogError'] > t1_threshold)]
    bad_performers_other = error_summary[(error_summary['Task'] != 'T1') & (error_summary['LogError'] > threshold)]
    bad_performers = pd.concat([bad_performers_t1, bad_performers_other])
    
    if bad_performers.empty:
        print(">> Nenhum participante removido (Todos abaixo do limiar de erro).")
        return df

    # 3. Cria uma lista de pares (Task, Participant) para remover
    keys_to_remove = set(bad_performers.apply(lambda row: f"{row['Task']}_{row['Participant']}", axis=1))
    
    # Cria coluna temporária no DF original para comparar
    df['temp_key'] = df.apply(lambda row: f"{row['Task']}_{row['Participant']}", axis=1)
    
    # 4. Filtra o DataFrame mantendo apenas quem NÃO está na lista de remoção
    df_clean = df[~df['temp_key'].isin(keys_to_remove)].copy()
    
    # Remove a coluna temporária
    df_clean.drop(columns=['temp_key'], inplace=True, errors='ignore')
    
    # Relatório de quem saiu
    print(f">> Critério: LogError médio > {threshold:.1f} (outras tarefas) ou > {t1_threshold:.1f} (T1).")
    for _, row in bad_performers.iterrows():
        print(f"   [REMOVIDO] {row['Participant']} da tarefa '{row['Task']}' (Erro médio: {row['LogError']:.2f})")
        
    print(f">> Registros restantes: {len(df_clean)} (de {len(df)})")
    print("="*70 + "\n")
    
    return df_clean


def run_normality_test(df, metric, group_col='Visualization'):
    """ 
    Executa o teste de Shapiro-Wilk para cada visualização.
    "We initially assessed data distribution using the Shapiro-Wilk test"
    """
    print(f"\n> Verificação de Normalidade (Shapiro-Wilk) para '{metric}'")
    print("   H0: Os dados seguem distribuição normal (p > 0.05)")
    print("-" * 50)
    
    groups = df[group_col].unique()
    all_normal = True
    
    for g in groups:
        # Pega os dados apenas deste grupo e remove NaNs
        scores = df[df[group_col] == g][metric].dropna()
        
        if len(scores) < 3:
            print(f"   {g:15s}: N={len(scores)} (Amostra muito pequena)")
            continue

        stat, p_val = shapiro(scores)
        is_normal = p_val > 0.05
        
        if not is_normal:
            all_normal = False
            
        status = "Normal" if is_normal else "NÃO Normal"
        print(f"   {g:15s}: W={stat:.4f}, p={p_val:.5f} ({status})")

    print("-" * 50)
    if not all_normal:
        print("   CONCLUSÃO: Pelo menos um grupo não é normal -> Justifica uso do Friedman.")
    else:
        print("   CONCLUSÃO: Todos os grupos parecem normais.")

def run_friedman_test(df, metric_col, group_col='Visualization', block_col='Participant'):
    """ Executa Friedman, retorna dados e médias descritivas. """
    
    # 1. Descritiva
    desc_stats = df.groupby(group_col)[metric_col].mean()
    desc_count = df.groupby(group_col)[metric_col].count()
    is_lower_better = metric_col in ['RT', 'LagTime', 'Replays', 'Workload', 'Rank', 'LogError', 'Mental', 'Temporal', 'Performance', 'Effort', 'Frustration']
    sorted_stats = desc_stats.sort_values(ascending=is_lower_better)
    
    print("   Médias (Descritiva):")
    if is_lower_better:
        if metric_col == 'RT': unit = "s"
        elif metric_col == 'Rank': unit = "º"
        elif metric_col == 'LogError': unit = "" # A unidade já está implícita no nome
        else: unit = " pts"
        print("   " + ", ".join([f"{k}={v:.2f}{unit} (n={desc_count[k]})" for k, v in sorted_stats.items()]))
    else:
        if metric_col == 'Confidence':
            unit = " pts"
            print("   " + ", ".join([f"{k}={v:.2f}{unit} (n={desc_count[k]})" for k, v in sorted_stats.items()]))
        else: # Assume que outras métricas 'higher is better' são porcentagens
            unit = "%"
            multiplier = 100
            print("   " + ", ".join([f"{k}={v*multiplier:.1f}{unit} (n={desc_count[k]})" for k, v in sorted_stats.items()]))
    # 2. Pivot e Limpeza
    pivot = df.pivot_table(index=block_col, columns=group_col, values=metric_col, aggfunc='mean')
    pivot_clean = pivot.dropna() 
    
    N = len(pivot_clean)
    if N < 2:
        return f">> N insuficiente para teste estatístico pareado (N={N}). Use apenas as médias acima."

    # 3. Friedman
    data_arrays = [pivot_clean[col].values for col in pivot_clean.columns]
    stat, p_value = stats.friedmanchisquare(*data_arrays)
    
    # Cálculo do Tamanho do Efeito (Kendall's W)
    k = len(pivot_clean.columns)
    W = stat / (N * (k - 1))
    
    return {
        'N': N,
        'k': k,
        'Statistic': stat,
        'p-value': p_value,
        'KendallW': W,
        'Means': pivot_clean.mean().to_dict(),
        'Significant': p_value < 0.05,
        'PivotData': pivot_clean
    }

def run_posthoc_tests(friedman_result, metric_col='Correct'):
    """Post-hoc Durbin-Conover com correção de Bonferroni"""

    pivot = friedman_result['PivotData']

    # scikit-posthocs aceita dados em formato wide para este teste
    posthoc = sp.posthoc_conover_friedman(
        pivot,
        p_adjust='bonferroni'
    )

    print("\n   [POST-HOC] Durbin-Conover (Bonferroni)")
    print(posthoc.round(4))

    significant_pairs = []

    groups = pivot.columns.tolist()

    is_lower_better = metric_col in [
        'RT', 'LagTime', 'Replays',
        'Workload', 'Rank',
        'LogError',
        'Mental', 'Temporal',
        'Performance',
        'Effort',
        'Frustration'
    ]

    for g1, g2 in itertools.combinations(groups, 2):

        p_val = posthoc.loc[g1, g2]

        if p_val < 0.05:

            mean1 = friedman_result['Means'][g1]
            mean2 = friedman_result['Means'][g2]

            if is_lower_better:
                winner = g1 if mean1 < mean2 else g2
            else:
                winner = g1 if mean1 > mean2 else g2

            significant_pairs.append((g1, g2, p_val, winner))

    return significant_pairs

def run_wilcoxon_test(df, metric_col, group_col='Visualization', block_col='Participant'):
    """ Executa o teste Wilcoxon Signed-Rank para 2 grupos pareados. """
    
    # 1. Descritiva
    desc_stats = df.groupby(group_col)[metric_col].mean()
    desc_count = df.groupby(group_col)[metric_col].count()
    is_lower_better = metric_col in ['RT', 'LagTime', 'Replays', 'Workload', 'Rank', 'LogError', 'Mental', 'Temporal', 'Performance', 'Effort', 'Frustration']
    sorted_stats = desc_stats.sort_values(ascending=is_lower_better)
    
    print("   Médias (Descritiva):")
    if metric_col == 'Rank': unit = "º"
    else: unit = " pts"
    print("   " + ", ".join([f"{k}={v:.2f}{unit} (n={desc_count[k]})" for k, v in sorted_stats.items()]))

    # 2. Pivot e Limpeza
    pivot = df.pivot_table(index=block_col, columns=group_col, values=metric_col, aggfunc='mean')
    pivot_clean = pivot.dropna()
    
    if len(pivot_clean.columns) != 2:
        return f">> ERRO: O teste de Wilcoxon requer exatamente 2 grupos. Encontrados: {len(pivot_clean.columns)}."

    N = len(pivot_clean)
    if N < 2:
        return f">> N insuficiente para teste estatístico pareado (N={N})."

    # 3. Wilcoxon Test
    group1_name, group2_name = pivot_clean.columns
    group1_data = pivot_clean[group1_name]
    group2_data = pivot_clean[group2_name]
    
    try:
        stat, p_value = stats.wilcoxon(group1_data, group2_data, correction=True)
    except ValueError as e:
        return f">> Erro no teste de Wilcoxon: {e}. Verifique se há variação nos dados."

    # --- NEW: Calculate Effect Size (Rank-Biserial Correlation) ---
    diff = group1_data - group2_data
    diff_nonzero = diff[diff != 0]
    
    effect_size = np.nan
    if len(diff_nonzero) > 0:
        ranks = stats.rankdata(np.abs(diff_nonzero))
        w_plus = np.sum(ranks[diff_nonzero > 0])
        w_minus = np.sum(ranks[diff_nonzero < 0])
        
        # Evita divisão por zero se não houver ranks
        if (w_plus + w_minus) > 0:
            effect_size = (w_plus - w_minus) / (w_plus + w_minus)

    # Determina o vencedor
    mean1 = group1_data.mean()
    mean2 = group2_data.mean()
    
    winner = None
    if p_value < 0.05:
        if is_lower_better:
            winner = group1_name if mean1 < mean2 else group2_name
        else:
            winner = group1_name if mean1 > mean2 else group2_name
        
    return {
        'N': N, 'Statistic': stat, 'p-value': p_value,
        'EffectSize': effect_size,
        'Significant': p_value < 0.05,
        'Means': {group1_name: mean1, group2_name: mean2},
        'Winner': winner
    }

# ==========================================
# FUNÇÕES DE ANÁLISE DE PODER
# ==========================================

def calculate_friedman_power(N, k, W, alpha=0.05):
    """ Calcula o poder estatístico aproximado para Friedman (Chi2 Não-Central) """
    if W <= 0: return 0.0
    df = k - 1
    chi2_critical = stats.chi2.ppf(1 - alpha, df)
    chi2_observed = N * (k - 1) * W # Lambda (Non-centrality param)
    power = 1 - stats.ncx2.cdf(chi2_critical, df, chi2_observed)
    return power

def find_min_detectable_effect(N, k, target_power=0.80, alpha=0.05):
    """ Encontra o menor W que atinge 80% de poder """
    for w in np.arange(0.01, 1.0, 0.001):
        p = calculate_friedman_power(N, k, w, alpha)
        if p >= target_power:
            return w
    return 1.0

def print_separator(title):
    print(f"\n{'='*60}")
    print(f" {title.upper()}")
    print(f"{'='*60}")

# ==========================================
# EXECUÇÃO PRINCIPAL
# ==========================================

df_perf, df_quest, df_rank_tech, df_rank_mode = load_and_flatten_data(RESULTS_PATH)

# --- NOVO: APLICA O FILTRO DE ACURÁCIA ---
if df_perf is not None and not df_perf.empty:
    df_perf = filter_high_error_participants(df_perf, threshold=4.0, t1_threshold=1.1)

# ==========================================
# ANÁLISE POR TAREFA (COMPARANDO AS 6 CONDIÇÕES)
# Para cada tarefa, analisa o desempenho (Erro, Tempo, Confiança) e a carga
# de trabalho (NASA-TLX) entre as 6 combinações de Técnica + Modo.
# ==========================================
print_separator("ANÁLISE POR TAREFA (COMPARANDO AS 6 CONDIÇÕES)")

# Pega a lista de todas as tarefas únicas presentes nos dados
all_tasks = []
if df_perf is not None:
    all_tasks.extend(df_perf['Task'].unique())
if df_quest is not None:
    all_tasks.extend(df_quest['Task'].unique())
unique_tasks = sorted(list(set(all_tasks)))

for task in unique_tasks:
    task_name = TASK_MAP.get(task, task)
    print_separator(f"RESULTADOS PARA A TAREFA: {task_name}")

    # --- 1. ANÁLISE DE PERFORMANCE (Erro, Tempo, Confiança) ---
    if df_perf is not None and not df_perf.empty:
        subset_perf = df_perf[df_perf['Task'] == task]
        if not subset_perf.empty:
            print("\n--- Métricas de Performance ---")

            # --- A. LOG ERROR ---
            print(f"\n--- Log Error ---")
            res = run_friedman_test(subset_perf, 'LogError')
            if isinstance(res, dict):
                print(f"Friedman N={res['N']} | Chi²={res['Statistic']:.2f} | p={res['p-value']:.5f} | Kendall's W={res['KendallW']:.4f}")
                power_analysis_data.append({'Label': f"{task_name} (LogError)", 'N': res['N'], 'k': res['k'], 'W': res['KendallW'], 'Sig': res['Significant']})
                if res['Significant']:
                    pairs = run_posthoc_tests(res, 'LogError')
                    if pairs:
                        print("\n   Diferenças Reais (menor erro é melhor):")
                        for g1, g2, p, winner in pairs:
                            loser = g2 if winner == g1 else g1
                            print(f"   * {winner} teve erro menor que {loser} (p={p:.5f})")
            else:
                print(res)

            # --- B. CONFIDENCE ---
            print(f"\n--- Confidence (Likert 0-5) ---")
            res_conf = run_friedman_test(subset_perf, 'Confidence')
            if isinstance(res_conf, dict):
                print(f"Friedman N={res_conf['N']} | Chi²={res_conf['Statistic']:.2f} | p={res_conf['p-value']:.5f} | Kendall's W={res_conf['KendallW']:.4f}")
                power_analysis_data.append({'Label': f"{task_name} (Confidence)", 'N': res_conf['N'], 'k': res_conf['k'], 'W': res_conf['KendallW'], 'Sig': res_conf['Significant']})
                if res_conf['Significant']:
                    pairs_conf = run_posthoc_tests(res_conf, 'Confidence')
                    if pairs_conf:
                        print("\n   Diferenças Reais (maior confiança é melhor):")
                        for g1, g2, p, winner in pairs_conf:
                            loser = g2 if winner == g1 else g1
                            print(f"   * {winner} teve confiança maior que {loser} (p={p:.5f})")
            else:
                print(res_conf)

            # --- C. TEMPO DE RESPOSTA (RT) ---
            print(f"\n--- Tempo (RT) ---")
            res_rt = run_friedman_test(subset_perf, 'RT')
            if isinstance(res_rt, dict):
                print(f"Friedman N={res_rt['N']} | Chi²={res_rt['Statistic']:.2f} | p={res_rt['p-value']:.5f} | Kendall's W={res_rt['KendallW']:.4f}")
                power_analysis_data.append({'Label': f"{task_name} (Time)", 'N': res_rt['N'], 'k': res_rt['k'], 'W': res_rt['KendallW'], 'Sig': res_rt['Significant']})
                if res_rt['Significant']:
                    pairs_rt = run_posthoc_tests(res_rt, 'RT')
                    if pairs_rt:
                        print("\n   Diferenças Reais (menor tempo é melhor):")
                        for g1, g2, p, winner in pairs_rt:
                            loser = g2 if winner == g1 else g1
                            print(f"   * {winner} foi mais rápido que {loser} (p={p:.5f})")
            else:
                print(res_rt)

    # --- 2. ANÁLISE SUBJETIVA (NASA-TLX) ---
    if df_quest is not None and not df_quest.empty:
        subset_quest = df_quest[df_quest['Task'] == task]
        if not subset_quest.empty:
            print("\n--- Métricas Subjetivas (NASA-TLX) ---")
            
            tlx_metrics = ['Workload', 'Mental', 'Temporal', 'Performance', 'Effort', 'Frustration']
            tlx_metric_names = {
                'Workload': 'Carga de Trabalho Geral (Média)', 'Mental': 'Demanda Mental',
                'Temporal': 'Demanda Temporal', 'Performance': 'Performance (Auto-avaliada)',
                'Effort': 'Esforço', 'Frustration': 'Frustração'
            }

            for metric in tlx_metrics:
                metric_name = tlx_metric_names.get(metric, metric)
                print(f"\n--- {metric_name} ---")
                
                res_tlx = run_friedman_test(subset_quest, metric)
                
                if isinstance(res_tlx, dict):
                    print(f"Friedman N={res_tlx['N']} | Chi²={res_tlx['Statistic']:.2f} |  p={res_tlx['p-value']:.5f} | Kendall's W={res_tlx['KendallW']:.4f}")
                    power_analysis_data.append({'Label': f"TLX {task} ({metric})", 'N': res_tlx['N'], 'k': res_tlx['k'], 'W': res_tlx['KendallW'], 'Sig': res_tlx['Significant']})
                    if res_tlx['Significant']:
                        pairs_tlx = run_posthoc_tests(res_tlx, metric)
                        if pairs_tlx:
                            print(f"\n   Diferenças Reais (menor '{metric_name}' é melhor):")
                            for g1, g2, p, winner in pairs_tlx:
                                loser = g2 if winner == g1 else g1
                                print(f"   * {winner} teve MENOR pontuação que {loser} (p={p:.5f})")
                else:
                    print(res_tlx)

# ==========================================
# ANÁLISE AGREGADA (EFEITOS PRINCIPAIS)
# Compara os fatores (Condição, Modo, Técnica) de forma geral, combinando os resultados de todas as tarefas.
# ==========================================
print_separator("ANÁLISE AGREGADA (EFEITOS PRINCIPAIS)")

if df_perf is not None and not df_perf.empty:
    # --- ANÁLISE AGREGADA POR CONDIÇÃO (TÉCNICA + MODO) ---
    print("\n--- ANÁLISE AGREGADA POR CONDIÇÃO (as 6 combinações) ---")

    # --- LogError por Condição (Agregado) ---
    print("\n--- Log Error (Agregado por Condição) ---")
    res_cond_log = run_friedman_test(df_perf, 'LogError', group_col='Visualization')
    if isinstance(res_cond_log, dict):
        print(f"Friedman N={res_cond_log['N']} | Chi²={res_cond_log['Statistic']:.2f} | p={res_cond_log['p-value']:.5f} | Kendall's W={res_cond_log['KendallW']:.4f}")
        power_analysis_data.append({'Label': "Agregado (LogError por Condição)", 'N': res_cond_log['N'], 'k': res_cond_log['k'], 'W': res_cond_log['KendallW'], 'Sig': res_cond_log['Significant']})
        if res_cond_log['Significant']:
            pairs = run_posthoc_tests(res_cond_log, 'LogError')
            if pairs:
                print("\n   Diferenças Reais (menor erro é melhor):")
                for g1, g2, p, winner in pairs:
                    loser = g2 if winner == g1 else g1
                    print(f"   * Condição '{winner}' teve erro menor que '{loser}' (p={p:.5f})")
    else:
        print(res_cond_log)

    # --- RT por Condição (Agregado) ---
    print("\n--- Tempo de Resposta (RT) (Agregado por Condição) ---")
    res_cond_rt = run_friedman_test(df_perf, 'RT', group_col='Visualization')
    if isinstance(res_cond_rt, dict):
        print(f"Friedman N={res_cond_rt['N']} | Chi²={res_cond_rt['Statistic']:.2f} | p={res_cond_rt['p-value']:.4f} | Kendall's W={res_cond_rt['KendallW']:.4f}")
        power_analysis_data.append({'Label': "Agregado (RT por Condição)", 'N': res_cond_rt['N'], 'k': res_cond_rt['k'], 'W': res_cond_rt['KendallW'], 'Sig': res_cond_rt['Significant']})
        if res_cond_rt['Significant']:
            pairs = run_posthoc_tests(res_cond_rt, 'RT')
            if pairs:
                print("\n   Diferenças Reais (menor tempo é melhor):")
                for g1, g2, p, winner in pairs:
                    loser = g2 if winner == g1 else g1
                    print(f"   * Condição '{winner}' foi mais rápida que '{loser}' (p={p:.4f})")
    else:
        print(res_cond_rt)

    # --- Confidence por Condição (Agregado) ---
    print("\n--- Confidence (Agregado por Condição) ---")
    res_cond_conf = run_friedman_test(df_perf, 'Confidence', group_col='Visualization')
    if isinstance(res_cond_conf, dict):
        print(f"Friedman N={res_cond_conf['N']} | Chi²={res_cond_conf['Statistic']:.2f} | p={res_cond_conf['p-value']:.5f} | Kendall's W={res_cond_conf['KendallW']:.4f}")
        power_analysis_data.append({'Label': "Agregado (Confidence por Condição)", 'N': res_cond_conf['N'], 'k': res_cond_conf['k'], 'W': res_cond_conf['KendallW'], 'Sig': res_cond_conf['Significant']})
        if res_cond_conf['Significant']:
            pairs = run_posthoc_tests(res_cond_conf, 'Confidence')
            if pairs:
                print("\n   Diferenças Reais (maior confiança é melhor):")
                for g1, g2, p, winner in pairs:
                    loser = g2 if winner == g1 else g1
                    print(f"   * Condição '{winner}' teve confiança maior que '{loser}' (p={p:5f})")
    else:
        print(res_cond_conf)

    # --- ANÁLISE POR MODO DE INTERAÇÃO (AGREGADO) ---
    print("\n--- ANÁLISE POR MODO DE INTERAÇÃO (EFEITO PRINCIPAL) ---")
    # --- LogError por Modo ---
    print("\n--- Log Error (por Modo) ---")
    res_mode_log = run_friedman_test(df_perf, 'LogError', group_col='Mode')
    if isinstance(res_mode_log, dict):
        print(f"Friedman N={res_mode_log['N']} | Chi²={res_mode_log['Statistic']:.2f} | p={res_mode_log['p-value']:.5f} | Kendall's W={res_mode_log['KendallW']:.4f}")
        power_analysis_data.append({'Label': "Agregado (LogError por Modo)", 'N': res_mode_log['N'], 'k': res_mode_log['k'], 'W': res_mode_log['KendallW'], 'Sig': res_mode_log['Significant']})
        if res_mode_log['Significant']:
            pairs = run_posthoc_tests(res_mode_log, 'LogError')
            if pairs:
                print("\n   Diferenças Reais (menor erro é melhor):")
                for g1, g2, p, winner in pairs:
                    loser = g2 if winner == g1 else g1
                    print(f"   * Modo '{winner}' teve erro menor que '{loser}' (p={p:.5f})")
    else:
        print(res_mode_log)

    # --- RT por Modo ---
    print("\n--- Tempo de Resposta (RT) (por Modo) ---")
    res_mode_rt = run_friedman_test(df_perf, 'RT', group_col='Mode')
    if isinstance(res_mode_rt, dict):
        print(f"Friedman N={res_mode_rt['N']} | Chi²={res_mode_rt['Statistic']:.2f} | p={res_mode_rt['p-value']:.5f} | Kendall's W={res_mode_rt['KendallW']:.4f}")
        power_analysis_data.append({'Label': "Agregado (RT por Modo)", 'N': res_mode_rt['N'], 'k': res_mode_rt['k'], 'W': res_mode_rt['KendallW'], 'Sig': res_mode_rt['Significant']})
        if res_mode_rt['Significant']:
            pairs = run_posthoc_tests(res_mode_rt, 'RT')
            if pairs:
                print("\n   Diferenças Reais (menor tempo é melhor):")
                for g1, g2, p, winner in pairs:
                    loser = g2 if winner == g1 else g1
                    print(f"   * Modo '{winner}' foi mais rápido que '{loser}' (p={p:.5f})")
    else:
        print(res_mode_rt)

# --- ANÁLISE AGREGADA DO NASA-TLX ---
if df_quest is not None and not df_quest.empty:
    # --- Workload por Condição (Agregado) ---
    print("\n--- Carga de Trabalho (Workload) por Condição (Agregado) ---")
    res_wl_cond = run_friedman_test(df_quest, 'Workload', group_col='Visualization')
    if isinstance(res_wl_cond, dict):
        print(f"Friedman N={res_wl_cond['N']} | Chi²={res_wl_cond['Statistic']:.2f} | p={res_wl_cond['p-value']:.5f} | Kendall's W={res_wl_cond['KendallW']:.4f}")
        power_analysis_data.append({'Label': "TLX Agregado (Workload por Condição)", 'N': res_wl_cond['N'], 'k': res_wl_cond['k'], 'W': res_wl_cond['KendallW'], 'Sig': res_wl_cond['Significant']})
        if res_wl_cond['Significant']:
            pairs = run_posthoc_tests(res_wl_cond, 'Workload')
            if pairs:
                print("\n   Diferenças Reais (menor carga é melhor):")
                for g1, g2, p, winner in pairs:
                    loser = g2 if winner == g1 else g1
                    print(f"   * Condição '{winner}' teve menor carga que '{loser}' (p={p:.5f})")
    else:
        print(res_wl_cond)

    # --- ANÁLISE AGREGADA DO NASA-TLX POR MODO E TÉCNICA ---
    print("\n--- ANÁLISE AGREGADA DO NASA-TLX (EFEITOS PRINCIPAIS) ---")
    # --- Workload por Modo ---
    print("\n--- Carga de Trabalho (Workload) por Modo ---")
    res_wl_mode = run_friedman_test(df_quest, 'Workload', group_col='Mode')
    if isinstance(res_wl_mode, dict):
        print(f"Friedman N={res_wl_mode['N']} | Chi²={res_wl_mode['Statistic']:.2f} | p={res_wl_mode['p-value']:.5f} | Kendall's W={res_wl_mode['KendallW']:.4f}")
        power_analysis_data.append({'Label': "TLX Agregado (Workload por Modo)", 'N': res_wl_mode['N'], 'k': res_wl_mode['k'], 'W': res_wl_mode['KendallW'], 'Sig': res_wl_mode['Significant']})
        if res_wl_mode['Significant']:
            pairs = run_posthoc_tests(res_wl_mode, 'Workload')
            if pairs:
                print("\n   Diferenças Reais (menor carga é melhor):")
                for g1, g2, p, winner in pairs:
                    loser = g2 if winner == g1 else g1
                    print(f"   * Modo '{winner}' teve menor carga que '{loser}' (p={p:.5f})")
    else:
        print(res_wl_mode)


# --- RANKING ---
if df_rank_tech is not None and not df_rank_tech.empty:
    print_separator("RANKING DE PREFERÊNCIA (TÉCNICAS)")
    
    # Com apenas 2 grupos (técnicas), o teste correto é o Wilcoxon Signed-Rank, não o Friedman.
    res = run_wilcoxon_test(df_rank_tech, 'Rank')
    
    if isinstance(res, dict):
        print(f"Wilcoxon Signed-Rank Test N={res['N']} | W-stat={res['Statistic']:.2f} | p={res['p-value']:.5f} | r_b={res.get('EffectSize', np.nan):.4f}")
        
        # A análise de poder para Wilcoxon é diferente e não foi adicionada à lista global.
        
        if res['Significant']:
            winner = res['Winner']
            loser = [g for g in res['Means'] if g != winner][0]
            print(f"\n   Diferença Significativa Encontrada (Menor rank é melhor):")
            print(f"   * A técnica '{winner}' foi preferida significativamente em relação a '{loser}' (p={res['p-value']:.5f}).")

    else:
        print(res)

if df_rank_mode is not None and not df_rank_mode.empty:
    print_separator("RANKING DE PREFERÊNCIA (MODOS)")
    
    res = run_friedman_test(df_rank_mode, 'Rank')
    
    if isinstance(res, dict):
        print(f"Friedman N={res['N']} | Chi²={res['Statistic']:.2f} |  p={res['p-value']:.4f} | Kendall's W={res['KendallW']:.5f}")
        
        power_analysis_data.append({
            'Label': "Ranking de Modos",
            'N': res['N'],
            'k': res['k'],
            'W': res['KendallW'],
            'Sig': res['Significant']
        })
        if res['Significant']:
            pairs = run_posthoc_tests(res, 'Rank')
            if pairs:
                print("\n   Diferenças Reais encontradas (Menor rank é melhor):")
                for g1, g2, p, winner in pairs:
                     loser = g2 if winner == g1 else g1
                     print(f"   * {winner} foi preferido a {loser} (p={p:.5f})")
    else:
        print(res)

# ==========================================
# RELATÓRIO FINAL DE PODER ESTATÍSTICO
# ==========================================

if power_analysis_data:
    print("\n\n")
    print("=" * 100)
    print(" ANÁLISE AUTOMÁTICA DE PODER ESTATÍSTICO (POST-HOC SENSITIVITY)")
    print(" Baseado nos N e W observados agora.")
    print("=" * 100)
    
    print(f"{'TAREFA/METRICA':<40} | {'N':<3} | {'W (Efeito)':<10} | {'PODER (calc)':<12} | {'STATUS'}")
    print("-" * 100)

    # Ordena por W para facilitar visualização
    # power_analysis_data.sort(key=lambda x: x['W'], reverse=True)

    for entry in power_analysis_data:
        power = calculate_friedman_power(entry['N'], entry['k'], entry['W'])
        power_pct = f"{power:.1%}"
        
        status = ""
        if power < 0.50 and not entry['Sig']:
            status = "⚠️ Underpowered (Risco Falso Negativo)"
        elif power >= 0.80:
            status = "✅ Poder Adequado"
        elif entry['Sig']:
            status = "✅ Detectado (Mesmo c/ poder médio)"
        else:
            status = "🔸 Poder Baixo"
            
        print(f"{entry['Label']:<40} | {entry['N']:<3} | {entry['W']:.4f}     | {power_pct:<12} | {status}")

    print("-" * 100)
    
    # Sensibilidade Média
    if len(power_analysis_data) > 0:
        avg_N = int(np.mean([e['N'] for e in power_analysis_data]))
        avg_k = int(np.mean([e['k'] for e in power_analysis_data]))
        mde = find_min_detectable_effect(avg_N, avg_k)
        
        print(f"\n>> SENSIBILIDADE DO EXPERIMENTO (Média N={avg_N}):")
        print(f"   Com {avg_N} participantes, você tem 80% de chance de detectar efeitos com W >= {mde:.3f}.")
        print(f"   (Referência Cohen: W=0.1 Pequeno, W=0.3 Médio, W=0.5 Grande)")
