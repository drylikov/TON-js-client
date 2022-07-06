import { BitString, BitStringReader, Cell, parseDict } from "..";

export class Slice {

    static fromCell(cell: Cell) {
        return new Slice(cell.bits, cell.refs);
    }

    private readonly sourceBits: BitString;
    private readonly bits: BitStringReader;
    private readonly refs: Cell[] = [];

    private constructor(sourceBits: BitString, sourceRefs: Cell[]) {
        this.sourceBits = sourceBits.clone();
        this.refs = [...sourceRefs];
        this.bits = new BitStringReader(this.sourceBits);
    }

    skip = (bits: number) => {
        this.bits.skip(bits);
    }

    readUint = (bits: number) => {
        return this.bits.readUint(bits);
    }

    readUintNumber = (bits: number) => {
        return this.bits.readUintNumber(bits);
    }

    readInt = (bits: number) => {
        return this.bits.readInt(bits);
    }

    readIntNumber = (bits: number) => {
        return this.bits.readIntNumber(bits);
    }

    readBuffer = (size: number) => {
        return this.bits.readBuffer(size);
    }

    readBit = () => {
        return this.bits.readBit();
    }

    readCoins = () => {
        return this.bits.readCoins();
    }

    readVarUInt = (headerBits: number) => {
        return this.bits.readVarUInt(headerBits);
    }

    readVarUIntNumber = (headerBits: number) => {
        return this.bits.readVarUIntNumber(headerBits);
    }

    readRemaining = () => {
        return this.bits.readRemaining();
    }

    readAddress = () => {
        return this.bits.readAddress();
    }

    readUnaryLength = () => {
        return this.bits.readUnaryLength();
    }

    readOptDict = <T>(keySize: number, extractor: (slice: Slice) => T) => {
        if (this.readBit()) {
            return this.readDict(keySize, extractor);
        } else {
            return null;
        }
    }

    readDict = <T>(keySize: number, extractor: (slice: Slice) => T) => {
        let first = this.refs.shift();
        if (first) {
            return parseDict(first.beginParse(), keySize, extractor);
        } else {
            throw Error('No ref');
        }
    }

    readRef = () => {
        let first = this.refs.shift()
        if (first) {
            return Slice.fromCell(first);
        } else {
            throw Error('No ref');
        }
    }

    readCell = () => {
        let first = this.refs.shift()
        if (first) {
            return first;
        } else {
            throw Error('No ref');
        }
    }

    clone = () => {

        // Copy remaining
        const cloned = this.sourceBits.clone();
        const reader = new BitStringReader(cloned);
        reader.skip(this.bits.currentOffset);
        const remaining = reader.readRemaining();
        const remainingRefs = [...this.refs];

        // Build slice
        return new Slice(remaining, remainingRefs);
    }

    toCell = () => {
        // Copy remaining
        const cloned = this.sourceBits.clone();
        const reader = new BitStringReader(cloned);
        reader.skip(this.bits.currentOffset);
        const remaining = reader.readRemaining();

        let cell = new Cell(false, remaining);
        for (let r of this.refs) {
            cell.refs.push(r);
        }
        return cell;
    }
}