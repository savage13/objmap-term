import fs from 'fs/promises'
import { loadImage } from 'canvas'
import sharp from 'sharp'


export async function load_image(url: string) {
    let buf
    if (url.startsWith("http")) {
        console.log(`fetching ${url}...`)
        const res = await fetch(url)
        buf = await res.arrayBuffer()
    } else {
        buf = await fs.readFile(url)
    }
    let tmp = await sharp(buf)
    let raw = tmp.raw().ensureAlpha()
    let pix = await raw.toUint8Array()
    let data = new Uint8ClampedArray(pix.data)
    return { data, width: pix.info.width, height: pix.info.height }
}

export async function load_svg(url: string) {
    let res = await fetch(url)
    let text = await res.text()
    text = ensure_size(text, [256, 256])
    let data_url = `data:image/svg+xml;base64,${Buffer.from(text).toString('base64')}`;
    let img = await loadImage(data_url)
    return img
}

function ensure_size(text: string, size: number[]) {
    let width = size[0]
    let height = size[1]

    const hasWidth = /<svg[^>]*\bwidth\s*=\s*/i.test(text);
    const hasHeight = /<svg[^>]*\bheight\s*=\s*/i.test(text);

    if (!hasWidth || !hasHeight) {
        // Try to extract dimensions from viewBox if available (e.g., "0 0 800 600")
        const viewBoxMatch = text.match(/<svg[^>]*\bviewBox\s*=\s*["']([^"']+)["']/i);
        if (viewBoxMatch) {
            const parts = viewBoxMatch[1].trim().split(/[\s,]+/);
            if (parts.length === 4) {
                width = parseFloat(parts[2]);
                height = parseFloat(parts[3]);
            }
        }
        text = text.replace('<svg', `<svg width="${width}" height="${height}"`);
    }
    return text
}
