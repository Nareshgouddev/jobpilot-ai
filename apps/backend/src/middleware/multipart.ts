import type { Request, Response, NextFunction } from "express";
import formidable from "formidable";
import createHttpError from "http-errors";

export interface MultipartField {
  name: string;
  value: string;
}

export interface MultipartFile {
  originalFilename: string;
  filepath: string;
  mimetype: string;
  size: number;
}

export interface ParsedMultipart {
  fields: Record<string, MultipartField | MultipartField[]>;
  files: Record<string, MultipartFile | MultipartFile[]>;
}

declare global {
  namespace Express {
    interface Request {
      parsedMultipart?: ParsedMultipart;
    }
  }
}

const ONE_MEGABYTE = 1 * 1024 * 1024;
const TEN_MEGABYTES = 10 * ONE_MEGABYTE;

export function parseMultipart(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const contentType = req.headers["content-type"] ?? "";

  if (!contentType.includes("multipart/form-data")) {
    next(createHttpError(415, "Content-Type must be multipart/form-data"));
    return;
  }

  const form = formidable({
    maxFileSize: TEN_MEGABYTES,
    maxFiles: 1,
    filter: ({ mimetype }) => mimetype === "application/pdf"
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      if (err.code === 101) {
        next(createHttpError(413, "File size exceeds 10MB limit"));
        return;
      }
      if (err.code === 100) {
        next(createHttpError(400, "Too many fields"));
        return;
      }
      next(createHttpError(400, `File upload error: ${err.message}`));
      return;
    }

    // Normalize fields: flatten single-value arrays
    const normalizedFields: Record<string, MultipartField | MultipartField[]> = {};
    for (const [key, value] of Object.entries(fields)) {
      normalizedFields[key] = Array.isArray(value)
        ? value.map((v) => ({ name: key, value: v }))
        : { name: key, value };
    }

    // Normalize files: extract first file from array
    const normalizedFiles: Record<string, MultipartFile | MultipartFile[]> = {};
    for (const [key, value] of Object.entries(files)) {
      const file = (value as formidable.File[])[0];
      if (!file) continue;
      normalizedFiles[key] = {
        originalFilename: file.originalFilename ?? file.newFilename,
        filepath: file.filepath,
        mimetype: file.mimetype ?? "application/octet-stream",
        size: file.size
      };
    }

    req.parsedMultipart = {
      fields: normalizedFields,
      files: normalizedFiles
    };
    next();
  });
}
