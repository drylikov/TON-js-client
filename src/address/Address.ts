import inspectSymbol from 'symbol.inspect';

const bounceable_tag = 0x11;
const non_bounceable_tag = 0x51;
const test_flag = 0x80;

function crc16(data: Buffer) {
    const poly = 0x1021;
    let reg = 0;
    const message = Buffer.alloc(data.length + 2);
    message.set(data);
    for (let byte of message) {
        let mask = 0x80;
        while (mask > 0) {
            reg <<= 1;
            if (byte & mask) {
                reg += 1;
            }
            mask >>= 1
            if (reg > 0xffff) {
                reg &= 0xffff;
                reg ^= poly;
            }
        }
    }
    return Buffer.from([Math.floor(reg / 256), reg % 256]);
}

function parseFriendlyAddress(src: string | Buffer) {
    const data = Buffer.isBuffer(src) ? src : Buffer.from(src, 'base64');

    // 1byte tag + 1byte workchain + 32 bytes hash + 2 byte crc
    if (data.length !== 36) {
        throw new Error('Unknown address type: byte length is not equal to 36');
    }

    // Prepare data
    const addr = data.slice(0, 34);
    const crc = data.slice(34, 36);
    const calcedCrc = crc16(addr);
    if (!(calcedCrc[0] === crc[0] && calcedCrc[1] === crc[1])) {
        throw new Error('Invalid checksum: ' + src);
    }

    // Parse tag
    let tag = addr[0];
    let isTestOnly = false;
    let isBounceable = false;
    if (tag & test_flag) {
        isTestOnly = true;
        tag = tag ^ test_flag;
    }
    if ((tag !== bounceable_tag) && (tag !== non_bounceable_tag))
        throw "Unknown address tag";

    isBounceable = tag === bounceable_tag;

    let workchain = null;
    if (addr[1] === 0xff) { // TODO we should read signed integer here
        workchain = -1;
    } else {
        workchain = addr[1];
    }

    const hashPart = addr.slice(2, 34);

    return { isTestOnly, isBounceable, workchain, hashPart };
}


export class Address {

    static isFriendly(source: String) {
        return source.indexOf(':') < 0;
    }

    static normalize(source: string | Address) {
        if (typeof source === 'string') {
            return Address.parse(source).toFriendly();
        } else {
            return source.toFriendly();
        }
    }

    static parse(source: string) {
        if (Address.isFriendly(source)) {
            return this.parseFriendly(source).address;
        } else {
            return this.parseRaw(source);
        }
    }

    static parseRaw(source: string) {
        let workChain = parseInt(source.split(":")[0]);
        let hash = Buffer.from(source.split(":")[1], 'hex');
        return new Address(workChain, hash);
    }

    static parseFriendly(source: string | Buffer) {
        if (Buffer.isBuffer(source)) {
            let r = parseFriendlyAddress(source);
            return {
                isBounceable: r.isBounceable,
                isTestOnly: r.isTestOnly,
                address: new Address(r.workchain, r.hashPart)
            };
        } else {
            let addr = source.replace(/\-/g, '+').replace(/_/g, '\/'); // Convert from url-friendly to true base64
            let r = parseFriendlyAddress(addr);
            return {
                isBounceable: r.isBounceable,
                isTestOnly: r.isTestOnly,
                address: new Address(r.workchain, r.hashPart)
            };
        }
    }

    readonly workChain: number;
    readonly hash: Buffer;

    constructor(workChain: number, hash: Buffer) {
        this.workChain = workChain;
        this.hash = hash;
        Object.freeze(this);
    }

    toString = () => {
        return this.workChain + ':' + this.hash.toString('hex');
    }

    equals(src: Address) {
        if (src.workChain !== this.workChain) {
            return false;
        }
        return src.hash.equals(this.hash);
    }

    toBuffer = () => {
        const addressWithChecksum = Buffer.alloc(36);
        addressWithChecksum.set(this.hash);
        addressWithChecksum.set([this.workChain, this.workChain, this.workChain, this.workChain], 32);
        return addressWithChecksum;
    }

    toFriendlyBuffer = (args?: { bounceable?: boolean, testOnly?: boolean }) => {
        let testOnly = (args && args.testOnly !== undefined) ? args.testOnly : false;
        let bounceable = (args && args.bounceable !== undefined) ? args.bounceable : true;

        let tag = bounceable ? bounceable_tag : non_bounceable_tag;
        if (testOnly) {
            tag |= test_flag;
        }

        const addr = Buffer.alloc(34);
        addr[0] = tag;
        addr[1] = this.workChain;
        addr.set(this.hash, 2);
        const addressWithChecksum = Buffer.alloc(36);
        addressWithChecksum.set(addr);
        addressWithChecksum.set(crc16(addr), 34);
        return addressWithChecksum;
    }

    toFriendly = (args?: { urlSafe?: boolean, bounceable?: boolean, testOnly?: boolean }) => {
        let urlSafe = (args && args.urlSafe !== undefined) ? args.urlSafe : true;
        let buffer = this.toFriendlyBuffer(args);
        if (urlSafe) {
            return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
        } else {
            return buffer.toString('base64');
        }
    }

    [inspectSymbol] = () => this.toFriendly()
}