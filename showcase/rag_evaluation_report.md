# DeepRAG Evaluation Report

## Overview

Đánh giá chất lượng hệ thống RAG chat qua 3 phase, sử dụng cả rule-based metrics và RAGAS LLM-as-judge.

**Workspace test**: KBG9 (id=11)
- Doc 11: TechVina Annual Report 2025 (Vietnamese, 26 chunks, 17 pages)
- Doc 12: DeepSeek-V3.2 Technical Paper (English, 57 chunks, 23 pages)

**Stack**: BAAI/bge-m3 embeddings → ChromaDB + LightRAG (KG) → Reranker bge-reranker-v2-m3

---

## Executive Summary (English)

### System Overview

| Item | Detail |
|------|--------|
| **System** | DeepRAG — Retrieval-Augmented Generation Chat |
| **Pipeline** | BAAI/bge-m3 embeddings → ChromaDB + LightRAG (KG) → bge-reranker-v2-m3 → LLM |
| **Test corpus** | 2 docs: TechVina Annual Report 2025 (VI, 26 chunks) + DeepSeek-V3.2 Paper (EN, 57 chunks) |
| **Eval methods** | Phase 1: 16 hand-crafted tests (rule-based) · Phase 3: 30 RAGAS synthetic tests (LLM judge) |

### Phase 1 — Hand-crafted Tests (Rule-based)

| Category | Pass Rate | Avg Score | Notes |
|----------|-----------|-----------|-------|
| Fact extraction | 5/5 | 0.93 | Both VI and EN documents |
| Table data | 2/3 | 0.83 | gemma3:12b fails "Key, Year = Value" format |
| Cross-document | 2/2 | 0.89 | Synthesizes across both docs |
| Anti-hallucination | 3/3 | 1.00 | Correctly refuses out-of-scope questions |
| History (multi-turn) | 2/2 | 0.87 | Follow-up context handled well |
| Citation accuracy | 1/1 | 0.85 | M&A transaction citations |
| **Overall** | **15/16** | **0.89** | **Verdict: EXCELLENT** |

### Phase 3 — RAGAS Synthetic Tests (LLM Judge)

| Metric | gemma3:12b (local) | gemini-2.5-flash (API) | Winner |
|--------|-------------------|----------------------|--------|
| **Overall score** | 0.832 | **0.846** | Gemini |
| **Pass rate** | 25/30 (83%) | **26/30 (87%)** | Gemini |
| Faithfulness | 0.749 | **0.812** | Gemini (+0.063) |
| Factual correctness | **0.773** | 0.749 | gemma3 (+0.024) |
| Context recall | 0.833 | 0.833 | Tie |
| Context utilization | 0.472 | **0.533** | Gemini (+0.061) |
| Table extraction | 0.697 | **0.905** | Gemini (+0.208) |
| Comparison analysis | 0.734 | **0.873** | Gemini (+0.139) |
| Avg latency | **3076ms** | 3283ms | gemma3 (-207ms) |

### Strengths & Weaknesses

| Aspect | Status | Detail |
|--------|--------|--------|
| Anti-hallucination | ✅ Strong | Perfect refusal on out-of-scope questions |
| Citation format | ✅ Strong | 100% correct format across all tests |
| Cross-doc reasoning | ✅ Strong | Successfully synthesizes across multiple sources |
| Table parsing | ⚠️ Model-dependent | gemma3 fails complex tables; Gemini handles well |
| Language consistency | ⚠️ Model-dependent | gemma3 occasionally responds in wrong language |
| Retrieval coverage | ❌ Weak | 5 cases with context_recall = 0 (chairman name, churn rate, YoY growth) |
| Faithfulness | ❌ Weak | 4 FAIL cases — LLM adds unsupported details when elaborating |

### Recommendations

| Priority | Action | Expected Impact |
|----------|--------|-----------------|
| 1 | Switch to **Gemini 2.5 Flash** for production | +4% pass rate, +20% table accuracy, language consistency |
| 2 | Improve retrieval for low context_recall | Fix 5 cases where retrieval misses relevant chunks |
| 3 | Monitor faithfulness | Reduce over-elaboration in 4 failing cases |

---

## Phase 1: Hand-crafted Test Cases (Rule-based)

**Script**: `backend/scripts/eval_rag.py`
**LLM**: Ollama gemma3:12b

### Dataset
16 hand-crafted test cases across 6 categories:

