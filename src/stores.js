// src/stores.js
//
// Copyright (c) 2016-2017 Endless Mobile Inc.
//
// This file contains the model state for all the cards.

const EosDiscoveryFeed = imports.gi.EosDiscoveryFeed;
const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;

const Lang = imports.lang; 

// eslint-disable-next-line no-unused-vars
var DiscoveryFeedAppCardStore = new Lang.Class({
    Name: 'DiscoveryFeedAppCardStore',
    Extends: EosDiscoveryFeed.BaseCardStore,
    Properties: {
        'desktop-id': GObject.ParamSpec.string('desktop-id',
                                               '',
                                               '',
                                               GObject.ParamFlags.READWRITE |
                                               GObject.ParamFlags.CONSTRUCT_ONLY,
                                               '')
    }
});

// eslint-disable-next-line no-unused-vars
var DiscoveryFeedWordStore = new Lang.Class({
    Name: 'DiscoveryFeedWordStore',
    Extends: GObject.Object,
    Properties: {
        word: GObject.ParamSpec.string('word',
                                         '',
                                         '',
                                         GObject.ParamFlags.READWRITE |
                                         GObject.ParamFlags.CONSTRUCT_ONLY,
                                         ''),
        part_of_speech: GObject.ParamSpec.string('part-of-speech',
                                                 '',
                                                 '',
                                                 GObject.ParamFlags.READWRITE |
                                                 GObject.ParamFlags.CONSTRUCT_ONLY,
                                                 ''),
        definition: GObject.ParamSpec.string('definition',
                                             '',
                                             '',
                                             GObject.ParamFlags.READWRITE |
                                             GObject.ParamFlags.CONSTRUCT_ONLY,
                                             '')
    }
});

// eslint-disable-next-line no-unused-vars
var DiscoveryFeedQuoteStore = new Lang.Class({
    Name: 'DiscoveryFeedQuoteStore',
    Extends: GObject.Object,
    Properties: {
        quote: GObject.ParamSpec.string('quote',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          ''),
        author: GObject.ParamSpec.string('author',
                                           '',
                                           '',
                                           GObject.ParamFlags.READWRITE |
                                           GObject.ParamFlags.CONSTRUCT_ONLY,
                                           '')
    }
});

// eslint-disable-next-line no-unused-vars
var DiscoveryFeedWordQuotePairStore = new Lang.Class({
    Name: 'DiscoveryFeedQuotePairStore',
    Extends: EosDiscoveryFeed.BaseCardStore,
    Properties: {
        quote: GObject.ParamSpec.object('quote',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          DiscoveryFeedQuoteStore.$gtype),
        word: GObject.ParamSpec.object('word',
                                         '',
                                         '',
                                         GObject.ParamFlags.READWRITE |
                                         GObject.ParamFlags.CONSTRUCT_ONLY,
                                         DiscoveryFeedWordStore.$gtype)
    },

    _init: function(params) {
        params.type = EosDiscoveryFeed.CardStoreType.WORD_QUOTE_CARD;
        this.parent(params);
    }
});

var LAYOUT_DIRECTION_IMAGE_FIRST = 0;
var LAYOUT_DIRECTION_IMAGE_LAST = 1;

var THUMBNAIL_SIZE_APP_STORE = 180;
var THUMBNAIL_WIDTH_APP_STORE_LINK = 211;  // eslint-disable-line no-unused-vars
var THUMBNAIL_SIZE_ARTICLE = 254;
var THUMBNAIL_SIZE_NEWS = 322;  // eslint-disable-line no-unused-vars
var THUMBNAIL_SIZE_ARTWORK = 400;

