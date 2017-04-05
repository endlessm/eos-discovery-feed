// src/main.js
//
// Copyright (c) 2016-2017 Endless Mobile Inc.
//
// This file is the file first run by the entrypoint to the com.endlessm.GrandCentral
// package.
pkg.initGettext();
pkg.initFormat();
pkg.require({
    Gdk: '3.0',
    GdkX11: '3.0',
    Gtk: '3.0',
    Gio: '2.0',
    GLib: '2.0',
});

const Eknc = imports.gi.EosKnowledgeContent;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Wnck = imports.gi.Wnck;

const Lang = imports.lang;

const GRAND_CENTRAL_NAME = 'com.endlessm.GrandCentral';
const GRAND_CENTRAL_PATH = '/com/endlessm/GrandCentral';
const GRAND_CENTRAL_IFACE = 'com.endlessm.GrandCentral.View';
const SIDE_COMPONENT_ROLE = 'eos-side-component';

const GrandCentralIface = '\
<node> \
  <interface name="' + GRAND_CENTRAL_NAME + '">  \
    <method name="show">  \
      <arg type="u" direction="in" name="timestamp"/>  \
    </method>  \
    <method name="hide"> \
      <arg type="u" direction="in" name="timestamp"/> \
    </method> \
    <property name="Visible" type="b" access="read"/> \
  </interface> \
</node>';

const GrandCentralContentIface = '\
<node> \
  <interface name="com.endlessm.GrandCentralContent"> \
    <method name="ArticleCardDescriptions"> \
      <arg type="aa{ss}" name="Result" direction="out" /> \
    </method> \
  </interface> \
</node>';

//
// maybeGetKeyfileString
//
// Attempt to read a GKeyFile for a particular key in a given section
// but return a default value if it wasn't found
//
// @param {object.Gio.KeyFile} keyFile - The key file to read.
// @param {string} section - The section to read from.
// @param {string} key - The key to read.
// @param {string} defaultValue - The default value in case the key was not found.
// @returns {string} the looked up string, or the default
function maybeGetKeyfileString(keyFile, section, key, defaultValue) {
    try {
        return keyFile.get_string(section, key);
    } catch (e) {
        return defaultValue;
    }
}

const GRAND_CENTRAL_SECTION_NAME = 'Grand Central Content Provider';

//
// readGrandCentralProvidersInDirectory
//
// Read all the grand central providers in a directory, calling
// done with an array of all providers when they have been read in.
//
// @param {object.Gio.File} directory - The directory to enumerate.
// @param {function} done - The function to call with a list of providers
//                          when done.
function readGrandCentralProvidersInDirectory(directory) {
    let enumerator = null;
    let info = null;
    let providerBusDescriptors = [];

    try {
        enumerator = directory.enumerate_children('standard::name,standard::type',
                                                  Gio.FileQueryInfoFlags.NONE,
                                                  null);
    } catch (e) {
        if (e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.NOT_FOUND)) {
            return providerBusDescriptors;
        }

        throw e;
    }

    while ((info = enumerator.next_file(null))) {
        let file = Gio.File.new_for_path(GLib.build_filenamev([
            directory.get_path(),
            info.get_name()
        ]));

        let keyFile = new GLib.KeyFile();
        try {
            keyFile.load_from_file(file.get_path(), GLib.KeyFileFlags.NONE);
        } catch(e) {
            logError(e, 'Key file ' + file.get_path() + ' could not be loaded, ignored');
        }

        if (!keyFile.has_group(GRAND_CENTRAL_SECTION_NAME)) {
            log('Key file ' + file.get_path() + ' does not have a section called ' + GRAND_CENTRAL_SECTION_NAME + ', ignored');
            continue;
        }

        let keys = keyFile.get_keys(GRAND_CENTRAL_SECTION_NAME)[0];
        let requiredKeys = ['DesktopId', 'ObjectPath', 'BusName'];

        let notFoundKeys = requiredKeys.filter(k => keys.indexOf(k) === -1);
        if (notFoundKeys.length) {
            log('Key file ' + file.get_path() + ' does not have keys ' + notFoundKeys.join(', ') + ', ignoring');
            continue;
        }

        providerBusDescriptors.push({
            path: keyFile.get_string(GRAND_CENTRAL_SECTION_NAME,
                                     'ObjectPath'),
            name: keyFile.get_string(GRAND_CENTRAL_SECTION_NAME,
                                     'BusName'),
            knowledgeAppId: maybeGetKeyfileString(keyFile,
                                                  GRAND_CENTRAL_SECTION_NAME,
                                                  'AppID',
                                                  null),
            desktopFileId: maybeGetKeyfileString(keyFile,
                                                 GRAND_CENTRAL_SECTION_NAME,
                                                 'DesktopId',
                                                 null),
        });
    }

    return providerBusDescriptors;
}

