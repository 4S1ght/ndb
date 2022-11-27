
export default class Buffers extends Buffer {

    // =============================
    // Encoders
    // =============================

    /** Returns a `32-Bit` little-endian unsigned int buffer. */
    public static uInt32(value: number) {
        const mem = this.alloc(4)
        mem.writeUInt32LE(value)
        return mem
    }

    /** Returns a `16-Bit` little-endian unsigned int buffer. */
    public static uInt16(value: number) {
        const mem = this.alloc(2)
        mem.writeUInt16LE(value)
        return mem
    }

    /** Returns a `16-Bit` unsigned int buffer. */
    public static int8(byte: number) {
        const mem = this.alloc(1)
        mem.writeUInt8(byte)
        return mem
    }
    
    /** Returns a UTF-8 enoded string buffer. Expect single-byte characters only. */
    public static string(string: string) {
        const buffer = this.alloc(string.length)
        buffer.write(string, 'utf-8')
        return buffer
    }

    /** Returns an 8-bit UInt buffer ranging between 0 (false) and 1 (true). */
    public static boolean (value: boolean) {
        const mem = this.alloc(1)
        mem.writeUInt8(value ? 1 : 0);
        return mem;
    }

    /** Ensures a buffer has proper length and adds empty padding at the end. */
    public static toLength(buffer: Buffer, length: number) {
        const l = length - buffer.byteLength;
        if (l < 0) return buffer;
        return this.concat([buffer, this.alloc(l)])
    }
        

    /** Returns a null (empty) buffer */
    public static null = (bytes: number) => this.alloc(bytes)

    // =============================
    // Filters
    // =============================

    /**
     * Filters out all milti-byte characters like emojis, mathematical 
     * symbols and alike for storing text in fixed length buffers.
     */
    public static filterMultibyteUTF8Chars = (string: string) => 
        string.length !== this.byteLength(string)
            ? string.split('').filter(char => this.byteLength(char) === 1).join('')
            : string
    
    // =============================
    // Readers
    // =============================

    /** Reads out a UTF-8 string from a given range of bytes. */
    public static readString = (data: Buffer, start: number, end: number): string =>
        data.subarray(start, end).toString('utf-8').replace(/\uFFFD|\u0000/g, '')

    /** Reads out a 32-bit unsigned intiger from a given range of bytes. */
    public static readUInt32 = (data: Buffer, address: number): number =>
        data.subarray(address, address+4).readUint32LE()

    /** Reads out a 16-bit unsigned intiger from a given range of bytes. */
    public static readUInt16 = (data: Buffer, address: number): number =>
        data.subarray(address, address+2).readUint16LE()

    /** Reads out a 8-bit unsigned intiger from a given byte.. */
    public static readInt8 = (data: Buffer, address: number): number =>
        data.readUint8(address)

    /** Reads out a boolean value from a given byte. The intiger value must range between 0 (false) and 1 (true). */
    public static readBoolean = (data: Buffer, address: number): boolean =>
        Boolean(data.readUint8(address))
}
