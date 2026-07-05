
import * as fs from 'fs'
import { createCanvas, ImageData, Canvas } from 'canvas'
import { image2sixel, sixelEncode } from 'sixel';
import RgbQuant from 'rgbquant'
import keypress from 'keypress'

import { load_image } from './img.ts'

import { Transformation, Point, Bounds } from './geometry.ts'
import { sixel_size } from './size.ts'

let ZOOM = 3
let SCALE = 2


const MAX_PALETTE = 256
const BACKGROUND_SELECT = 0;

const TILE_SIZE = 256
const MAP_SIZE = [24000, 20000];

const SHIFT = 200
const NUM_COLORS = Math.floor(MAX_PALETTE / 2)

let sixel = await sixel_size()
sixel.height -= 60

const MAP_BOUNDS = new Bounds(new Point(-6000, -5000), new Point(6000, 5000))

async function add_image(coords: any, canvas: Canvas, scale = 1) {
    let { x, y, z } = coords
    const filename = `https://objmap.zeldamods.org/game_files/maptex/${z}/${x}/${y}.png`
    //const filename = `maptex/${z}/${x}/${y}.png`
    let img
    try {
        // Load image tile data and convert to ImageData
        let { data, width, height } = await load_image(filename)
        let img8 = new ImageData(data, width, height)
        // Create a canvas that allows for image scaling
        img = createCanvas(width, height)
        const ctx8 = img.getContext('2d')
        ctx8.putImageData(img8, 0, 0)
    } catch (err) {
        console.log(err)
        return
    }
    // Paste image tile data into larger map
    const ctx = canvas.getContext('2d')// { alpha: false, pixelFormat: 'RGB32' })
    let px = Math.floor(x * 256 * scale)
    let py = Math.floor(y * 256 * scale)
    ctx.drawImage(img,
        0, 0, img.width, img.height,
        px, py,
        Math.floor(img.width * scale), Math.floor(img.height * scale));
}

function initKeyboard() {
    keypress(process.stdin)
    if (process.stdin.setRawMode) {
        process.stdin.setRawMode(true)
    }
    process.stdin.resume()
    process.stdin.on("keypress", (_ch, key) => onKey(key))
}

function onKey(key: any) {
    switch (key.name) {
        case 'q':
        case 'escape':
            process.exit(0)
        case 'left':
            center_move(-SHIFT, 0)
            break
        case 'right':
            center_move(SHIFT, 0)
            break
        case 'up':
            center_move(0, -SHIFT)
            break
        case 'down':
            center_move(0, SHIFT)
            break
        case 'z':
            change_zoom(-1)
            break
        case 'a':
            change_zoom(1)
            break
        case 'c':
            if (key.ctrl) {
                process.exit(0)
            }
            change_quant()
            break
        default:
            console.log(key)
            break
    }
}

let trans = new Transformation(4 / TILE_SIZE, MAP_SIZE[0] / TILE_SIZE,
    4 / TILE_SIZE, MAP_SIZE[1] / TILE_SIZE)

class Base {
    canvas: Canvas
    scale: number
    zoom: number
    loaded: any;
    constructor(scale: number, zoom: number) {
        this.scale = scale
        this.zoom = zoom
        this.setZoom(zoom)
    }
    getTileScale() {
        return 2 ** this.zoom
    }
    setZoom(zoom: number) {
        this.zoom = zoom
        let tile_scale = this.getTileScale()
        let nw0 = trans.transform(new Point(-6000, -5000), tile_scale)
        let se0 = trans.transform(new Point(6000, 5000), tile_scale)
        let tile_size = se0.subtract(nw0)
        let width = tile_size.x
        let height = tile_size.y
        this.loaded = {}
        this.canvas = createCanvas(width * this.scale, height * this.scale)
        const ctx = this.canvas.getContext('2d')
        ctx.fillStyle = "black"
        ctx.fillRect(0, 0, width * this.scale, height * this.scale)
    }
}