function readGrandCentralProvidersInDataDirectories() {
    let dataDirectories = GLib.get_system_data_dirs();
    return dataDirectories.reduce((allProviders, directory) => {
        let dir = Gio.File.new_for_path(GLib.build_filenamev([
            directory,
            'com.endlessm.GrandCentral',
            'content-providers'
        ]));
        Array.prototype.push.apply(allProviders,
                                   readGrandCentralProvidersInDirectory(dir));
        return allProviders;
    }, []);
}

function instantiateShardsFromGrandCentralProviders(providers) {
    let shards = providers.filter(provider => {
        return provider.knowledgeAppId !== null;
    }).map(provider => {
        let engine = Eknc.Engine.get_default();
        return engine.get_domain_for_app(provider.knowledgeAppId).get_shards();
    }).reduce((allShards, shards) => {
        Array.prototype.push.apply(allShards, shards);
        return allShards;
    }, []);

    Eknc.default_vfs_set_shards(shards);
}

function instantiateObjectsFromGrandCentralProviders(connection,
                                                     interfaceName,
                                                     providers,
                                                     done) {
    let interfaceWrapper = Gio.DBusProxy.makeProxyWrapper(GrandCentralContentIface);
    let remaining = providers.length;

    let onProxyReady = function(initable, error, objectPath, name) {
        remaining--;

        if (error) {
            logError(error, 'Could not create proxy for ' + interfaceName +
                            ' at ' + objectPath + ' on bus name ' + name);
            return;
        }

        log('Created Grand Central proxy for ' + objectPath);

        if (remaining < 1) {
            done(proxies);
        }
    };

    let proxies = providers.map(provider => ({
        iface: interfaceWrapper(connection,
                                provider.name,
                                provider.path,
                                Lang.bind(this,
                                          onProxyReady,
                                          provider.path,
                                          provider.name),
                                null),
        desktopId: provider.desktopFileId
    }));
}

const GrandCentralCardStore = new Lang.Class({
    Name: 'GrandCentralCardStore',
    Extends: GObject.Object,
    Properties: {
        'title': GObject.ParamSpec.string('title',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          ''),
        'synopsis': GObject.ParamSpec.string('synopsis',
                                             '',
                                             '',
                                             GObject.ParamFlags.READWRITE |
                                             GObject.ParamFlags.CONSTRUCT_ONLY,
                                             ''),
        'thumbnail_uri': GObject.ParamSpec.string('thumbnail_uri',
                                                  '',
                                                  '',
                                                  GObject.ParamFlags.READWRITE |
                                                  GObject.ParamFlags.CONSTRUCT_ONLY,
                                                  ''),
        'desktop-id': GObject.ParamSpec.string('desktop-id',
                                               '',
                                               '',
                                               GObject.ParamFlags.READWRITE |
                                               GObject.ParamFlags.CONSTRUCT_ONLY,
                                               '')
    },

    _init: function(params) {
        this.parent(params);
    }
});

const CSSAllocator = (function() {
    let counter = 0;
    return function(properties) {
        let class_name = 'themed-widget-' + counter++;
        return [class_name, '.' + class_name + ' { ' +
        Object.keys(properties).map(function(key) {
            return key.replace('_', '-') + ': ' + properties[key] + ';';
        }).join(' ') + ' }'];
    };
})();

