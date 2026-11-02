import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import * as cheerio from 'cheerio';
import * as mammoth from 'mammoth';
import AdmZip from 'adm-zip';
import { PDFParse } from 'pdf-parse';
import { ApiError } from './http';

// Limits for user-supplied study material
export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_URLS = 5;
const MAX_URL_BYTES = 3 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 50;
const MAX_ZIP_UNCOMPRESSED_BYTES = 20 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 10_000;

const TEXT_EXTENSIONS = ['.txt', '.md', '.csv', '.json'];

// ─── URL FETCHING (SSRF-safe) ───

function isPrivateIPv4(ip: string) {
    const [a, b] = ip.split('.').map(Number);
    return (
        a === 0 || a === 10 || a === 127 || a >= 224 ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 198 && (b === 18 || b === 19))
    );
}

function isPrivateAddress(ip: string) {
    if (isIP(ip) === 4) return isPrivateIPv4(ip);
    const v6 = ip.toLowerCase();
    const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIPv4(mapped[1]);
    return v6 === '::' || v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || /^fe[89ab]/.test(v6);
}

/** Rejects URLs that aren't public http(s), so the server can't be used to reach internal services */
async function assertPublicUrl(raw: string): Promise<URL> {
    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        throw new ApiError(400, `Not a valid URL: ${raw}`);
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new ApiError(400, `Only http and https links are supported: ${raw}`);
    }
    if (url.username || url.password) throw new ApiError(400, `Links with credentials are not allowed: ${raw}`);
    const host = url.hostname.replace(/^\[|\]$/g, '');
    const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
    if (addresses.length === 0) throw new ApiError(400, `Could not resolve ${url.hostname}`);
    if (addresses.some(a => isPrivateAddress(a.address))) {
        throw new ApiError(400, `Links to private or local addresses are not allowed: ${raw}`);
    }
    return url;
}

async function readLimited(res: Response, maxBytes: number): Promise<Buffer> {
    const reader = res.body?.getReader();
    if (!reader) return Buffer.alloc(0);
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
            await reader.cancel();
            break; // keep what we have; the rest is truncated
        }
        chunks.push(value);
    }
    return Buffer.concat(chunks);
}

export async function extractTextFromUrl(raw: string): Promise<string> {
    let url = await assertPublicUrl(raw.trim());
    let res: Response | undefined;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
        try {
            res = await fetch(url, {
                redirect: 'manual',
                signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
                headers: { 'User-Agent': 'RivisionBot/1.0 (+study material import)' },
            });
        } catch {
            throw new ApiError(400, `Could not fetch ${url.href}`);
        }
        const location = res.headers.get('location');
        if (res.status >= 300 && res.status < 400 && location) {
            url = await assertPublicUrl(new URL(location, url).href);
            continue;
        }
        break;
    }
    if (!res || !res.ok) throw new ApiError(400, `Could not fetch ${url.href} (status ${res?.status ?? 'unknown'})`);

    const body = await readLimited(res, MAX_URL_BYTES);
    const type = res.headers.get('content-type') || '';
    if (type.includes('application/pdf')) return extractPdf(body, url.href);
    if (type.startsWith('text/plain') || type.includes('json') || type.includes('markdown')) {
        return body.toString('utf8');
    }
    const $ = cheerio.load(body.toString('utf8'));
    $('script, style, nav, footer, header, noscript, svg').remove();
    return $('body').text().replace(/\s+/g, ' ').trim();
}

// ─── FILES ───

async function extractPdf(buffer: Buffer, label: string): Promise<string> {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
        const result = await parser.getText();
        return result.text;
    } catch {
        throw new ApiError(400, `Could not read the PDF ${label}. Is it password-protected or scanned?`);
    } finally {
        await parser.destroy();
    }
}

export async function extractTextFromFile(file: File): Promise<string> {
    if (file.size > MAX_FILE_BYTES) {
        throw new ApiError(413, `${file.name} is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB`);
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.toLowerCase();

    if (TEXT_EXTENSIONS.some(ext => name.endsWith(ext))) return buffer.toString('utf8');
    if (name.endsWith('.pdf')) return extractPdf(buffer, file.name);
    if (name.endsWith('.docx')) return (await mammoth.extractRawText({ buffer })).value;

    if (name.endsWith('.zip')) {
        let zip: AdmZip;
        try {
            zip = new AdmZip(buffer);
        } catch {
            throw new ApiError(400, `${file.name} is not a valid ZIP file`);
        }
        const entries = zip.getEntries().filter(e => !e.isDirectory);
        if (entries.length > MAX_ZIP_ENTRIES) {
            throw new ApiError(413, `${file.name} has more than ${MAX_ZIP_ENTRIES} files`);
        }
        // Guard against zip bombs using the sizes declared in the archive
        const declared = entries.reduce((sum, e) => sum + e.header.size, 0);
        if (declared > MAX_ZIP_UNCOMPRESSED_BYTES) {
            throw new ApiError(413, `${file.name} unpacks to more than ${MAX_ZIP_UNCOMPRESSED_BYTES / 1024 / 1024} MB`);
        }
        let combined = '';
        for (const entry of entries) {
            const n = entry.entryName.toLowerCase();
            if (TEXT_EXTENSIONS.some(ext => n.endsWith(ext))) {
                combined += `\n--- ${entry.entryName} ---\n` + entry.getData().toString('utf8');
            } else if (n.endsWith('.docx')) {
                const r = await mammoth.extractRawText({ buffer: entry.getData() });
                combined += `\n--- ${entry.entryName} ---\n` + r.value;
            } else if (n.endsWith('.pdf')) {
                combined += `\n--- ${entry.entryName} ---\n` + (await extractPdf(entry.getData(), entry.entryName));
            }
        }
        return combined;
    }

    throw new ApiError(415, `${file.name}: unsupported format. Use PDF, DOCX, TXT, MD, CSV, JSON or ZIP.`);
}