// eslint-disable-next-line no-unused-vars
var DiscoveryFeedKnowledgeAppCardStore = new Lang.Class({
    Name: 'DiscoveryFeedKnowledgeAppCardStore',
    Extends: DiscoveryFeedAppCardStore,
    Properties: {
        title: GObject.ParamSpec.string('title',
                                        '',
                                        '',
                                        GObject.ParamFlags.READWRITE |
                                        GObject.ParamFlags.CONSTRUCT_ONLY,
                                        ''),
        uri: GObject.ParamSpec.string('uri',
                                      '',
                                      '',
                                      GObject.ParamFlags.READWRITE |
                                      GObject.ParamFlags.CONSTRUCT_ONLY,
                                      ''),
        synopsis: GObject.ParamSpec.string('synopsis',
                                           '',
                                           '',
                                           GObject.ParamFlags.READWRITE |
                                           GObject.ParamFlags.CONSTRUCT_ONLY,
                                           ''),
        thumbnail: GObject.ParamSpec.object('thumbnail',
                                            '',
                                            '',
                                            GObject.ParamFlags.READWRITE |
                                            GObject.ParamFlags.CONSTRUCT_ONLY,
                                            Gio.InputStream),
        bus_name: GObject.ParamSpec.string('bus-name',
                                           '',
                                           '',
                                           GObject.ParamFlags.READWRITE |
                                           GObject.ParamFlags.CONSTRUCT_ONLY,
                                           ''),
        knowledge_search_object_path: GObject.ParamSpec.string('knowledge-search-object-path',
                                                               '',
                                                               '',
                                                               GObject.ParamFlags.READWRITE |
                                                               GObject.ParamFlags.CONSTRUCT_ONLY,
                                                               ''),
        knowledge_app_id: GObject.ParamSpec.string('knowledge-app-id',
                                                     '',
                                                     '',
                                                     GObject.ParamFlags.READWRITE |
                                                     GObject.ParamFlags.CONSTRUCT_ONLY,
                                                     ''),
        layout_direction: GObject.ParamSpec.int('layout-direction',
                                                '',
                                                '',
                                                GObject.ParamFlags.READWRITE |
                                                GObject.ParamFlags.CONSTRUCT_ONLY,
                                                LAYOUT_DIRECTION_IMAGE_FIRST,
                                                LAYOUT_DIRECTION_IMAGE_LAST,
                                                LAYOUT_DIRECTION_IMAGE_FIRST),
        'thumbnail-size': GObject.ParamSpec.int('thumbnail-size',
                                                '',
                                                '',
                                                GObject.ParamFlags.READWRITE |
                                                GObject.ParamFlags.CONSTRUCT_ONLY,
                                                THUMBNAIL_SIZE_APP_STORE,
                                                THUMBNAIL_SIZE_ARTWORK,
                                                THUMBNAIL_SIZE_ARTICLE)
    },

    _init: function(params) {
        params.type = params.type || EosDiscoveryFeed.CardStoreType.ARTICLE_CARD;
        this.parent(params);
    }
});

// eslint-disable-next-line no-unused-vars
var DiscoveryFeedKnowledgeArtworkCardStore = new Lang.Class({
    Name: 'DiscoveryFeedKnowledgeArtworkCardStore',
    Extends: DiscoveryFeedKnowledgeAppCardStore,
    Properties: {
        author: GObject.ParamSpec.string('author',
                                         '',
                                         '',
                                         GObject.ParamFlags.READWRITE |
                                         GObject.ParamFlags.CONSTRUCT_ONLY,
                                         ''),
        first_date: GObject.ParamSpec.string('first-date',
                                             '',
                                             '',
                                             GObject.ParamFlags.READWRITE |
                                             GObject.ParamFlags.CONSTRUCT_ONLY,
                                             '')
    },

    _init: function(params) {
        params.type = EosDiscoveryFeed.CardStoreType.ARTWORK_CARD;
        this.parent(params);
    }
});

// eslint-disable-next-line no-unused-vars
var DiscoveryFeedKnowledgeAppVideoCardStore = new Lang.Class({
    Name: 'DiscoveryFeedKnowledgeAppVideoCardStore',
    Extends: DiscoveryFeedKnowledgeAppCardStore,
    Properties: {
        duration: GObject.ParamSpec.string('duration',
                                           '',
                                           '',
                                           GObject.ParamFlags.READWRITE |
                                           GObject.ParamFlags.CONSTRUCT_ONLY,
                                           '')
    },

    _init: function(params) {
        params.type = EosDiscoveryFeed.CardStoreType.VIDEO_CARD;
        this.parent(params);
    }
});

