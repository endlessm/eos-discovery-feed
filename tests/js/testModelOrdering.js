// test/testModelOrdering.js
//
// Copyright (c) 2017 Endless Mobile Inc.
//
// This contains some tests for the model ordering component
// of the discovery feed.
/* eslint-env jasmine */

const ModelOrdering = imports.modelOrdering;
const Stores = imports.stores;

describe('Model ordering', function() {
    it('arranges sequential model types', function() {
        let models = [
            {
                knowledge_app_id: 'a',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                knowledge_app_id: 'b',
                type: Stores.CARD_STORE_TYPE_VIDEO_CARD
            },
            {
                knowledge_app_id: 'c',
                type: Stores.CARD_STORE_TYPE_NEWS_CARD
            },
            {
                knowledge_app_id: 'd',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            }
        ];
        let arranged = ModelOrdering.arrange(models);
        expect(arranged.map(m => m.type)).toEqual([
            Stores.CARD_STORE_TYPE_NEWS_CARD,
            Stores.CARD_STORE_TYPE_ARTICLE_CARD,
            Stores.CARD_STORE_TYPE_VIDEO_CARD,
            Stores.CARD_STORE_TYPE_ARTWORK_CARD
        ]);
    });
    it('adjusts the ordering of models on each iteration', function() {
        let models = [
            {
                knowledge_app_id: 'a',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                knowledge_app_id: 'b',
                type: Stores.CARD_STORE_TYPE_VIDEO_CARD
            },
            {
                knowledge_app_id: 'c',
                type: Stores.CARD_STORE_TYPE_NEWS_CARD
            },
            {
                knowledge_app_id: 'd',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            },
            {
                knowledge_app_id: 'e',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                knowledge_app_id: 'f',
                type: Stores.CARD_STORE_TYPE_VIDEO_CARD
            },
            {
                knowledge_app_id: 'g',
                type: Stores.CARD_STORE_TYPE_NEWS_CARD
            },
            {
                knowledge_app_id: 'h',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            }
        ];
        let arranged = ModelOrdering.arrange(models);
        expect(arranged.map(m => m.type)).toEqual([
            Stores.CARD_STORE_TYPE_NEWS_CARD,
            Stores.CARD_STORE_TYPE_ARTICLE_CARD,
            Stores.CARD_STORE_TYPE_VIDEO_CARD,
            Stores.CARD_STORE_TYPE_ARTWORK_CARD,
            Stores.CARD_STORE_TYPE_NEWS_CARD,
            Stores.CARD_STORE_TYPE_VIDEO_CARD,
            Stores.CARD_STORE_TYPE_ARTICLE_CARD,
            Stores.CARD_STORE_TYPE_ARTWORK_CARD
        ]);
    });
    it('handles running out of certain card types', function() {
        let models = [
            {
                knowledge_app_id: 'a',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                knowledge_app_id: 'b',
                type: Stores.CARD_STORE_TYPE_VIDEO_CARD
            },
            {
                knowledge_app_id: 'c',
                type: Stores.CARD_STORE_TYPE_NEWS_CARD
            },
            {
                knowledge_app_id: 'd',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            },
            {
                knowledge_app_id: 'f',
                type: Stores.CARD_STORE_TYPE_VIDEO_CARD
            },
            {
                knowledge_app_id: 'g',
                type: Stores.CARD_STORE_TYPE_NEWS_CARD
            }
        ];
        let arranged = ModelOrdering.arrange(models);
        expect(arranged.map(m => m.type)).toEqual([
            Stores.CARD_STORE_TYPE_NEWS_CARD,
            Stores.CARD_STORE_TYPE_ARTICLE_CARD,
            Stores.CARD_STORE_TYPE_VIDEO_CARD,
            Stores.CARD_STORE_TYPE_ARTWORK_CARD,
            Stores.CARD_STORE_TYPE_NEWS_CARD,
            Stores.CARD_STORE_TYPE_VIDEO_CARD
        ]);
    });
    it('repeats the same card type for different apps', function() {
        let models = [
            {
                knowledge_app_id: 'a',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                knowledge_app_id: 'b',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                knowledge_app_id: 'c',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            }
        ];
        let arranged = ModelOrdering.arrange(models);
        expect(arranged.map(m => m.type)).toEqual([
            Stores.CARD_STORE_TYPE_ARTWORK_CARD,
            Stores.CARD_STORE_TYPE_ARTWORK_CARD,
            Stores.CARD_STORE_TYPE_ARTWORK_CARD
        ]);
    });
    it('does not repeat the same card type for one app', function() {
        let models = [
            {
                knowledge_app_id: 'a',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                knowledge_app_id: 'a',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            }
        ];
        let arranged = ModelOrdering.arrange(models);
        expect(arranged.map(m => m.type)).toEqual([
            Stores.CARD_STORE_TYPE_ARTWORK_CARD
        ]);
    });
    it('eventually takes cards from the same app', function() {
        let models = [
            {
                knowledge_app_id: 'a',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                knowledge_app_id: 'a',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                knowledge_app_id: 'b',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                knowledge_app_id: 'b',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                knowledge_app_id: 'c',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                knowledge_app_id: 'c',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            }
        ];
        let arranged = ModelOrdering.arrange(models);
        expect(arranged.map(m => m.knowledge_app_id)).toEqual([
            'a', 'b', 'c', 'c'
        ]);
    });
    it('splices in word/quote card in second position', function() {
        let models = [
            {
                knowledge_app_id: 'word/quote',
                type: Stores.CARD_STORE_TYPE_WORD_QUOTE_CARD
            },
            {
                knowledge_app_id: 'a',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                knowledge_app_id: 'b',
                type: Stores.CARD_STORE_TYPE_VIDEO_CARD
            },
            {
                knowledge_app_id: 'c',
                type: Stores.CARD_STORE_TYPE_NEWS_CARD
            },
            {
                knowledge_app_id: 'd',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            }
        ];
        let arranged = ModelOrdering.arrange(models);
        expect(arranged.map(m => m.type)).toEqual([
            Stores.CARD_STORE_TYPE_NEWS_CARD,
            Stores.CARD_STORE_TYPE_ARTICLE_CARD,
            Stores.CARD_STORE_TYPE_WORD_QUOTE_CARD,
            Stores.CARD_STORE_TYPE_VIDEO_CARD,
            Stores.CARD_STORE_TYPE_ARTWORK_CARD
        ]);
    });
    it('appends installable apps to the end', function() {
        let models = [
            {
                knowledge_app_id: 'no-app',
                type: Stores.CARD_STORE_TYPE_AVAILABLE_APPS
            },
            {
                knowledge_app_id: 'a',
                type: Stores.CARD_STORE_TYPE_ARTWORK_CARD
            },
            {
                knowledge_app_id: 'b',
                type: Stores.CARD_STORE_TYPE_VIDEO_CARD
            },
            {
                knowledge_app_id: 'c',
                type: Stores.CARD_STORE_TYPE_NEWS_CARD
            },
            {
                knowledge_app_id: 'd',
                type: Stores.CARD_STORE_TYPE_ARTICLE_CARD
            }
        ];
        let arranged = ModelOrdering.arrange(models);
        expect(arranged.map(m => m.type)).toEqual([
            Stores.CARD_STORE_TYPE_NEWS_CARD,
            Stores.CARD_STORE_TYPE_ARTICLE_CARD,
            Stores.CARD_STORE_TYPE_VIDEO_CARD,
            Stores.CARD_STORE_TYPE_ARTWORK_CARD,
            Stores.CARD_STORE_TYPE_AVAILABLE_APPS,
        ]);
    });
});
