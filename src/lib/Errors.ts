
const c = {
    _reset: "\x1b[0m",
    _red: "\x1b[31m",
    _blue: "\x1b[34m",
    _green: "\x1b[32m",
    _yellow: "\x1b[33m",
    red: (s: string) => `${c._red}${s}${c._reset}`,
    blue: (s: string) => `${c._blue}${s}${c._reset}`,
    green: (s: string) => `${c._green}${s}${c._reset}`,
    yellow: (s: string) => `${c._yellow}${s}${c._reset}`
}

// ------------------------------------------------------------


export class NDBError extends Error {

    public name: string;
    public message: string;
    public declare trace: string;

    constructor(message: string, details?: string, templates?: (string | number)[]) {
        super()
        // Capture stack trace leading to this error
        Error.captureStackTrace(this, this.constructor)
        this.name = c.red(this.constructor.name)
        this.message = message

        if (details) this.message = `${this.message}\n\nDetails:\n${c.blue(details)}\n\nStack:`
        else         this.message = `${this.message}\n\nStack:`

        if (templates) templates.forEach((template, i) => {
            this.message = this.message.replace(new RegExp(`%${i}`, 'g'), template + '')
        })
    }
}

// ------------------------------------------------------------

/**
 * Sector encoding errors.
 */
export class SectorEncodingError extends NDBError {

    constructor(message: string, details?: string, templates?: (string | number)[]) {
        super(message, details, templates);
        Error.captureStackTrace(this, this.constructor);
        this.name = c.red(this.constructor.name);
    }

    public static titleByteOverflow: [string, string] = [
        `Message`,
        `Description`
    ]

}