| Category | Count | Description |
|----------|-------|-------------|
| fact_extraction (VI) | 3 | Founding year, revenue, staffing |
| fact_extraction (EN) | 2 | Technical features, competitions |
| table_data | 3 | Financial metrics, benchmark scores |
| cross_doc | 2 | AI Platform + DeepSeek capabilities |
| anti_hallucination | 3 | Out-of-scope questions (should refuse) |
| history | 2 | Multi-turn follow-up |
| citation | 1 | M&A transactions |

### Metrics (8 rule-based, no LLM judge)
- keyword_coverage, refusal_accuracy, phantom_citations, citation_format
- token_artifacts, language_match, answer_completeness, context_utilization

### Results

```
OVERALL SCORE: 0.89 | PASS: 15/16 | Verdict: EXCELLENT
```

| Category | Pass | Avg Score |
|----------|------|-----------|
| fact_extraction | 5/5 | 0.93 |
| table_data | 2/3 | 0.83 |
| cross_doc | 2/2 | 0.89 |
| anti_hallucination | 3/3 | 1.00 |
| history | 2/2 | 0.87 |
| citation | 1/1 | 0.85 |

**Remaining issue**: TABLE-02 (Biên lợi nhuận gộp/ROE) — gemma3:12b cannot parse "Key, Year = Value" table format.

---

## Phase 3: RAGAS Synthetic Testset (LLM Judge)

**Script**: `backend/scripts/eval_ragas_synthetic.py`
**Testset generation**: Gemini 2.0 Flash (30 Q&A pairs with ground truth)
**RAGAS Judge**: Gemini 2.0 Flash (Faithfulness, ContextRecall, FactualCorrectness)

### Dataset
30 auto-generated Q&A pairs from document chunks:

| Synthesizer Type | Count |
|-----------------|-------|
| single_hop_factual | 23 |
| table_extraction | 3 |
| comparison_analysis | 3 |
| multi_hop_reasoning | 1 |

### Model Comparison: gemma3:12b vs gemini-2.5-flash

Cùng 30 câu hỏi + ground truth, chỉ thay đổi LLM trả lời.

#### Aggregate Metrics

| Metric | gemma3:12b | gemini-2.5-flash | Delta |
|--------|-----------|------------------|-------|
| **Overall** | **0.832** | **0.846** | **+0.014** |
| **Pass rate** | **25/30 (83%)** | **26/30 (87%)** | **+1** |
| answer_substance | 0.997 | 0.997 | = |
| citation_format | 1.000 | 1.000 | = |
| no_token_artifacts | 1.000 | 1.000 | = |
| context_recall | 0.833 | 0.833 | = |
| faithfulness | 0.749 | **0.812** | **+0.063** |
| factual_correctness | **0.773** | 0.749 | -0.024 |
| context_utilization | 0.472 | **0.533** | **+0.061** |
| Avg latency | **3076ms** | 3283ms | +207ms |

#### By Synthesizer Type

| Type | gemma3:12b | gemini-2.5-flash |
|------|-----------|------------------|
| single_hop_factual | 0.836 | 0.839 |
| table_extraction | 0.697 | **0.905** |
| comparison_analysis | 0.734 | **0.873** |
| multi_hop_reasoning | 0.766 | 0.762 |

#### Key Differences

**Gemini 2.5 Flash wins:**
- RAGAS-006 (R&D cost): gemma3 trả sai 320 tỷ → gemini trả đúng **382 tỷ**
- RAGAS-018 (Biên EBITDA): gemma3 trả lời bằng Malayalam (!) → gemini trả đúng tiếng Việt
- RAGAS-022 (AI/ML best company): gemma3 nói FPT IS → gemini nói đúng **TechVina ★★★★★**
- Table extraction tốt hơn nhiều (0.697 → 0.905)
- Language consistency: Gemini luôn trả lời đúng ngôn ngữ câu hỏi

**gemma3:12b wins:**
- factual_correctness nhỉnh hơn (0.773 vs 0.749) — có thể do random variation

**Cả hai đều yếu (retrieval/context issue):**
- RAGAS-009: context_recall = 0 cho "Chủ tịch HĐQT" (retrieval không tìm đủ context)
- RAGAS-023: faithfulness = 0 cho churn rate
- RAGAS-027: faithfulness = 0 cho giá cạnh tranh
- RAGAS-029: faithfulness = 0 cho tăng trưởng YoY

---

## Detailed Per-Sample Results (Gemini 2.5 Flash)

