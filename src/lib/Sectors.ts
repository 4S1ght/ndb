
import Buffers from './Buffers.js'

// ---

const SECTOR_MIN_SIZE = 512

// ---

type SectorSize = 512 | 1024 | 2048 | 4096 | 8192 | 16384 | 32768 | 65536;

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
    vPatch: number,
    /** Database name, comment, id, etc. A string used to identify the database if the file name was to change. */
    comment?: string,
}

export function encodeDescriptorSector(data: DescriptorSector): Buffer {

    let bytes: Buffer[] = []

    bytes[0] =  Buffers.uInt16(data.sectorSize)
    bytes[1] =  Buffers.uInt32(data.timestamp)
    bytes[2] =  Buffers.int8(data.vMajor)
    bytes[3] =  Buffers.int8(data.vMinor)
    bytes[4] =  Buffers.int8(data.vPatch)
    bytes[5] =  Buffers.string(64, data.comment || '')

    return Buffer.concat(bytes)

}

export function decodeDescriptorSector(buffer: Buffer): DescriptorSector {

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
    2B  16-bit   |   15B   |   Int          |   Title length     |   Tells how many bytes are taken by the document title 
    2B  16-bit   |   17B   |   Int          |   Content length   |   Specifies content byte length ()
    47B          |   64B   |   Reserved         
    
    -------------------------------------------------------------------------------------------------------------------------
*/
export interface HeadSector {
}
