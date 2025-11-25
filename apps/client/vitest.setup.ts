/**
 * Vitest Setup File
 *
 * Polyfills for jsdom environment to support File/Blob APIs
 * See: https://github.com/jsdom/jsdom/issues/3206
 */

import { Blob as BlobPolyfill, File as FilePolyfill } from "node:buffer";
import "@testing-library/jest-dom/vitest";

// Override jsdom's incomplete Blob/File with Node.js native implementations
// Node.js 18+ has native Blob/File support with arrayBuffer() method
global.Blob = BlobPolyfill as any;
global.File = FilePolyfill as any;
