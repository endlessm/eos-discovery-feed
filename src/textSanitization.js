// src/textSanitization.js
//
// Copyright (c) 2016-2017 Endless Mobile Inc.
//
// Contains routines for sanitizing text blurbs that come to the feed.

//
// synopsis
//
// Sanitize a provided synopsis provided from an article. Remove references
// and other uninteresting information. Truncate to a few sentences.
//
// @param {string} synopsis - The synopsis to sanitize.
// @returns {string} A sanitized synopsis.
function synopsis(synopsis) {  // eslint-disable-line no-unused-vars
    if (!synopsis.trim()) {
        return '';
    }

    // Square brackets with numbers are just references
    synopsis = synopsis.replace(/\[\d+\]/g, '').trim();
    // Typically the things found in parens are alternatve pronunciations
    // or translations.
    synopsis = synopsis.replace(/\(.*?\)/g, '').trim();
    // Only show the first two sentences.
    synopsis = synopsis.split('.').slice(0, 2).filter(s => s.length > 0).join('.') + '.';
    // Normalize whitespace
    synopsis = synopsis.replace(/\s+/g, ' ').trim();
    return synopsis;
}
