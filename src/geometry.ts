export class Point {
    x: number
    y: number
    constructor(x: number | Point | number[], y: number | undefined) {
        //console.log('new Point', x, y)
        if (x instanceof Point) {
            this.y = x.y
            this.x = x.x
        } else if (Array.isArray(x) && x.length == 2) {
            this.x = x[0]
            this.y = x[1]
        } else {
            this.x = x as number
            this.y = y
        }
        //console.log('  =>', this)
    }
    unscaleBy(scale: Point | number[]) {
        let p = new Point(scale)
        return new Point(this.x / p.x, this.y / p.y)
    }
    scaleBy(scale: Point | number[]) {
        let p = new Point(scale)
        return new Point(this.x * p.x, this.y * p.y)
    }
    floor() {
        return new Point(Math.floor(this.x), Math.floor(this.y))
    }
    ceil() {
        return new Point(Math.ceil(this.x), Math.ceil(this.y))
    }
    subtract(pt: Point | number[]) {
        let p = new Point(pt)
        return new Point(this.x - p.x, this.y - p.y)
    }
    add(pt: Point | number[]) {
        let p = new Point(pt)
        return new Point(this.x + p.x, this.y + p.y)
    }
    divideBy(scale: number) {
        return new Point(this.x / scale, this.y / scale)
    }
}

export class Transformation {
    a: number
    b: number
    c: number
    d: number
    constructor(a: number, b: number, c: number, d: number) {
        this.a = a
        this.b = b
        this.c = c
        this.d = d
    }
    transform(point: Point, scale: number) {
        point = new Point(point)
        return this._transform(point, scale)
    }
    _transform(point: Point, scale: number) {
        point = new Point(point)
        //console.log('Transformation._transform', point, scale)
        return new Point(
            scale * (this.a * point.x + this.b),
            scale * (this.c * point.y + this.d),
        )
    }
    untransform(point: Point, scale: number) {
        point = new Point(point)
        return new Point(
            (point.x / scale - this.b) / this.a,
            (point.y / scale - this.d) / this.c,
        )
    }
}

export class Bounds {
    min: Point
    max: Point
    constructor(min: Point, max: Point) {
        this.min = min
        this.max = max
    }
    overlaps(bounds: Bounds) {
        let b = bounds
        let min = this.min
        let max = this.max
        let min2 = b.min
        let max2 = b.max

        let xoverlaps = (max2.x > min.x) && (min2.x < max.x)
        let yoverlaps = (max2.y > min.y) && (min2.y < max.y)

        return xoverlaps && yoverlaps
    }
    contains(obj: Point | Bounds) {
        let min: Point;
        let max: Point

        if (obj instanceof Bounds) {
            min = obj.min;
            max = obj.max;
        } else {
            min = max = obj;
        }

        return (min.x >= this.min.x) &&
            (max.x <= this.max.x) &&
            (min.y >= this.min.y) &&
            (max.y <= this.max.y);
    }
    add(dx: number, dy: number) {
        return new Bounds(this.min.add([dx, dy]), this.max.add([dx, dy]))
    }
    clamp(obj: Bounds) {
        if (this.contains(obj)) {
            return { bounds: obj, dx: 0, dy: 0 }
        }
        let dx = 0
        let dy = 0
        let w0 = this.max.x - this.min.x
        let h0 = this.max.y - this.min.y
        let w1 = obj.max.x - obj.min.x
        let h1 = obj.max.y - obj.min.y
        if (w0 > w1) {
            if (obj.min.x < this.min.x) {
                dx = this.min.x - obj.min.x
            } else if (obj.max.x > this.max.x) {
                dx = this.max.x - obj.max.x
            }
        } else {
            let cx0 = this.min.x + w0 / 2
            let cx1 = obj.min.x + w1 / 2
            dx = cx0 - cx1
        }
        if (h0 > h1) {
            if (obj.min.y < this.min.y) {
                dy = this.min.y - obj.min.y
            } else if (obj.max.y > this.max.y) {
                dy = this.max.y - obj.max.y
            }
        } else {
            let cy0 = this.min.y + h0 / 2
            let cy1 = obj.min.y + h1 / 2
            dy = cy0 - cy1
        }
        if (dx || dy) {
            obj = obj.add(dx, dy)
        }
        return { bounds: obj, dx, dy }
    }

}
