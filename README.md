# objmap-term

BotW Object Map inside a terminal

Proof of concept, use the actual objmap at https://objmap.zeldamods.org/

If you find a use for this let me know

Image tiles are loaded from the same source.

Currently it only loads the map and lets you pan / zoom around

Much of the tile handling was *borrowed* from the objmap and the
leaflet library. In particular the geometries, Point and Bounds, along
with the Transformation. https://leafletjs.com/

## Running

    npm install
    npm run map

    # or

    node ./src/objmap.ts

### Scaling
Scaling of the images to the terminal might be off. You can adjust this by changing the value to an appropriate value in `src/objmap.ts`

    SCALE = 2

My terminal reported a image size of the terminal that was half the actual size.

## Requirements

- node
- terminal that supports the sixel image format
  - See https://www.arewesixelyet.com/
  - See https://en.wikipedia.org/wiki/Sixel

## License

BSD 2-Clause