const GrandCentralCard = new Lang.Class({
    Name: 'GrandCentralCard',
    Extends: Gtk.ListBoxRow,
    Properties: {
        'model': GObject.ParamSpec.object('model',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          GrandCentralCardStore.$gtype)
    },
    Template: 'resource:///com/endlessm/GrandCentral/content-card.ui',
    Children: [
        'title-label',
        'synopsis-label',
        'background-content',
        'app-icon',
        'app-label'
    ],

    _init: function(params) {
        this.parent(params);
        this.title_label.label = this.model.title
        this.synopsis_label.label = this.model.synopsis;

        let contentBackgroundProvider = new Gtk.CssProvider();
        let contentBackgroundStyleContext = this.background_content.get_style_context();
        let [className, backgroundCss] = CSSAllocator({
            background_image: 'url("' + this.model.thumbnail_uri +'")',
            background_size: 'cover'
        });
        contentBackgroundProvider.load_from_data(backgroundCss);
        contentBackgroundStyleContext.add_class(className);
        contentBackgroundStyleContext.add_provider(contentBackgroundProvider,
                                      Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);

        // Read the desktop file and then set the app icon and label
        // appropriately
        this._app = Gio.DesktopAppInfo.new(this.model.desktop_id);
        this.app_label.label = this._app.get_display_name().toUpperCase();
        this.app_icon.gicon = this._app.get_icon() ||
                              Gio.ThemedIcon.new('gnome');
    }
});

const GrandCentralMainWindow = new Lang.Class({
    Name: 'GrandCentralMainWindow',
    Extends: Gtk.ApplicationWindow,
    Properties: {
        'card-model': GObject.ParamSpec.object('card-model',
                                               '',
                                               '',
                                               GObject.ParamFlags.READWRITE |
                                               GObject.ParamFlags.CONSTRUCT_ONLY,
                                               Gio.ListModel)
    },
    Template: 'resource:///com/endlessm/GrandCentral/main.ui',
    Children: [
        'cards',
        'today-date',
        'close-button',
        'dismiss-button'
    ],

    _init: function(params) {
        this.parent(params);
        this.cards.bind_model(this.card_model, function(card_store) {
            return new GrandCentralCard({
                model: card_store
            });
        });
        this.today_date.label = (new Date()).toLocaleFormat('%A %d %B, %Y');
    },
});

