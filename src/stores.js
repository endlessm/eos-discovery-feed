// src/stores.js
//
// Copyright (c) 2016-2017 Endless Mobile Inc.
//
// This file contains the model state for all the cards.

const EosDiscoveryFeed = imports.gi.EosDiscoveryFeed;
const Gio = imports.gi.Gio;
const GObject = imports.gi.GObject;

const Lang = imports.lang; 

var DiscoveryFeedKnowledgeArtworkCardStore = new Lang.Class({
    Name: 'DiscoveryFeedKnowledgeArtworkCardStore',
    Extends: EosDiscoveryFeed.KnowledgeAppCardStore,
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
    Extends: EosDiscoveryFeed.KnowledgeAppCardStore,
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
    Extends: GObject.Object,
    Implements: [EosDiscoveryFeed.BaseCardStore],
    Properties: {
        type: GObject.ParamSpec.enum('type',
                                     '',
                                     '',
                                     GObject.ParamFlags.READABLE,
                                     EosDiscoveryFeed.CardStoreType.$gtype,
                                     EosDiscoveryFeed.CardStoreType.AVAILABLE_APPS)
    },

    _init: function(params, apps) {
        this.parent(params);
        this.apps = apps;
    },

    get type() {
        return EosDiscoveryFeed.CardStoreType.AVAILABLE_APPS;
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
                                                EosDiscoveryFeed.CardLayoutDirection.IMAGE_FIRST,
                                                EosDiscoveryFeed.CardLayoutDirection.IMAGE_LAST,
                                                EosDiscoveryFeed.CardLayoutDirection.IMAGE_FIRST)
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
        params.layout_direction = EosDiscoveryFeed.CardLayoutDirection.IMAGE_LAST;
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
        params.layout_direction = EosDiscoveryFeed.CardLayoutDirection.IMAGE_LAST;
        this.parent(params);
    }
});

