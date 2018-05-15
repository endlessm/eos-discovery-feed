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
        it('only shows the first two sentences if the text is longer than 60 chars', function() {
            let input = 'Foo bar. Foo bar. Foo bar' + Array(60).join('x');
            expect(TextSanitization.synopsis(input)).toEqual('Foo bar. Foo bar.');
        });
        it('shows the first N sentences under 60 chars', function() {
            let input = Array(10).join('Foo bar. ').trim();
            expect(TextSanitization.synopsis(input)).toEqual(Array(7).join('Foo bar. ').trim());
        });
        it('does not insert a final period on empty strings', function() {
            let input = '';
            expect(TextSanitization.synopsis(input)).toEqual('');
        });
    });
});