function load_style_sheet(resourcePath) {
    let provider = new Gtk.CssProvider();
    provider.load_from_resource(resourcePath);
    Gtk.StyleContext.add_provider_for_screen(Gdk.Screen.get_default(),
                                             provider,
                                             Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
}

//
// sanitizeSynopsis
//
// Sanitize a provided synopsis provided from an article. Remove references
// and other uninteresting information. Truncate to a few sentences.
//
// @param {string} synopsis - The synopsis to sanitize.
// @returns {string} A sanitized synopsis.
function sanitizeSynopsis(synopsis) {
    // Square brackets with numbers are just references
    synopsis = synopsis.replace(/\[\d+\]/g, '').trim();
    // Typically the things found in parens are alternatve pronunciations
    // or translations.
    synopsis = synopsis.replace(/\(.*?\)/g, '').trim();
    // Only show the first two sentences.
    synopsis = synopsis.split('.').slice(0, 2).join('.') + '.';
    // Normalize whitespace
    synopsis = synopsis.replace(/\s+/g, ' ').trim();
    return synopsis;
}

function populateGrandCentralModelFromQueries(model, proxies) {
    let remaining = proxies.length;
    model.remove_all();

    proxies.forEach(function(proxy) {
        proxy.iface.ArticleCardDescriptionsRemote(function(results, error) {
            if (error) {
                logError(error, 'Failed to execute Grand Central query');
                return;
            }

            results.forEach(function(response) {
                try {
                    response.forEach(function(entry) {
                        model.append(new GrandCentralCardStore({
                            title: entry.title,
                            synopsis: sanitizeSynopsis(entry.synopsis),
                            thumbnail_uri: entry.thumbnail_uri,
                            desktop_id: proxy.desktopId
                        }));
                    });
                } catch (e) {
                    logError(e, 'Could not parse response');
                }
            });
        });
    });
}

const GrandCentralApplication = new Lang.Class({
    Name: 'GrandCentralApplication',
    Extends: Gtk.Application,

    _init: function() {
        this.parent({ application_id: pkg.name });
        GLib.set_application_name(_('Grand Central'));
        this.Visible = false;
        this._changedSignalId = 0;
        this._grandCentralProxies = [];
        this._contentAppIds = [];
        this._grandCentralCardModel = new Gio.ListStore({
            item_type: GrandCentralCardStore.$gtype
        });
    },

    vfunc_startup: function() {
        this.parent();

        load_style_sheet('/com/endlessm/GrandCentral/application.css');

        this._window = new GrandCentralMainWindow({
            application: this,
            type_hint: Gdk.WindowTypeHint.DOCK,
            role: SIDE_COMPONENT_ROLE,
            card_model: this._grandCentralCardModel
        });

        this._window.connect('notify::visible', Lang.bind(this, this._on_visibility_changed));
        // There seems to be a race condition with the WM that can
        // lead the sidebar into an inconsistent state if the
        // _on_active_window_changed callback gets executed in such a
        // way that ends up calling to hide() between the user pressed
        // the tray button and the sidebar has been made visible,
        // which can lead to the sidebar never been displayed.
        this._window.connect('map-event', Lang.bind(this, function() {
            if (!this._changedSignalId) {
                this._changedSignalId = Wnck.Screen.get_default().connect('active-window-changed',
                                                                          Lang.bind(this, this._on_active_window_changed));
            }
            return false;
        }));
        this._window.connect('unmap', Lang.bind(this, function() {
            if (this._changedSignalId) {
                Wnck.Screen.get_default().disconnect(this._changedSignalId);
                this._changedSignalId = 0;
            }
        }));

        // update position when workarea changes
        let display = Gdk.Display.get_default();
        display.connect('monitor-added', Lang.bind(this,
                                                   this._update_geometry));
        display.connect('monitor-added', Lang.bind(this,
                                                   this._update_geometry));
        let monitor = display.get_primary_monitor();
        monitor.connect('notify::workarea', Lang.bind(this,
                                                      this._update_geometry));
        this._update_geometry();
    },

    vfunc_dbus_register: function(connection, path) {
        this._dbusImpl = Gio.DBusExportedObject.wrapJSObject(GrandCentralIface, this);
        this._dbusImpl.export(Gio.DBus.session, path);

        let providers = readGrandCentralProvidersInDataDirectories();
        let onProxiesInstantiated = Lang.bind(this, function(proxies) {
            Array.prototype.push.apply(this._grandCentralProxies, proxies);
        });
        instantiateObjectsFromGrandCentralProviders(connection,
                                                    'com.endlessm.GrandCentralContent',
                                                    providers,
                                                    onProxiesInstantiated);
        instantiateShardsFromGrandCentralProviders(providers);

        return this.parent(connection, path);
    },

    vfunc_activate: function() {
        // This does nothing -we should only show when the shell asks us
    },

    show: function(timestamp) {
        this._window.show();
        this._window.present_with_time(timestamp);

        populateGrandCentralModelFromQueries(this._grandCentralCardModel,
                                             this._grandCentralProxies);
    },

    hide: function() {
        this._window.hide();
    },

    _on_visibility_changed: function() {
        this.Visible = this._window.is_visible();
        let propChangedVariant = new GLib.Variant('(sa{sv}as)', [
            GRAND_CENTRAL_IFACE, {
                'Visible': new GLib.Variant('b', this.Visible)
            },
            []
        ]);

        Gio.DBus.session.emit_signal(null,
                                     GRAND_CENTRAL_PATH,
                                     'org.freedesktop.DBus.Properties',
                                     'PropertiesChanged',
                                     propChangedVariant);
    },

    _on_active_window_changed: function() {
        let active_window = Wnck.Screen.get_default().get_active_window();
        let current_window = this._window.get_window();
        let active_window_xid = active_window ? active_window.get_xid() : 0;
        let current_window_xid = current_window ? current_window.get_xid() : 0;

        if (active_window !== null) {
            // try to match transient windows
            let transient_window = active_window.get_transient();

            if (transient_window !== null &&
                current_window_xid === transient_window.get_xid()) {
                return;
            }
        }

        if (active_window_xid !== current_window_xid) {
            this.hide();
        }
    },

    _update_geometry: function() {
        let monitor = Gdk.Display.get_default().get_primary_monitor();
        let workarea = monitor.get_workarea();

        let geometry = {
            width: this._window.get_size()[0],
            height: workarea.height,
            y: workarea.y
        };

        geometry.x = workarea.width - geometry.width;
        this._window.move(geometry.x, geometry.y);
        this._window.resize(geometry.width, geometry.height);
    }
});

function main(argv) { // eslint-disable-line no-unused-vars
    return (new GrandCentralApplication()).run(argv);
}
