import "@testing-library/jest-dom";

const { TextDecoder, TextEncoder } = require("util");

global.TextEncoder = global.TextEncoder || TextEncoder;
global.TextDecoder = global.TextDecoder || TextDecoder;
