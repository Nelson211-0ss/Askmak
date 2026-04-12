const OpenAI = require('openai');
const db = require('../config/db');
const storage = require('./storage');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateEmbedding(text) {
    const response = await openai.embeddings.create({
        model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
        input: text.substring(0, 8000)
    });
    return response.data[0].embedding;
}

async function generateEmbeddings(texts) {
    const batches = [];
    for (let i = 0; i < texts.length; i += 100) {
        batches.push(texts.slice(i, i + 100));
    }

    const results = [];
    for (const batch of batches) {
        const response = await openai.embeddings.create({
            model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
            input: batch.map(t => t.substring(0, 8000))
        });
        results.push(...response.data.map(d => d.embedding));
    }
    return results;
}

async function vectorSearch(query, options = {}) {
    const embedding = await generateEmbedding(query);
    const embeddingStr = '[' + embedding.join(',') + ']';

    let sql = `
        SELECT id, title, content, source_url, category, image_keys, metadata,
               1 - (embedding <=> $1::vector) AS similarity
        FROM documents
        WHERE embedding IS NOT NULL
    `;
    const params = [embeddingStr];
    let paramIdx = 2;

    if (options.category) {
        sql += ` AND category = $${paramIdx}`;
        params.push(options.category);
        paramIdx++;
    }

    sql += ` ORDER BY embedding <=> $1::vector LIMIT $${paramIdx}`;
    params.push(options.limit || 5);

    const result = await db.query(sql, params);
    return result.rows;
}

async function fullTextSearch(query, options = {}) {
    const tsQuery = query.split(/\s+/).filter(Boolean).join(' & ');

    let sql = `
        SELECT id, title, content, source_url, category, image_keys, metadata,
               ts_rank(tsv, to_tsquery('english', $1)) AS rank
        FROM documents
        WHERE tsv @@ to_tsquery('english', $1)
    `;
    const params = [tsQuery];
    let paramIdx = 2;

    if (options.category) {
        sql += ` AND category = $${paramIdx}`;
        params.push(options.category);
        paramIdx++;
    }

    sql += ` ORDER BY rank DESC LIMIT $${paramIdx}`;
    params.push(options.limit || 5);

    const result = await db.query(sql, params);
    return result.rows;
}

async function hybridSearch(query, options = {}) {
    const [vectorResults, textResults] = await Promise.all([
        vectorSearch(query, options),
        fullTextSearch(query, options).catch(() => [])
    ]);

    const seen = new Map();

    vectorResults.forEach((doc, idx) => {
        seen.set(doc.id, {
            ...doc,
            score: (doc.similarity || 0) * 0.7 + (1 - idx / vectorResults.length) * 0.3
        });
    });

    textResults.forEach((doc, idx) => {
        if (seen.has(doc.id)) {
            const existing = seen.get(doc.id);
            existing.score += (doc.rank || 0) * 0.3;
        } else {
            seen.set(doc.id, {
                ...doc,
                score: (doc.rank || 0) * 0.5
            });
        }
    });

    const results = Array.from(seen.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, options.limit || 5);

    for (const doc of results) {
        if (doc.image_keys && doc.image_keys.length) {
            doc.image_urls = await Promise.all(
                doc.image_keys.map(key =>
                    storage.getPresignedUrl(process.env.MINIO_BUCKET_DOCUMENTS, key).catch(() => null)
                )
            );
        }
    }

    return results;
}

function expandAbbreviations(query) {
    const abbrevs = {
        'cobams': 'College of Business and Management Sciences',
        'cedat': 'College of Engineering Design Art and Technology',
        'chs': 'College of Health Sciences',
        'chuss': 'College of Humanities and Social Sciences',
        'cocis': 'College of Computing and Information Sciences',
        'caes': 'College of Agricultural and Environmental Sciences',
        'conas': 'College of Natural Sciences',
        'covab': 'College of Veterinary Medicine Animal Resources and Biosecurity',
        'school of law': 'School of Law',
        'acmis': 'Academic Management Information System',
        'prn': 'Payment Reference Number',
        'mak': 'Makerere University'
    };

    let expanded = query;
    for (const [abbr, full] of Object.entries(abbrevs)) {
        const regex = new RegExp('\\b' + abbr + '\\b', 'gi');
        if (regex.test(expanded)) {
            expanded = expanded + ' ' + full;
        }
    }
    return expanded;
}

function formatContextForLLM(docs) {
    if (!docs.length) return 'No relevant documents found in the knowledge base.';

    return docs.map((doc, i) => {
        let block = `[Source ${i + 1}: ${doc.title || 'Untitled'}]\n${doc.content}`;
        if (doc.source_url) block += `\nURL: ${doc.source_url}`;
        return block;
    }).join('\n\n---\n\n');
}

module.exports = {
    generateEmbedding, generateEmbeddings, vectorSearch, fullTextSearch,
    hybridSearch, expandAbbreviations, formatContextForLLM
};
