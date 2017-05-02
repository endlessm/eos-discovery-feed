// test/testDiscoveryFeed.js
//
// Copyright (c) 2017 Endless Mobile Inc.
//
// This contains some tests for the discovery feed
/* eslint-env jasmine */

const TextSanitization = imports.textSanitization;

describe('Discovery Feed', function() {
    describe('synopsis sanitizer', function() {
        it('removes square brackets with numbers', function() {
            expect(TextSanitization.synopsis('Foo [1] bar.')).toEqual('Foo bar.');
        });
        it('removes content in parens', function() {
            expect(TextSanitization.synopsis('Foo (content) bar.')).toEqual('Foo bar.');
        });
        it('only shows the first two sentences', function() {
            let input = 'Foo bar. Foo bar. Foo bar.';
            expect(TextSanitization.synopsis(input)).toEqual('Foo bar. Foo bar.');
        });
    });
});