// eslint-disable-next-line no-unused-vars
var DiscoveryFeedAvailableAppsStore = new Lang.Class({
    Name: 'DiscoveryFeedAvailableAppsStore',
    Extends: EosDiscoveryFeed.BaseCardStore,

    _init: function(params, apps) {
        params.type = EosDiscoveryFeed.CardStoreType.AVAILABLE_APPS;
        this.parent(params);
        this.apps = apps;
    }
});

var DISCOVERY_FEED_APP_TYPE_BASIC = 0;
var DISCOVERY_FEED_APP_TYPE_DETAILED = 1;
var DISCOVERY_FEED_APP_TYPE_APP_STORE_LINK = 2;
var DISCOVERY_FEED_APP_TYPE_MAX = DISCOVERY_FEED_APP_TYPE_APP_STORE_LINK;

// eslint-disable-next-line no-unused-vars
var DiscoveryFeedAppStore = new Lang.Class({
    Name: 'DiscoveryFeedAppStore',
    Extends: GObject.Object,
    Properties: {
        app_id: GObject.ParamSpec.string('app_id',
                                         '',
                                         '',
                                         GObject.ParamFlags.CONSTRUCT_ONLY |
                                         GObject.ParamFlags.READWRITE,
                                         ''),
        title: GObject.ParamSpec.string('title',
                                        '',
                                        '',
                                        GObject.ParamFlags.CONSTRUCT_ONLY |
                                        GObject.ParamFlags.READWRITE,
                                        ''),
        thumbnail_data: GObject.ParamSpec.object('thumbnail-data',
                                                 '',
                                                 '',
                                                 GObject.ParamFlags.READWRITE |
                                                 GObject.ParamFlags.CONSTRUCT_ONLY,
                                                 Gio.InputStream),
        type: GObject.ParamSpec.int('type',
                                    '',
                                    '',
                                    GObject.ParamFlags.READWRITE |
                                    GObject.ParamFlags.CONSTRUCT_ONLY,
                                    DISCOVERY_FEED_APP_TYPE_BASIC,
                                    DISCOVERY_FEED_APP_TYPE_MAX,
                                    DISCOVERY_FEED_APP_TYPE_BASIC),
        layout_direction: GObject.ParamSpec.int('layout-direction',
                                                '',
                                                '',
                                                GObject.ParamFlags.READWRITE |
                                                GObject.ParamFlags.CONSTRUCT_ONLY,
                                                LAYOUT_DIRECTION_IMAGE_FIRST,
                                                LAYOUT_DIRECTION_IMAGE_LAST,
                                                LAYOUT_DIRECTION_IMAGE_FIRST)
    }
});

// eslint-disable-next-line no-unused-vars
var DiscoveryFeedAppStoreLinkStore = new Lang.Class({
    Name: 'DiscoveryFeedAppStoreLinkStore',
    Extends: DiscoveryFeedAppStore,

    _init: function(params) {
        let thumbnail_uri = 'resource:///com/endlessm/DiscoveryFeed/img/explore.png';
        params.title = _('Explore the App Center');
        params.thumbnail_data = Gio.File.new_for_uri(thumbnail_uri).read(null);
        params.app_id = 'org.gnome.Software';
        params.type = DISCOVERY_FEED_APP_TYPE_APP_STORE_LINK;
        params.layout_direction = LAYOUT_DIRECTION_IMAGE_LAST;
        this.parent(params);
    }
});

// eslint-disable-next-line no-unused-vars
var DiscoveryFeedInstallableAppStore = new Lang.Class({
    Name: 'DiscoveryFeedInstallableAppStore',
    Extends: DiscoveryFeedAppStore,
    Properties: {
        synopsis: GObject.ParamSpec.string('synopsis',
                                           '',
                                           '',
                                           GObject.ParamFlags.CONSTRUCT_ONLY |
                                           GObject.ParamFlags.READWRITE,
                                           ''),
        icon: GObject.ParamSpec.object('icon',
                                        '',
                                        '',
                                        GObject.ParamFlags.READWRITE |
                                        GObject.ParamFlags.CONSTRUCT_ONLY,
                                        Gio.Icon)
    },

    _init: function(params) {
        params.type = DISCOVERY_FEED_APP_TYPE_DETAILED;
        params.layout_direction = LAYOUT_DIRECTION_IMAGE_LAST;
        this.parent(params);
    }
});

