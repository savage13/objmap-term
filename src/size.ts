
const CONTROL = "\x1b["
const TERM_SIZE = "18t"
const SIXEL_AREA = "14t"
const SIXEL_CHAR_SIZE = "16t"


export function query_terminal_callback(KEY: string, callback: Function) {
    process.stdin.setRawMode(true);
    process.stdin.once("data", function(data: any) {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        callback(data);
    });
    process.stdout.write(`${CONTROL}${KEY}`) //\x1b[18t");
}

export function query_terminal(KEY: string) {
    return new Promise((resolve, _reject) => {
        process.stdin.setRawMode(true);
        process.stdin.once("data", function(data: any) {
            process.stdin.setRawMode(false);
            process.stdin.pause();
            resolve(data)
            //callback(data);
        });
        process.stdout.write(`${CONTROL}${KEY}`) //\x1b[18t");
    })
}

/*
query_terminal_callback(SIXEL_AREA, (out: any) => {
    let n = out.length
    //console.log(out)
    let tmp = out.slice(4, n - 1)
        .toString()
        .split(";")
        .map(v => parseInt(v))
    console.log(tmp)
    })
*/

export async function sixel_size() {
    let size: any = await query_terminal(SIXEL_AREA)
    let [height, width] =
        size.slice(4, -1).toString().split(";").map(v => parseInt(v))
    return { width, height }
}