class Screen {
    swidth: number
    sheight: number
    map_size: Point
    scale: number
    tile_ul: Point
    base: Base
    q: RgbQuant
    palette: any
    map_bounds: Bounds
    map_center: Point
    constructor(sixel: any, base: Base) {
        this.swidth = sixel.width
        this.sheight = sixel.height
        this.base = base
        this.tile_ul = new Point(0, 0)
        this.map_center = new Point(0, 0)
        this.resize()
    }
    resize() {
        let tile_scale = this.base.getTileScale()
        let origin = trans.untransform([0, 0], tile_scale)
        this.map_size = trans.untransform([this.swidth, this.sheight], tile_scale)
        this.map_size = this.map_size.subtract(origin)
        this.q = new RgbQuant({ method: 2, colors: NUM_COLORS, initColors: NUM_COLORS })
        this.palette = undefined
        this.update_map_bounds()
    }
    update_map_bounds() {
        let half = this.map_size.divideBy(2)
        let ul = this.map_center.subtract(half)
        let lr = this.map_center.add(half)
        this.map_bounds = new Bounds(ul, lr)

        let { bounds, dx: cx, dy: cy } = MAP_BOUNDS.clamp(this.map_bounds)
        if (cx || cy) {
            this.map_center = this.map_center.add([cx, cy])
            this.map_bounds = bounds
        }
    }
}

async function update(screen: Screen) {
    let tile_center = trans.transform(screen.map_center, screen.base.getTileScale())
    let sixel_dims = new Point(screen.swidth, screen.sheight)

    let tile_ul = tile_center.subtract(sixel_dims.divideBy(2)).floor()
    let scale = screen.base.scale
    tile_ul = tile_ul.scaleBy([scale, scale])
    screen.tile_ul = tile_ul

    await draw_tiles(screen)
}


function now() { return performance.now() }

async function draw_tiles(screen: Screen) {
    let z = screen.base.zoom
    let t0 = now()
    for (let i = 0; i < 2 ** z; i += 1) {
        for (let j = 0; j < 2 ** z; j += 1) {
            let coords = { x: i, y: j, z: z }
            let key = `${i}:${j}:${z}`
            // Skip if tile already loaded
            if (screen.base.loaded[key]) { continue }

            // Tile Map Bounds
            let ts = screen.base.getTileScale()
            let ul = trans.untransform(new Point(i * 256, j * 256), ts)
            let lr = trans.untransform(new Point((i + 1) * 256, (j + 1) * 256), ts)
            let tile_bounds = new Bounds(ul, lr)
            // Make sure tile is within greater MAP_BOUNDS and within the screen
            if (!tile_bounds.overlaps(MAP_BOUNDS)) { continue }
            if (!tile_bounds.overlaps(screen.map_bounds)) { continue }

            screen.base.loaded[key] = true
            await add_image(coords, screen.base.canvas, screen.base.scale)
        }
    }
    // Get current zoom level full map / canvas (of loaded tiles)
    const canvas = screen.base.canvas
    const ctx = canvas.getContext('2d');

    // Get terminal size
    const W = Math.floor(screen.swidth * screen.base.scale)
    const H = Math.floor(screen.sheight * screen.base.scale)

    // Grab data from current zoom level map / canvas
    const data = ctx.getImageData(screen.tile_ul.x, screen.tile_ul.y, W, H).data;

    const q = screen.q

    // If pallette is undefined, quantize and create palette
    if (screen.palette == undefined) {
        q.sample(data)
        screen.palette = q.palette(true)
    }
    // Create indexed image
    let index = q.reduce(data, 1)

    // Text for bottom of screen
    let controls = `zoom: [a,z] pan: [←↑→↓] color: [c] quit: [q,esc]`
    let c = screen.map_center
    let text = `${c.x.toFixed(2)} ${c.y.toFixed(2)} ${screen.base.zoom} ${controls}`

    // Serialize image data to sixel format and write to screen
    const backgroundSelect = 0
    const rasterAttributes = true
    const FINALIZER = '\x1b\\';

    process.stdout.write(
        '\x1B[3J' + '\n' +
        `\x1bP0;${backgroundSelect};q` +
        sixelEncode(index, W, H, screen.palette, rasterAttributes) +
        FINALIZER + "\n" + text
    )
}

async function center_move(dx: number, dy: number) {
    //console.log('center_move', dx, dy, screen.map_center)
    screen.map_center = screen.map_center.add([dx, dy])
    //console.log('           ', dx, dy, screen.map_center)
    screen.update_map_bounds()
    await update(screen)
}

async function change_zoom(dz) {
    let zoom = Math.min(7, Math.max(1, screen.base.zoom + dz))
    screen.base.setZoom(zoom)
    screen.resize()
    await update(screen)
}
async function change_quant() {
    screen.resize()
    await update(screen)
}

const base_canvas = new Base(SCALE, ZOOM)
let screen = new Screen(sixel, base_canvas)


initKeyboard()
center_move(0, 0)
