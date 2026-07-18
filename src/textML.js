/**
 * Tiny TF-IDF + Multinomial Naive Bayes text classifier, runs in browser /
 * Capacitor WebView with no native dependencies. Used for the BYOC
 * (Bring-Your-Own-Compute / phone-as-worker) flow on Android.
 *
 * Produces a JSON-serializable model that the FastAPI backend can also run
 * directly when serving predictions, so there's no pickle dependency for
 * phone-trained models.
 */

const STOPWORDS = new Set([
  'the','a','an','and','or','but','if','then','of','at','by','for','with',
  'about','against','between','into','through','during','before','after',
  'above','below','to','from','up','down','in','out','on','off','over','under',
  'again','further','is','am','are','was','were','be','been','being','have',
  'has','had','having','do','does','did','doing','i','me','my','myself','we',
  'our','ours','ourselves','you','your','yours','yourself','yourselves','he',
  'him','his','himself','she','her','hers','herself','it','its','itself','they',
  'them','their','theirs','themselves','what','which','who','whom','this',
  'that','these','those','as','so','than','too','very','can','will','just',
  'don','should','now','s','t','d','ll','m','o','re','ve','y','ain','aren'
]);

const tokenize = text => String(text || '')
  .toLowerCase()
  .replace(/[^a-z0-9\s']+/g, ' ')
  .split(/\s+/)
  .filter(t => t && t.length > 1 && !STOPWORDS.has(t));

/** Build a vocabulary + TF-IDF matrix from a list of texts. */
function buildTfIdf(texts, { maxFeatures = 3000, minDocFreq = 2 } = {}) {
  // Document frequency per term
  const df = new Map();
  const docTokens = [];
  for (const t of texts) {
    const toks = tokenize(t);
    docTokens.push(toks);
    const seen = new Set(toks);
    for (const w of seen) df.set(w, (df.get(w) || 0) + 1);
  }
  const N = texts.length;
  // Rank terms by doc frequency, keep top maxFeatures
  const vocab = [...df.entries()]
    .filter(([,c]) => c >= minDocFreq && c < N)
    .sort((a,b) => b[1] - a[1])
    .slice(0, maxFeatures)
    .map(([w]) => w);
  const index = new Map(vocab.map((w, i) => [w, i]));
  const V = vocab.length;
  // IDF smoothed
  const idf = new Float64Array(V);
  for (let i = 0; i < V; i++) {
    idf[i] = Math.log((1 + N) / (1 + df.get(vocab[i]))) + 1;
  }
  return { vocab, index, idf, docTokens, V };
}

/** Convert one token list to a sparse tf-idf vector. Returns Map<idx, tfidf>. */
function vectorize(tokens, index, idf) {
  const tf = new Map();
  for (const w of tokens) {
    const i = index.get(w);
    if (i == null) continue;
    tf.set(i, (tf.get(i) || 0) + 1);
  }
  const vec = new Map();
  let norm = 0;
  for (const [i, count] of tf) {
    const v = count * idf[i];
    vec.set(i, v);
    norm += v * v;
  }
  norm = Math.sqrt(norm) || 1;
  for (const [i, v] of vec) vec.set(i, v / norm); // l2 normalize
  return vec;
}

/** Train a Multinomial Naive Bayes classifier on TF-IDF vectors. */
function trainNaiveBayes(vecs, labels, V, { alpha = 1.0 } = {}) {
  const classes = [...new Set(labels)];
  const classIdx = new Map(classes.map((c,i) => [c,i]));
  const C = classes.length;
  const logPrior = new Float64Array(C);
  // log prob of feature given class (Laplace smoothed)
  const logProb = Array.from({length: C}, () => new Float64Array(V));
  const featureCount = new Float64Array(C);
  const classCount = new Float64Array(C);
  for (let c = 0; c < C; c++) {
    for (let i = 0; i < V; i++) logProb[c][i] = alpha;
    featureCount[c] = alpha * V;
  }
  for (let n = 0; n < vecs.length; n++) {
    const c = classIdx.get(labels[n]);
    classCount[c]++;
    for (const [i, v] of vecs[n]) {
      // Use presence/weighted counts for feature learning
      logProb[c][i] += v + 1;
      featureCount[c] += v + 1;
    }
  }
  for (let c = 0; c < C; c++) {
    logPrior[c] = Math.log(classCount[c] / vecs.length);
    for (let i = 0; i < V; i++) {
      logProb[c][i] = Math.log(logProb[c][i] / featureCount[c]);
    }
  }
  return { classes, classIdx, logPrior, logProb };
}

function predictVec(vec, nb) {
  let best = null, bestScore = -Infinity;
  const scores = {};
  for (let c = 0; c < nb.classes.length; c++) {
    let s = nb.logPrior[c];
    for (const [i, v] of vec) s += nb.logProb[c][i] * v;
    scores[nb.classes[c]] = s;
    if (s > bestScore) { bestScore = s; best = nb.classes[c]; }
  }
  // softmax-ish confidence
  let denom = 0;
  const confs = {};
  for (const [k, v] of Object.entries(scores)) {
    const e = Math.exp(v - bestScore);
    confs[k] = e; denom += e;
  }
  for (const k in confs) confs[k] = confs[k] / denom;
  return { label: best, confidence: confs[best], scores: confs };
}

/** Train a text-classification model from labeled rows.
 * @param {Array<{text:string, label:string}>} rows
 * @param {(p:number)=>void} onProgress (0-100)
 */
export function trainTextModel(rows, onProgress = () => {}) {
  onProgress(5);
  const texts = rows.map(r => r.text);
  const labels = rows.map(r => String(r.label));
  const { vocab, index, idf, V } = buildTfIdf(texts, { maxFeatures: 3000, minDocFreq: 1 });
  onProgress(30);

  const vecs = [];
  for (let n = 0; n < texts.length; n++) {
    const toks = tokenize(texts[n]);
    vecs.push(vectorize(toks, index, idf));
    if (n % 50 === 0) onProgress(30 + Math.round((n / texts.length) * 30));
  }
  onProgress(65);

  const nb = trainNaiveBayes(vecs, labels, V);
  onProgress(85);

  // Compute training accuracy + top features (mutual-info-ish: log-odds magnitude)
  let correct = 0;
  const cm = {}; // actual -> predicted -> count
  for (const c of nb.classes) cm[c] = {};
  for (const c of nb.classes) for (const c2 of nb.classes) cm[c][c2] = 0;
  for (let n = 0; n < vecs.length; n++) {
    const p = predictVec(vecs[n], nb).label;
    if (p === labels[n]) correct++;
    cm[labels[n]][p] = (cm[labels[n]][p] || 0) + 1;
  }
  const accuracy = correct / vecs.length;

  const topFeatures = {};
  for (let c = 0; c < nb.classes.length; c++) {
    const pairs = [];
    for (let i = 0; i < V; i++) pairs.push({ w: vocab[i], s: nb.logProb[c][i] });
    pairs.sort((a,b) => b.s - a.s);
    topFeatures[nb.classes[c]] = pairs.slice(0, 20).map(p => [p.w, Number(p.s.toFixed(4))]);
  }
  const dist = {};
  for (const l of labels) dist[l] = (dist[l] || 0) + 1;

  onProgress(100);

  // Serializable artifact (JSON-safe, same shape the backend uses for predictions)
  const artifact = {
    kind: 'toddler-bayes-v1',
    vocab,
    idf: Array.from(idf),
    classes: nb.classes,
    logPrior: Array.from(nb.logPrior),
    logProb: nb.logProb.map(row => Array.from(row)),
    trainedAt: new Date().toISOString(),
  };
  return { artifact, accuracy, labels: nb.classes, topFeatures, confusionMatrix: cm, distribution: dist };
}

/** Predict with a serialized artifact produced by trainTextModel. */
export function predictText(artifact, text) {
  const index = new Map(artifact.vocab.map((w,i) => [w,i]));
  const idf = Float64Array.from(artifact.idf);
  const nb = {
    classes: artifact.classes,
    logPrior: Float64Array.from(artifact.logPrior),
    logProb: artifact.logProb.map(r => Float64Array.from(r)),
  };
  const toks = tokenize(text);
  const vec = vectorize(toks, index, idf);
  return predictVec(vec, nb);
}
