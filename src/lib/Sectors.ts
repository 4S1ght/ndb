
import Buffers from "./Buffers.js";
import fs from 'fs';
import path from "path";
import { SectorEncodingError } from "./Errors.js";

// ---

type SectorSize = 512 | 1024 | 2048 | 4096 | 8192 | 16384 | 32768 | 65536;

export interface DescriptorSector {
    /** Identifies used sector size */
    sectorSize: SectorSize
    /** Database creation timestamp (UNIX) */
    timestamp: number
    /** Major driver version. */
    vMajor: number
    /** Minor driver version. */
    vMinor: number
    /** Patch driver version. */
    vPatch: number
    /** Database name, comment, id, etc. A string used to identify the database if the file name was to change. */
    comment?: string
}

export interface HeadSector {
    /** Sector creation date. */
    created: number
    /** Document modification date. Changes every time the document is being changed. */
    modified: number
    /** The address of the next document sector. The value is set to ZERO if in the last sector in the chain. */
    nextSector: number
    /** Document title. */
    title: string
    /** 
     * Raw document data stored in the sector. 
     * If the document title takes up the entire length of the head sector then the content buffer
     * can be ommitted, as it's impossible to allocate 0 bytes to a buffer.
     * */
    content?: Buffer
}

export interface TailSector {
    /** The address of the next document sector. The value is set to ZERO if in the last sector in the chain. */
    nextSector: number
    /** Raw document data stored in the sector. */
    content: Buffer
}

interface SectorSettings {
    /** Specifies sector size. */
    sectorSize: SectorSize
}

export default class Sectors {

    constructor(p: SectorSettings) {
        this.SECTOR_SIZE = p.sectorSize
    }

    public SECTOR_SIZE: SectorSize
    public HEAD_META_SIZE = 64
    public get MAX_TITLE_SIZE()   { return this.SECTOR_SIZE - this.HEAD_META_SIZE     }
    public get MAX_CONTENT_SiZE() { return this.SECTOR_SIZE - this.HEAD_META_SIZE - 1 }

    /**
        DESCRIPTOR SECTOR (512 bytes fixed)
        ----------------------------------------------------------------------------------------------------------
        2B   |   2B    |   Int   |   Identifies used sector size
        4B   |   6B    |   Int   |   UNIX database creation timestamp
        1B   |   7B    |   Int   |   Major driver version used
        1B   |   8B    |   Int   |   Minor -//-
        1B   |   9B    |   Int   |   Patch -//-
        64B  |   73B   |   Int   |   Database name - A string used for identification since file names can change.
        ----------------------------------------------------------------------------------------------------------
    */
    public static encodeDescriptorSector(data: DescriptorSector): Buffer {

        let bytes: Buffer[] = []
    
        bytes[0] =  Buffers.uInt16(data.sectorSize)
        bytes[1] =  Buffers.uInt32(data.timestamp)
        bytes[2] =  Buffers.int8(data.vMajor)
        bytes[3] =  Buffers.int8(data.vMinor)
        bytes[4] =  Buffers.int8(data.vPatch)
        bytes[5] =  Buffers.string(data.comment || '')
    
        return Buffers.toLength(Buffer.concat(bytes), 512)

    }

    public static decodeDescriptorSector(buffer: Buffer): DescriptorSector {

        // @ts-ignore
        let data: DescriptorSector = {}
    
        data.sectorSize     = Buffers.readUInt16(buffer, 0) as SectorSize
        data.timestamp      = Buffers.readUInt32(buffer, 2)
        data.vMajor         = Buffers.readInt8(buffer, 6)
        data.vMinor         = Buffers.readInt8(buffer, 7)
        data.vPatch         = Buffers.readInt8(buffer, 8)
        data.comment        = Buffers.readString(buffer, 9, 73)
    
        return data

    }
    
    /**
        HEAD SECTOR (512B - 65kB)
        -------------------------------------------------------------------------------------------------------------------------
        1B  8-bit    |   1B    |   Int (bool)   |   Sector type      |   Identifies head/chain sectors
        4B  32-bit   |   5B    |   Int          |   UNIX timestamp   |   Document creation time
        4B  32-bit   |   9B    |   Int          |   UNIX timestamp   |   Document modification time 
        4B  32-Bit   |   13B   |   Int          |   Pointer          |   Address of the next document sector
        2B  16-bit   |   15B   |   Int          |   Title length     |   Specifies bytes used for doc title
        2B  16-bit   |   17B   |   Int          |   Content length   |   Specifies content byte length
        47B          |   64B   |   Reserved         
        -------------------------------------------------------------------------------------------------------------------------
    */
    public encodeHeadSector(data: HeadSector): Buffer {

        let meta: Buffer[] = []
    
        meta[0] = Buffers.boolean(true)
        meta[1] = Buffers.uInt32(data.created)
        meta[2] = Buffers.uInt32(data.modified)
        meta[3] = Buffers.uInt32(data.nextSector)
        meta[4] = Buffers.uInt16(data.title.length) // Expects a sanitized string (single byte chars only)
        meta[5] = Buffers.uInt16(data.content ? data.content.byteLength : 0)
    
        const metaBytes  = Buffers.toLength(Buffers.concat(meta), this.HEAD_META_SIZE)
        const titleBytes = Buffers.string(data.title)
    
        let content: Buffer[] = [metaBytes, titleBytes]
        if (data.content && data.title.length + this.HEAD_META_SIZE < this.SECTOR_SIZE) content.push(data.content)
    
        return Buffers.toLength(Buffers.concat(content), this.SECTOR_SIZE)

    }
    
    public decodeHeadSector(buffer: Buffer): HeadSector {
    
        // @ts-ignore
        let data: HeadSector = {}
    
        data.created    = Buffers.readUInt32(buffer, 1)
        data.modified   = Buffers.readUInt32(buffer, 5)
        data.nextSector = Buffers.readUInt32(buffer, 9)
    
        const titleLength   = Buffers.readUInt16(buffer, 13)
        const contentLength = Buffers.readUInt16(buffer, 15)

        const titleStart = this.HEAD_META_SIZE
        const titleEnd = this.HEAD_META_SIZE + titleLength
        data.title = Buffers.readString(buffer, titleStart, titleEnd)

        const contentStart = this.HEAD_META_SIZE + titleLength
        const contentEnd = contentStart + contentLength
        data.content = buffer.subarray(contentStart, contentEnd)
    
        return data

    }
    

    /**
        TAIL SECTOR (512B - 65kB)
        -------------------------------------------------------------------------------------------------------------------------
        1B  8-bit    |   1B    |   Int (bool)   |   Sector type      |   Identifies head/chain sectors
        4B  32-Bit   |   5B    |   Int          |   Pointer          |   Address of the next document sector
        2B  16-bit   |   7B    |   Int          |   Content length   |   Specifies content byte length as it might be shorter
        9B           |   16B   |   Reserved                              than the fixed sector length
        -------------------------------------------------------------------------------------------------------------------------
    */

    public encodeTailSector(data: TailSector): Buffer {

        let bytes: Buffer[] = []

        bytes[0] = Buffers.boolean(false)
        bytes[1] = Buffers.uInt32(data.nextSector)

        return Buffers.concat(bytes)

    }

}


const x = new Sectors({
    sectorSize: 512
})

const head = x.encodeHeadSector({
    created: Date.now()/1000,
    modified: Date.now()/1000,
    nextSector: 1234,
    title: new Array(512-64).fill('-').join('')
})
console.log(head)
console.log(head.toString('base64'))

const headData = x.decodeHeadSector(head)
console.log(headData)
console.log(headData.content?.toString())