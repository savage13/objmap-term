import fs from 'fs/promises'
import sharp from 'sharp'


export async function load_image(url) {
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
