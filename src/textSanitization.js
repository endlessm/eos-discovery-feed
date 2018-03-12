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

const EosDiscoveryFeed = imports.gi.EosDiscoveryFeed;

function synopsis(synopsis) {  // eslint-disable-line no-unused-vars
    return EosDiscoveryFeed.sanitize_synopsis(synopsis);
}