| ID | Category | Score | Status | Issue |
|----|----------|-------|--------|-------|
| RAGAS-001 | single_hop | 1.00 | PASS | |
| RAGAS-002 | table | 0.90 | PASS | |
| RAGAS-003 | multi_hop | 0.76 | PASS | factual_correctness: 0.00 |
| RAGAS-004 | single_hop | 0.76 | PASS | factual_correctness: 0.00 |
| RAGAS-005 | table | 0.90 | PASS | |
| RAGAS-006 | table | 0.90 | PASS | Fixed vs gemma3 (was 0.62) |
| RAGAS-007 | single_hop | 0.88 | PASS | |
| RAGAS-008 | comparison | 0.95 | PASS | |
| RAGAS-009 | single_hop | 0.62 | FAIL | context_recall: 0, faithfulness: 0 |
| RAGAS-010 | single_hop | 0.90 | PASS | |
| RAGAS-011 | single_hop | 0.89 | PASS | |
| RAGAS-012 | single_hop | 0.93 | PASS | |
| RAGAS-013 | single_hop | 0.90 | PASS | |
| RAGAS-014 | single_hop | 0.86 | PASS | |
| RAGAS-015 | single_hop | 0.93 | PASS | |
| RAGAS-016 | single_hop | 1.00 | PASS | |
| RAGAS-017 | single_hop | 0.86 | PASS | |
| RAGAS-018 | comparison | 0.90 | PASS | Fixed vs gemma3 (was 0.59) |
| RAGAS-019 | single_hop | 0.86 | PASS | |
| RAGAS-020 | single_hop | 0.90 | PASS | |
| RAGAS-021 | single_hop | 0.90 | PASS | |
| RAGAS-022 | single_hop | 0.84 | PASS | Fixed vs gemma3 (was 0.77) |
| RAGAS-023 | single_hop | 0.54 | FAIL | context_recall: 0, faithfulness: 0.29 |
| RAGAS-024 | single_hop | 0.93 | PASS | |
| RAGAS-025 | single_hop | 0.95 | PASS | |
| RAGAS-026 | comparison | 0.76 | PASS | |
| RAGAS-027 | single_hop | 0.62 | FAIL | context_recall: 0, faithfulness: 0 |
| RAGAS-028 | single_hop | 0.81 | PASS | |
| RAGAS-029 | single_hop | 0.48 | FAIL | faithfulness: 0, factual: 0 |
| RAGAS-030 | single_hop | 0.93 | PASS | |

---

## Issue Analysis

### Resolved Issues (from initial 7/10 → 15/16)
1. **Over-refusal** — Fixed: softened prompt from "ONLY"/"NEVER" to balanced instructions
2. **Phantom citations** — Fixed: added "no citations on refusal" rule
3. **History handling** — Fixed: conversation context recap before question
4. **Token artifacts** — Fixed: `re.sub(r'<unused\d+>:?\s*', '', answer)`
5. **Cross-doc reasoning** — Fixed: explicit "synthesize across sources" permission

### Remaining Issues
1. **Faithfulness (4 fails)** — LLM occasionally adds unsupported details when elaborating
2. **Context recall (5 cases = 0)** — Retrieval pipeline doesn't find relevant chunks for some specific facts (e.g., chairman name, churn rate)
3. **Table data parsing** — gemma3:12b struggles with "Key, Year = Value" format; gemini handles it well
4. **Language mixing** — gemma3 sometimes responds in wrong language; gemini is consistent

### Recommendations
1. **Switch to Gemini 2.5 Flash** for production — better faithfulness, table parsing, language consistency
2. **Improve retrieval** for low context_recall cases — consider adjusting chunk size or adding metadata filtering
3. **Monitor faithfulness** — the 4 failing cases suggest the LLM sometimes over-elaborates beyond source content

---

## Scripts Reference

| Script | Purpose | Usage |
|--------|---------|-------|
| `eval_rag.py` | Phase 1: 16 hand-crafted tests, rule-based | `python scripts/eval_rag.py --workspace 11` |
| `eval_ragas_synthetic.py generate` | Generate synthetic testset | `python scripts/eval_ragas_synthetic.py generate --workspace 11 --size 30 --gemini-key KEY` |
| `eval_ragas_synthetic.py evaluate` | Evaluate with RAGAS judge | `python scripts/eval_ragas_synthetic.py evaluate --workspace 11 --testset scripts/ragas_testset.json --gemini-key KEY` |

### Switching LLM Provider
```bash
# Edit deeprag/.env
# Comment Ollama, uncomment Gemini (or vice versa)
# Restart server (required — settings are cached with @lru_cache)
```

No reindexing needed when switching LLM — only embedding model changes require reindex.
