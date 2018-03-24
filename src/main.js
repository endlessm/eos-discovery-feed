// src/main.js
//
// Copyright (c) 2016-2017 Endless Mobile Inc.
//
// This file is the file first run by the entrypoint to the com.endlessm.DiscoveryFeed
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

const EosDiscoveryFeed = imports.gi.EosDiscoveryFeed;
const EosShard = imports.gi.EosShard;
const EosMetrics = imports.gi.EosMetrics;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;

const Lang = imports.lang;

const ImageCoverFrame = imports.imageCoverFrame;
const ModelOrdering = imports.modelOrdering;
const Stores = imports.stores;
const TextSanitization = imports.textSanitization;

const DISCOVERY_FEED_PATH = '/com/endlessm/DiscoveryFeed';
const DISCOVERY_FEED_IFACE = 'com.endlessm.DiscoveryFeed';
const SIDE_COMPONENT_ROLE = 'eos-side-component';

const KNOWLEDGE_SEARCH_INTERFACE_NAME = 'com.endlessm.KnowledgeSearch';

const SHELL_BUS_NAME = 'org.gnome.Shell';
const SHELL_OBJECT_PATH = '/org/gnome/Shell';

const KnowledgeSearchIface = '\
<node> \
  <interface name="' + KNOWLEDGE_SEARCH_INTERFACE_NAME + '"> \
    <method name="LoadItem"> \
      <arg type="s" name="EknID" direction="in" /> \
      <arg type="s" name="Query" direction="in" /> \
      <arg type="u" name="Timestamp" direction="in" /> \
    </method> \
    <method name="LoadQuery"> \
      <arg type="s" name="Query" direction="in" /> \
      <arg type="u" name="Timestamp" direction="in" /> \
    </method> \
  </interface> \
</node>';

const AppLauncherIface = '\
<node> \
<interface name="org.gnome.Shell.AppLauncher"> \
<method name="Launch"> \
    <arg type="s" direction="in" name="name" /> \
    <arg type="u" direction="in" name="timestamp" /> \
</method> \
<method name="LaunchViaDBusCall"> \
    <arg type="s" direction="in" name="name" /> \
    <arg type="s" direction="in" name="busName" /> \
    <arg type="s" direction="in" name="objectPath" /> \
    <arg type="s" direction="in" name="interfaceName" /> \
    <arg type="s" direction="in" name="methodName" /> \
    <arg type="v" direction="in" name="args" /> \
</method> \
</interface> \
</node>';

const DiscoveryFeedIface = '\
<node> \
  <interface name="' + DISCOVERY_FEED_IFACE + '">  \
    <method name="show">  \
      <arg type="u" direction="in" name="timestamp"/>  \
    </method>  \
    <method name="hide"> \
      <arg type="u" direction="in" name="timestamp"/> \
    </method> \
    <property name="Visible" type="b" access="read"/> \
  </interface> \
</node>';

const DiscoveryFeedContentIface = '\
<node> \
  <interface name="com.endlessm.DiscoveryFeedContent"> \
    <method name="ArticleCardDescriptions"> \
      <arg type="as" name="Shards" direction="out" /> \
      <arg type="aa{ss}" name="Result" direction="out" /> \
    </method> \
  </interface> \
</node>';

const DiscoveryFeedNewsIface = '\
<node> \
  <interface name="com.endlessm.DiscoveryFeedNews"> \
    <method name="GetRecentNews"> \
      <arg type="as" name="Shards" direction="out" /> \
      <arg type="aa{ss}" name="Result" direction="out" /> \
    </method> \
  </interface> \
</node>';

const DiscoveryFeedInstallableAppsIface = '\
<node> \
  <interface name="com.endlessm.DiscoveryFeedInstallableApps"> \
    <method name="GetInstallableApps"> \
      <arg type="aa{sv}" name="Results" direction="out" /> \
    </method> \
  </interface> \
</node>';

const DiscoveryFeedVideoIface = '\
<node> \
  <interface name="com.endlessm.DiscoveryFeedVideo"> \
    <method name="GetVideos"> \
      <arg type="as" name="Shards" direction="out" /> \
      <arg type="aa{ss}" name="Result" direction="out" /> \
    </method> \
  </interface> \
</node>';

const DiscoveryFeedWordIface = '\
<node> \
  <interface name="com.endlessm.DiscoveryFeedWord"> \
    <method name="GetWordOfTheDay"> \
      <arg type="a{ss}" name="Results" direction="out" /> \
    </method> \
  </interface> \
</node>';

const DiscoveryFeedQuoteIface = '\
<node> \
  <interface name="com.endlessm.DiscoveryFeedQuote"> \
    <method name="GetQuoteOfTheDay"> \
      <arg type="a{ss}" name="Results" direction="out" /> \
    </method> \
  </interface> \
</node>';

const DiscoveryFeedArtworkIface = '\
<node> \
  <interface name="com.endlessm.DiscoveryFeedArtwork"> \
    <method name="ArtworkCardDescriptions"> \
      <arg type="as" name="Shards" direction="out" /> \
      <arg type="aa{ss}" name="Result" direction="out" /> \
    </method> \
  </interface> \
</node>';


function flatpakSystemDirs() {
  let env = GLib.getenv('EOS_DISCOVERY_FEED_FLATPAK_SYSTEM_DIRS');
  if (env)
      return env.split(':');

  return ['/var/lib/flatpak', '/var/endless-extra/flatpak'];
}

// We need to look at the flatpak directories and /run/host/usr/share explicitly
// since they are not included in XDG_DATA_DIRS
function allRelevantDataDirs() {
  return [...(new Set(GLib.get_system_data_dirs().concat(flatpakSystemDirs().map((directory) =>
    GLib.build_filenamev([directory, 'exports', 'share'])
  )).concat(['/run/host/usr/share']))).values()];
}

//
// flatpakCompatibleDesktopInfo
//
// Build a GDesktopAppInfo object for a .desktop file that might
// be in the exports directory but is not necessarily executable
// because the binary was not mounted in the bwrap jail.
function flatpakCompatibleDesktopInfo(desktopId) {
    for (let directory of allRelevantDataDirs()) {
        let path = GLib.build_filenamev([directory, 'applications', desktopId]);
        let keyfile = new GLib.KeyFile();

        try {
            keyfile.load_from_file(path, GLib.KeyFileFlags.NONE);
        } catch(e) {
            continue;
        }

        // Now that we have the keyfile, set the Exec line to some
        // well-known binary, so that GDesktopAppInfo doesn't trip up
        // when we try to read it.
        keyfile.set_string(GLib.KEY_FILE_DESKTOP_GROUP,
                           GLib.KEY_FILE_DESKTOP_KEY_EXEC,
                           '/bin/true');

        // Need to override the get_id function here - creating the desktop
        // file with g_desktop_app_info_new_from_keyfile does not set
        // the underlying desktop_id and there is no way to set it after
        // construction.
        let app_info = Gio.DesktopAppInfo.new_from_keyfile(keyfile);
        app_info.get_id = function() {
            return desktopId;
        };

        return app_info;
    };

    return null;
}

function allSettledPromises(promises) {
    // Return a Promise.all of promises that always resolve, however they
    // resolve with tuples of error and result pairs. It is up to the
    // consumer to deal with the errors as they come in.
    return Promise.all(promises.map((promise) => {
        return new Promise(function(resolve) {
            try {
                promise.then(result => resolve([null, result]))
                .catch(e => resolve([e, null]));
            } catch (e) {
                logError(e, 'Something went wrong in allSettledPromises resolution');
                resolve([e, null]);
            }
        });
    }));
}

function promisifyGIO(obj, funcName, finishName, ...args) {
    return new Promise((resolve, reject) => {
        try {
            obj[funcName](...args, function(source, result) {
                try {
                    resolve(obj[finishName](result));
                } catch (e) {
                    reject(e);
                }
            });
        } catch (e) {
            reject(e);
        }
    });
};

// Gio.js does things the wrong way around which trips up promisifyGBusProxyCallback,
// so re-curry the arguments so that they make sense.
function makeCorrectlyOrderedProxyWrapper(iface) {
    let wrapper = Gio.DBusProxy.makeProxyWrapper(iface);
    return function(bus, name, object, cancellable, asyncCallback) {
        return wrapper(bus,
                       name,
                       object,
                       asyncCallback,
                       cancellable);
    };
}

function instantiateObjectsFromDiscoveryFeedProviders(connection,
                                                      providers) {
    let interfaceWrappers = {
        'com.endlessm.DiscoveryFeedContent': makeCorrectlyOrderedProxyWrapper(DiscoveryFeedContentIface),
        'com.endlessm.DiscoveryFeedNews': makeCorrectlyOrderedProxyWrapper(DiscoveryFeedNewsIface),
        'com.endlessm.DiscoveryFeedInstallableApps': makeCorrectlyOrderedProxyWrapper(DiscoveryFeedInstallableAppsIface),
        'com.endlessm.DiscoveryFeedVideo': makeCorrectlyOrderedProxyWrapper(DiscoveryFeedVideoIface),
        'com.endlessm.DiscoveryFeedQuote': makeCorrectlyOrderedProxyWrapper(DiscoveryFeedQuoteIface),
        'com.endlessm.DiscoveryFeedWord': makeCorrectlyOrderedProxyWrapper(DiscoveryFeedWordIface),
        'com.endlessm.DiscoveryFeedArtwork': makeCorrectlyOrderedProxyWrapper(DiscoveryFeedArtworkIface)
    };

    // Map to promises and then flat map promises
    return allSettledPromises(providers.map(provider =>
        provider.interfaces.filter(interfaceName => {
            if (Object.keys(interfaceWrappers).indexOf(interfaceName) === -1) {
                log('Filtering out unrecognised interface ' + interfaceName);
                return false;
            }

            return true;
        })
        .map((interfaceName) =>
            promisifyGBusProxyCallback(interfaceWrappers,
                                       interfaceName,
                                       connection,
                                       provider.bus_name,
                                       provider.object_path,
                                       null)
            .then(([proxy]) => ({
                iface: proxy,
                interfaceName: interfaceName,
                desktopId: provider.desktop_id,
                knowledgeSearchObjectPath: provider.knowledge_search_object_path,
                knowledgeAppId: provider.knowledge_app_id
            }))
            .catch((e) => {
                throw new Error('Initializing proxy for ' + interfaceName +
                                ' at ' + provider.object_path + ' on bus name ' + provider.bus_name +
                                ' failed: ' + String(e) + ', stack:\n' + String(e.stack));
            })
        )
    ).reduce((list, incoming) => list.concat(incoming), []));
}


const EVENT_DISCOVERY_FEED_OPEN = 'd54cbd8c-c977-4dac-ae72-535ad5633877';
const EVENT_DISCOVERY_FEED_CLOSE = 'e7932cbd-7c20-49eb-94e9-4bf075e0c0c0';
const EVENT_DISCOVERY_FEED_CLICK = 'f2f31a64-2193-42b5-ae39-ca0b4d1f0691';

// recordMetricsEvent
//
// Called whenever we want to record a metrics event for the discovery feed.
// This will only ever be called if metrics are turned on, which they are off
// by default.
//
// The caller is responsible for passing the correct payload (serialized as
// a GVariant for the given event ID).
function recordMetricsEvent(eventId, payload) {
    EosMetrics.EventRecorder.get_default().record_event(eventId, payload);
}


// loadKnowledgeAppContent
//
// Try to load a specific EknURI in a knowledge app, opening the app
// itself if that fails.
function loadKnowledgeAppContent(app,
                                 knowledgeSearchProxy,
                                 shellProxy,
                                 uri,
                                 contentType,
                                 timestamp) {
    let desktopId = app.get_id();

    recordMetricsEvent(EVENT_DISCOVERY_FEED_CLICK, new GLib.Variant('a{ss}', {
        app_id: desktopId,
        content_type: contentType
    }));

    let context = Gdk.AppLaunchContext.new();
    context.set_timestamp(timestamp);

    if (!knowledgeSearchProxy) {
        log('Without a known search proxy, app ' + desktopId + ' cannot be launched directly');
        return;
    }

    knowledgeSearchProxy.LoadItemRemote(uri, '', timestamp, function(result, excp) {
        if (!excp)
            return;
        logError(excp,
                 'Could not load app with article ' +
                 uri +
                 ' fallback to just launch the app through the shell, trace');
        shellProxy.LaunchRemote(desktopId, timestamp, function(result, excp) {
            if (!excp)
              return;

            logError(excp,
                     'Failed to launch app ' + desktopId + ' through the shell');
        });
    });
}

// createMetaCallProxy
//
// Create a proxy for a DBus object with an abstracted away call mechanism
// that passes down the information required to make DBus call to a function
function createMetaCallProxy(interfaceMetadata, callFunc, callFuncSync) {
    let interfaceInfo = Gio.DBusInterfaceInfo.new_for_xml(interfaceMetadata);
    let obj = {};

    interfaceInfo.methods.forEach(function(method) {
        let signature = method.in_args.reduce(function(sig, arg) {
            return sig + arg.signature;
        }, '');
        obj[method.name + 'Remote'] = function() {
            let args = Array.prototype.slice.call(arguments);

            let [callback, rest] = [
                args[args.length - 1],
                Array.prototype.slice.call(args, 0, args.length - 1)
            ];
            callFunc(method.name, rest, signature, callback);
        };
        obj[method.name + 'Sync'] = function() {
            let args = Array.prototype.slice.call(arguments);

            callFuncSync(method.name, args, signature);
        };
    });

    return obj;
}

// createShellAppLauncherMetaCallProxy
//
// Create a proxy for a DBus object which calls methods through the shell's
// AppLauncher interface.
//
// Returns an object containing the raw shell proxy, shellProxy and
// the meta-call proxy metaProxy. Use object destructuring to pick the
// ones you need.
function createShellAppLauncherMetaCallProxies(interfaceMetadata,
                                               appId,
                                               busName,
                                               objectPath,
                                               interfaceName) {
    let interfaceWrapper = Gio.DBusProxy.makeProxyWrapper(AppLauncherIface);
    let onProxyReady = function(initable, error) {
        if (error) {
            logError(error,
                     'Could not create proxy for ' + objectPath);
            return;
        }
    };
    let shellProxy = interfaceWrapper(Gio.DBus.session,
                                      SHELL_BUS_NAME,
                                      SHELL_OBJECT_PATH,
                                      onProxyReady);

    // Now that we have a shell proxy, create our proxy using the shell
    // proxy to call our own proxy's app
    let asyncCallFunc = function(method, args, signature, callback) {
        let wrapped = new GLib.Variant('(' + signature + ')', args);
        return shellProxy.LaunchViaDBusCallRemote(appId,
                                                  busName,
                                                  objectPath,
                                                  interfaceName,
                                                  method,
                                                  wrapped,
                                                  callback);
    };
    let syncCallFunc = function(method, args, signature) {
        let wrapped = new GLib.Variant('(' + signature + ')', args);
        return shellProxy.LaunchViaDBusCallSync(appId,
                                                busName,
                                                objectPath,
                                                interfaceName,
                                                method,
                                                wrapped,
                                                args);
    };
    let proxy = createMetaCallProxy(interfaceMetadata, asyncCallFunc, syncCallFunc);

    return {
        metaProxy: proxy,
        shellProxy
    };
}

// createSearchProxiesFromObjectPath
//
// Using the given object path, create a proxy object for it asynchronously.
//
// Note that the created proxy object is not just a direct proxy to the app -
// it is actually a 'meta-proxy' which makes a method call through the shell
// so that launching the app will show a splash-screen. However, it should
// have similar semantics to a proxy created using makeProxyWrapper - you
// should be able to use it transparently.
function createSearchProxiesFromObjectPath(appId, objectPath) {
    if (objectPath) {
        return createShellAppLauncherMetaCallProxies(KnowledgeSearchIface,
                                                     appId,
                                                     appId,
                                                     objectPath,
                                                     KNOWLEDGE_SEARCH_INTERFACE_NAME);
    }

    return null;
}

const DiscoveryFeedActivatableFrame = new Lang.Class({
    Name: 'DiscoveryFeedActivatableFrame',
    Extends: Gtk.Button,
    Properties: {
        content: GObject.ParamSpec.object('content',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          Gtk.Widget),
    },
    Template: 'resource:///com/endlessm/DiscoveryFeed/activatable-frame.ui',

    _init: function(params) {
        this.parent(params);
        this.add(params.content);
        // Connect to the realize signal of the button and set
        // the pointer cursor over its event window once the event
        // window has been created.
        this.connect('realize', Lang.bind(this, function(widget) {
            widget.get_event_window().set_cursor(Gdk.Cursor.new_from_name(Gdk.Display.get_default(),
                                                                          'pointer'));
        }));
    }
});

const DiscoveryFeedAppContentDescription = new Lang.Class({
    Name: 'DiscoveryFeedAppContentDescription',
    Extends: Gtk.Box,
    Properties: {
        app_name: GObject.ParamSpec.string('app-name',
                                           '',
                                           '',
                                           GObject.ParamFlags.READWRITE |
                                           GObject.ParamFlags.CONSTRUCT_ONLY,
                                           ''),
        title: GObject.ParamSpec.string('title',
                                        '',
                                        '',
                                        GObject.ParamFlags.READWRITE |
                                        GObject.ParamFlags.CONSTRUCT_ONLY,
                                        ''),
        formatted_date: GObject.ParamSpec.string('formatted-date',
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
                                           '')
    },
    Template: 'resource:///com/endlessm/DiscoveryFeed/app-content-description.ui',
    Children: [
        'app-label',
        'title-label',
        'synopsis-label',
        'date-label'
    ],

    _init: function(params) {
        this.parent(params);
        this.app_label.label = this.app_name;
        this.title_label.label = this.title;
        this.synopsis_label.label = this.synopsis;

        // Not visible unless a date is actually set
        this.date_label.visible = !!this.formatted_date
        this.date_label.label = this.formatted_date
    }
});

const DiscoveryFeedAppStoreLink = new Lang.Class({
    Name: 'DiscoveryFeedAppStoreLink',
    Extends: Gtk.Box,
    Properties: {
        message: GObject.ParamSpec.string('message',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          '')
    },
    Template: 'resource:///com/endlessm/DiscoveryFeed/app-store-link.ui',
    Children: [
        'message-label',
    ],

    _init: function(params) {
        this.parent(params);
        this.message_label.label = this.message;
    }
});

const DiscoveryFeedAppStoreDescription = new Lang.Class({
    Name: 'DiscoveryFeedAppStoreDescription',
    Extends: Gtk.Box,
    Properties: {
        app_name: GObject.ParamSpec.string('app-name',
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
        icon: GObject.ParamSpec.object('icon',
                                       '',
                                       '',
                                       GObject.ParamFlags.READWRITE |
                                       GObject.ParamFlags.CONSTRUCT_ONLY,
                                       Gio.Icon)
    },
    Template: 'resource:///com/endlessm/DiscoveryFeed/app-store-description.ui',
    Children: [
        'app-icon',
        'app-label',
        'synopsis-label'
    ],

    _init: function(params) {
        this.parent(params);
        this.app_label.label = this.app_name;
        if (this.icon)
            this.app_icon.set_from_gicon(this.icon, Gtk.IconSize.DND);
        this.app_label.label = this.app_name;
        this.synopsis_label.label = this.synopsis;
    }
});

const CONTENT_PREVIEW_SMALL = 200;
const CONTENT_PREVIEW_MID = 300;

const DiscoveryFeedContentPreview = new Lang.Class({
    Name: 'DiscoveryFeedContentPreview',
    Extends: Gtk.Box,
    Properties: {
        image_stream: GObject.ParamSpec.object('image-stream',
                                               '',
                                               '',
                                               GObject.ParamFlags.READWRITE |
                                               GObject.ParamFlags.CONSTRUCT_ONLY,
                                               Gio.InputStream),
        min_width: GObject.ParamSpec.int('min-width',
                                         '',
                                         '',
                                         GObject.ParamFlags.READWRITE |
                                         GObject.ParamFlags.CONSTRUCT_ONLY,
                                         0,
                                         GLib.MAXINT32,
                                         CONTENT_PREVIEW_SMALL),
        min_height: GObject.ParamSpec.int('min-height',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          0,
                                          GLib.MAXINT32,
                                          CONTENT_PREVIEW_SMALL),
        has_alpha: GObject.ParamSpec.boolean('has-alpha',
                                             'Has Alpha',
                                             'Has Alpha',
                                             GObject.ParamFlags.READWRITE |
                                             GObject.ParamFlags.CONSTRUCT_ONLY,
                                             false),
    },
    Template: 'resource:///com/endlessm/DiscoveryFeed/content-preview.ui',
    Children: [
        'thumbnail-container'
    ],

    _init: function(params) {
        this.parent(params);
        this.thumbnail_container.width_request = this.min_width;
        this.thumbnail_container.height_request = this.min_height;

        if (this.image_stream) {
            let frame = new ImageCoverFrame.ImageCoverFrame({
                hexpand: true,
                has_alpha: this.has_alpha
            });
            frame.set_content(this.image_stream);
            this.thumbnail_container.add(frame);
        }
    }
});

const DiscoveryFeedContentCardLayout = new Lang.Class({
    Name: 'DiscoveryFeedContentCardLayout',
    Extends: Gtk.Box,
    Properties: {
        content: GObject.ParamSpec.object('content',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          Gtk.Widget),
        description: GObject.ParamSpec.object('description',
                                              '',
                                              '',
                                              GObject.ParamFlags.READWRITE |
                                              GObject.ParamFlags.CONSTRUCT_ONLY,
                                              Gtk.Widget),
        layout_direction: GObject.ParamSpec.int('layout-direction',
                                                '',
                                                '',
                                                GObject.ParamFlags.READWRITE |
                                                GObject.ParamFlags.CONSTRUCT_ONLY,
                                                EosDiscoveryFeed.CardLayoutDirection.IMAGE_FIRST,
                                                EosDiscoveryFeed.CardLayoutDirection.IMAGE_LAST,
                                                EosDiscoveryFeed.CardLayoutDirection.IMAGE_FIRST)
    },
    Template: 'resource:///com/endlessm/DiscoveryFeed/content-card-layout.ui',

    _init: function(params) {
        this.parent(params);
        this.add(this.content);
        this.add(this.description);
        // If this is an odd card, adjust the packing order of all widgets
        // in the box
        if (this.layout_direction == EosDiscoveryFeed.CardLayoutDirection.IMAGE_LAST) {
            this.get_children().forEach(Lang.bind(this, function(child) {
                this.child_set_property(child,
                                        'pack-type',
                                        Gtk.PackType.END);
            }));
        }
    }
});

const DiscoveryFeedVideoCardLayout = new Lang.Class({
    Name: 'DiscoveryFeedVideoCardLayout',
    Extends: Gtk.Overlay,
    Properties: {
        content: GObject.ParamSpec.object('content',
                                          '',
                                          '',
                                          GObject.ParamFlags.READWRITE |
                                          GObject.ParamFlags.CONSTRUCT_ONLY,
                                          Gtk.Widget),
        title: GObject.ParamSpec.string('title',
                                        '',
                                        '',
                                        GObject.ParamFlags.READWRITE |
                                        GObject.ParamFlags.CONSTRUCT_ONLY,
                                        ''),
        duration: GObject.ParamSpec.int('duration',
                                        '',
                                        '',
                                        GObject.ParamFlags.READWRITE |
                                        GObject.ParamFlags.CONSTRUCT_ONLY,
                                        0,
                                        GLib.MAXINT32,
                                        0),
        app_name: GObject.ParamSpec.string('app-name',
                                           '',
                                           '',
                                           GObject.ParamFlags.READWRITE |
                                           GObject.ParamFlags.CONSTRUCT_ONLY,
                                           '')
    },
    Template: 'resource:///com/endlessm/DiscoveryFeed/video-card-layout.ui',
    Children: [
        'background-content',
        'title-label',
        'duration-label',
        'app-label'
    ],

    _init: function(params) {
        this.parent(params);
        this.background_content.add(this.content);

        this.title_label.label = this.title;
        this.app_label.label = this.app_name;
        this.duration.label = parseDuration(this.duration);
    }
});

const DiscoveryFeedKnowledgeAppCard = new Lang.Class({
    Name: 'DiscoveryFeedKnowledgeAppCard',
    Extends: Gtk.Box,
    Properties: {
        model: GObject.ParamSpec.object('model',
                                        '',
                                        '',
                                        GObject.ParamFlags.READWRITE |
                                        GObject.ParamFlags.CONSTRUCT_ONLY,
                                        EosDiscoveryFeed.KnowledgeAppCardStore.$gtype)
    },

    _init: function(params) {
        params.visible = true;
        this.parent(params);

        // Read the desktop file and then set the app icon and label
        // appropriately
        this._app = flatpakCompatibleDesktopInfo(this.model.desktop_id);
        let card = new DiscoveryFeedActivatableFrame({
            content: this.createLayout()
        });
        this.add(card);
        card.connect('clicked', Lang.bind(this, function() {
            loadKnowledgeAppContent(this._app,
                                    this._knowledgeSearchProxy,
                                    this._shellAppLauncherProxy,
                                    this.model.uri,
                                    this.contentType,
                                    Gtk.get_current_event_time());
        }));

        let {
            metaProxy,
            shellProxy
        } = createSearchProxiesFromObjectPath(this.model.knowledge_app_id,
                                              this.model.knowledge_search_object_path);
        this._knowledgeSearchProxy = metaProxy;
        this._shellAppLauncherProxy = shellProxy;
    },

    createLayout: function() {
        return new DiscoveryFeedContentCardLayout({
            content: new DiscoveryFeedContentPreview({
                image_stream: this.model.thumbnail,
                min_width: this.model.thumbnail_size,
                min_height: this.model.thumbnail_size
            }),
            description: this.createDescription(),
            layout_direction: this.model.layout_direction
        });
    },

    createDescription: function() {
        return new DiscoveryFeedAppContentDescription({
            title: this.model.title,
            synopsis: this.model.synopsis,
            app_name: this._app.get_display_name().toUpperCase()
        });
    },

    get contentType() {
        return 'knowledge_content';
    }
});

const DiscoveryFeedKnowledgeVideoCard = new Lang.Class({
    Name: 'DiscoveryFeedKnowledgeVideoCard',
    Extends: DiscoveryFeedKnowledgeAppCard,
    Properties: {
        model: GObject.ParamSpec.object('model',
                                        '',
                                        '',
                                        GObject.ParamFlags.READWRITE |
                                        GObject.ParamFlags.CONSTRUCT_ONLY,
                                        EosDiscoveryFeed.KnowledgeAppVideoCardStore.$gtype)
    },

    createLayout: function() {
        return new DiscoveryFeedVideoCardLayout({
            title: this.model.title,
            duration: this.model.duration,
            app_name: this._app.get_display_name().toUpperCase(),
            content: new DiscoveryFeedContentPreview({
                image_stream: this.model.thumbnail,
                min_height: CONTENT_PREVIEW_MID
            })
        });
    },

    get contentType() {
        return 'knowledge_video';
    }
});

const DiscoveryFeedKnowledgeArtworkCard = new Lang.Class({
    Name: 'DiscoveryFeedKnowledgeArtworkCard',
    Extends: DiscoveryFeedKnowledgeAppCard,
    Properties: {
        model: GObject.ParamSpec.object('model',
                                        '',
                                        '',
                                        GObject.ParamFlags.READWRITE |
                                        GObject.ParamFlags.CONSTRUCT_ONLY,
                                        EosDiscoveryFeed.KnowledgeAppArtworkCardStore.$gtype)
    },

    _init: function(params) {
        this.parent(params);

        this.get_style_context().add_class('artwork');
    },

    createDescription: function() {
        return new DiscoveryFeedAppContentDescription({
            title: this.model.title,
            synopsis: 'by ' + this.model.author,
            app_name: 'Masterpiece of the Day'.toUpperCase(),
            // Need to use a ternary here since this.model.date can be an empty
            // string
            formatted_date: this.model.first_date ? String(new Date(this.model.first_date).getFullYear()) : null
        });
    },

    get contentType() {
        return 'knowledge_artwork';
    }
});

const DiscoveryFeedWordQuotePair = new Lang.Class({
    Name: 'DiscoveryFeedWordQuotePair',
    Extends: Gtk.Button,
    Template: 'resource:///com/endlessm/DiscoveryFeed/word-quote-pair.ui',
    Properties: {
        model: GObject.ParamSpec.object('model',
                                        '',
                                        '',
                                        GObject.ParamFlags.READWRITE |
                                        GObject.ParamFlags.CONSTRUCT_ONLY,
                                        EosDiscoveryFeed.WordQuoteCardStore.$gtype)
    },
    Children: [
        'word',
        'quote',
        'word-description',
        'quote-author'
    ],

    _init: function(params) {
        this.parent(params);

        this.word.label = this.model.word.word;
        this.word_description.label = '(' + this.model.word.part_of_speech + ') ' + this.model.word.definition;
        this.quote.label = '"' + this.model.quote.quote + '"';
        this.quote_author.label = this.model.quote.author.toUpperCase();

        this.connect('clicked', function() {
            recordMetricsEvent(EVENT_DISCOVERY_FEED_CLICK, new GLib.Variant('a{ss}', {
                app_id: 'com.endlessm.WordOfTheDay'
            }));
        });
    }
});

const DiscoveryFeedInstallableAppCard = new Lang.Class({
    Name: 'DiscoveryFeedInstallableAppCard',
    Extends: Gtk.Box,
    Template: 'resource:///com/endlessm/DiscoveryFeed/installable-app-card.ui',
    Properties: {
        model: GObject.ParamSpec.object('model',
                                        '',
                                        '',
                                        GObject.ParamFlags.READWRITE |
                                        GObject.ParamFlags.CONSTRUCT_ONLY,
                                        Stores.DiscoveryFeedInstallableAppStore.$gtype)
    },

    _init: function(params) {
        this.parent(params);

        let card = new DiscoveryFeedActivatableFrame({
            content: new DiscoveryFeedContentCardLayout({
                content: new DiscoveryFeedContentPreview({
                    image_stream: this.model.thumbnail_data,
                    min_width: EosDiscoveryFeed.THUMBNAIL_SIZE_APP_STORE,
                    min_height: EosDiscoveryFeed.THUMBNAIL_SIZE_APP_STORE
                }),
                description: new DiscoveryFeedAppStoreDescription({
                    app_name: this.model.title,
                    synopsis: this.model.synopsis,
                    icon: this.model.icon
                }),
                layout_direction: this.model.layout_direction
            })
        });
        this.add(card);

        // Connect to the realize signal of the button and set
        // the pointer cursor over its event window once the event
        // window has been created.
        card.connect('clicked', Lang.bind(this, function() {
            recordMetricsEvent(EVENT_DISCOVERY_FEED_CLICK, new GLib.Variant('a{ss}', {
                app_id: this.model.app_id,
                content_type: 'software_center_app'
            }));

            Gio.DBusActionGroup.get(Gio.Application.get_default().get_dbus_connection(),
                                    'org.gnome.Software',
                                    '/org/gnome/Software')
                               .activate_action('details',
                                                new GLib.Variant('(ss)', [this.model.app_id, '']));
        }));
    }
});

const DiscoveryFeedAppStoreLinkCard = new Lang.Class({
    Name: 'DiscoveryFeedAppStoreLinkCard',
    Extends: Gtk.Box,
    Template: 'resource:///com/endlessm/DiscoveryFeed/app-store-link-card.ui',
    Properties: {
        model: GObject.ParamSpec.object('model',
                                        '',
                                        '',
                                        GObject.ParamFlags.READWRITE |
                                        GObject.ParamFlags.CONSTRUCT_ONLY,
                                        Stores.DiscoveryFeedAppStoreLinkStore.$gtype)
    },

    _init: function(params) {
        this.parent(params);

        let interfaceWrapper = Gio.DBusProxy.makeProxyWrapper(AppLauncherIface);
        let onProxyReady = function(initable, error) {
            if (error) {
                logError(error,
                         'Could not create proxy for ' + SHELL_OBJECT_PATH);
                return;
            }
        };
        let shellProxy = interfaceWrapper(Gio.DBus.session,
                                          SHELL_BUS_NAME,
                                          SHELL_OBJECT_PATH,
                                          onProxyReady);


        let card = new DiscoveryFeedActivatableFrame({
            content: new DiscoveryFeedContentCardLayout({
                content: new DiscoveryFeedContentPreview({
                    image_stream: this.model.thumbnail_data,
                    min_width: EosDiscoveryFeed.THUMBNAIL_WIDTH_APP_STORE_LINK,
                    min_height: EosDiscoveryFeed.THUMBNAIL_SIZE_APP_STORE,
                    has_alpha: true
                }),
                description: new DiscoveryFeedAppStoreLink({
                    message: this.model.title
                }),
                layout_direction: this.model.layout_direction
            })
        });
        this.add(card);
        card.connect('clicked', Lang.bind(this, function() {
            // We can't use g_desktop_app_info_launch to launch
            // GNOME-Software directly, instead use the shell's
            // interface to do that
            shellProxy.LaunchRemote('org.gnome.Software.desktop',
                                    Gtk.get_current_event_time(),
                                    (result, excp) => {
                                        if (!excp)
                                            return;
                                        logError(excp,
                                                 'Could not launch org.gnome.Software');
                                    });
        }));
    }
});

const DiscoveryFeedAvailableAppsCard = new Lang.Class({
    Name: 'DiscoveryFeedAvailableAppsCard',
    Extends: Gtk.Box,
    Template: 'resource:///com/endlessm/DiscoveryFeed/available-apps.ui',
    Children: [
        'flow-box'
    ],
    Properties: {
        model: GObject.ParamSpec.object('model',
                                        '',
                                        '',
                                        GObject.ParamFlags.READWRITE |
                                        GObject.ParamFlags.CONSTRUCT_ONLY,
                                        Stores.DiscoveryFeedAvailableAppsStore.$gtype)
    },

    _init: function(params) {
        this.parent(params);
        this.model.apps.forEach(Lang.bind(this, function(model) {
            this.flow_box.add(new DiscoveryFeedInstallableAppCard({
                model: model
            }));
        }));
        this.flow_box.add(new DiscoveryFeedAppStoreLinkCard({
            model: new Stores.DiscoveryFeedAppStoreLinkStore({})
        }));
    }
});

const DiscoveryFeedListItem = new Lang.Class({
    Name: 'DiscoveryFeedListItem',
    Extends: Gtk.ListBoxRow,
    Template: 'resource:///com/endlessm/DiscoveryFeed/content-list-item.ui',
    Properties: {
        'content': GObject.ParamSpec.object('content',
                                            '',
                                            '',
                                            GObject.ParamFlags.READWRITE |
                                            GObject.ParamFlags.CONSTRUCT_ONLY,
                                            Gtk.Widget)
    },

    _init: function(params) {
        this.parent(params);
        this.add(this.content);
    }
});

function contentViewFromType(type, store) {
    let params = { model: store };
    switch (type) {
    case EosDiscoveryFeed.CardStoreType.ARTICLE_CARD:
        return new DiscoveryFeedKnowledgeAppCard(params);
    case EosDiscoveryFeed.CardStoreType.NEWS_CARD:
        return new DiscoveryFeedKnowledgeAppCard(params);
    case EosDiscoveryFeed.CardStoreType.WORD_QUOTE_CARD:
        return new DiscoveryFeedWordQuotePair(params);
    case EosDiscoveryFeed.CardStoreType.ARTWORK_CARD:
        return new DiscoveryFeedKnowledgeArtworkCard(params);
    case EosDiscoveryFeed.CardStoreType.AVAILABLE_APPS:
        return new DiscoveryFeedAvailableAppsCard(params);
    case EosDiscoveryFeed.CardStoreType.VIDEO_CARD:
        return new DiscoveryFeedKnowledgeVideoCard(params);
    default:
        throw new Error('Card type ' + type + ' not recognized');
    }
}

function populateCardsListFromStore(store) {
    return new DiscoveryFeedListItem({
        content: contentViewFromType(store.type, store)
    });
}

const COLLAPSED_DATE_VISIBLE_THRESHOLD = 50;
const HEADER_SEPARATOR_VISIBLE_THRESHOLD = 20;

const DiscoveryFeedMainWindow = new Lang.Class({
    Name: 'DiscoveryFeedMainWindow',
    Extends: Gtk.ApplicationWindow,
    Template: 'resource:///com/endlessm/DiscoveryFeed/main.ui',
    Children: [
        'cards',
        'recommended',
        'close-button',
        'collapsed-date-revealer',
        'collapsed-date',
        'expanded-date-revealer',
        'expanded-date',
        'header-separator-revealer',
        'scroll-view'
    ],

    close: function(method) {
        recordMetricsEvent(EVENT_DISCOVERY_FEED_CLOSE, new GLib.Variant('a{ss}', {
            closed_by: method,
            time: String(GLib.get_real_time() - this._openedAtTime)
        }));

        // We need to destroy the window here instead of simply hiding it
        // so that GtkApplicationWindow will release the hold on the application
        this.destroy();
    },

    _init: function(params) {
        this.parent(params);

        this._alive = true;
        this._cardModel = new Gio.ListStore({
            item_type: EosDiscoveryFeed.BaseCardStore.$gtype
        });
        this.cards.bind_model(this._cardModel, populateCardsListFromStore);

        // Translators: main date header (%B = month name, %e = day number)
        this.expanded_date.label = (new Date()).toLocaleFormat(_("%B %e")).toLowerCase();
        this.expanded_date_revealer.set_reveal_child(true);

        // Translators: scrolled date header (%B = month name, %e = day number, %Y = year)
        this.collapsed_date.label = (new Date()).toLocaleFormat(_("today is %B %e, %Y"));

        let vadjustment = this.scroll_view.vadjustment;
        vadjustment.connect('value-changed', Lang.bind(this, function() {
            if (vadjustment.value > HEADER_SEPARATOR_VISIBLE_THRESHOLD)
                this.header_separator_revealer.set_reveal_child(true);
            else
                this.header_separator_revealer.set_reveal_child(false);

            if (vadjustment.value > COLLAPSED_DATE_VISIBLE_THRESHOLD) {
                this.expanded_date_revealer.set_reveal_child(false);
                this.collapsed_date_revealer.set_reveal_child(true);
            } else {
                this.collapsed_date_revealer.set_reveal_child(false);
                this.expanded_date_revealer.set_reveal_child(true);
            }
        }));

        // Add an action so that we can dismiss the view by pressing the
        // escape key or by pressing the close button
        this.connect('notify::visible', Lang.bind(this, function() {
            if (this.visible) {
                this._openedAtTime = GLib.get_real_time();
            }
        }));

        let closeCallback = function(action, payload, method) {
            this.close(method);
        };
        let buttonAction = new Gio.SimpleAction({ name: 'buttonclose' });
        let escAction = new Gio.SimpleAction({ name: 'escclose' });
        escAction.connect('activate', Lang.bind(this, closeCallback, 'escape'));
        buttonAction.connect('activate', Lang.bind(this, closeCallback, 'button'));

        this.add_action(escAction);
        this.add_action(buttonAction);
        this.application.set_accels_for_action('win.escclose', ['Escape']);
        this.close_button.set_action_name('win.buttonclose');

        this.connect('destroy', Lang.bind(this, function() {
            this._alive = false;
        }));
    },

    updateContentFromProxies: function(proxies) {
        return Promise.resolve()
        .then(() => this.recommended.hide())
        .then(() => discoveryFeedCardsFromQueries(proxies))
        .then(Lang.bind(this, function(descriptors) {
            // If we're not alive, return early - doing any of this work
            // would either have no effect or cause Gtk to crash.
            if (!this._alive)
                return;

            // We only want to throw stuff away from the model
            // once we have information to replace it with
            this._cardModel.remove_all();

            descriptors.forEach(descriptor => {
                this._cardModel.append(descriptor.model);

                // If we show a card that is not the available apps card,
                // we'll want to show the 'recommended content' text now.
                if (descriptor.type !== EosDiscoveryFeed.CardStoreType.AVAILABLE_APPS) {
                    this.recommended.show();
                }
            });
        }));
    }
});

function load_style_sheet(resourcePath) {
    let provider = new Gtk.CssProvider();
    provider.load_from_resource(resourcePath);
    Gtk.StyleContext.add_provider_for_screen(Gdk.Screen.get_default(),
                                             provider,
                                             Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
}

function promisifyGBusProxyCallback(obj, funcName, ...args) {
    return new Promise((resolve, reject) => {
        try {
            obj[funcName](...args, function() {
                try {
                    let error = Array.prototype.slice.call(arguments, -1)[0];
                    let parameters = Array.prototype.slice.call(arguments,
                                                                0,
                                                                arguments.length - 1);
                    if (error) {
                        reject(error);
                    } else {
                        resolve(parameters);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        } catch (e) {
            reject(e);
        }
    });
}


const N_APPS_TO_DISPLAY = 5;

function appendDiscoveryFeedInstallableAppsFromProxy(proxy) {
    return (new Promise((resolve, reject) => {
        let callback = function(proxy, result) {
            try {
                resolve(proxy.call_finish(result));
            } catch (e) {
                reject(e);
            }
        };
        proxy.dbus_proxy.call('GetInstallableApps',
                              null,
                              Gio.DBusCallFlags.NONE,
                              -1,
                              null,
                              callback);
    })).then(results => results.unpack()).then((results) =>
        results.map(response => ({
            type: EosDiscoveryFeed.CardStoreType.AVAILABLE_APPS,
            source: proxy.desktopId,
            model: new Stores.DiscoveryFeedAvailableAppsStore({}, response.slice(0, N_APPS_TO_DISPLAY).map(entry =>
                new Stores.DiscoveryFeedInstallableAppStore({
                    app_id: entry.id.get_string()[0],
                    title: entry.name.get_string()[0],
                    thumbnail_data: Gio.File.new_for_path(entry.thumbnail_uri.get_string()[0]).read(null),
                    icon: Gio.Icon.deserialize(entry.icon),
                    synopsis: entry.synopsis.get_string()[0]
                })
            ))
        }))
    ).catch((e) => {
        throw new Error('Getting installable apps failed: ' + e + '\n' + e.stack);
    });
}

// zipArraysInObject
//
// Given an object described as:
//
// {
//     a: [...]
//     b: [...]
// }
//
// Return a sequence of arrays described as
//
// [
//     {
//         a: a[n]
//         b: b[n]
//     }
// ]
function zipArraysInObject(object) {
    let minLength = Object.keys(object).reduce((v, k) =>
        v < object[k].length ? v : object[k].length ,
        Number.MAX_VALUE
    );
    let arr = [];

    for (let i = 0; i < minLength; ++i) {
        let ret = {};
        Object.keys(object).forEach((k) => {
            if (i < object[k].length) {
                ret[k] = object[k][i];
            }
        });

        arr.push(ret);
    }

    return arr;
}

function discoveryFeedCardsFromQueries(proxies) {
    let pendingPromises = [];
    let libfeedProxies = [];

    proxies.forEach(function(proxy) {
        switch (proxy.interfaceName) {
        case 'com.endlessm.DiscoveryFeedInstallableApps':
            pendingPromises.push(appendDiscoveryFeedInstallableAppsFromProxy(proxy));
            break;

        // All of these are now handled by EosDiscoveryFeed.unordered_results_from_queries
        case 'com.endlessm.DiscoveryFeedContent':
        case 'com.endlessm.DiscoveryFeedNews':
        case 'com.endlessm.DiscoveryFeedVideo':
        case 'com.endlessm.DiscoveryFeedQuote':
        case 'com.endlessm.DiscoveryFeedWord':
        case 'com.endlessm.DiscoveryFeedArtwork':
            libfeedProxies.push(proxy);
            break;
        default:
            throw new Error('Don\'t know how to handle interface ' + proxy.interfaceName);
        }
    });

    pendingPromises.push(promisifyGIO(EosDiscoveryFeed,
                                      'unordered_results_from_queries',
                                      'unordered_results_from_queries_finish',
                                      libfeedProxies.map(proxy =>
                                          new EosDiscoveryFeed.KnowledgeAppProxy({
                                              'dbus-proxy': proxy.dbus_proxy,
                                              'desktop-id': proxy.desktopId,
                                              'knowledge-search-object-path': proxy.knowledgeSearchObjectPath,
                                              'knowledge-app-id': proxy.knowledgeAppId
                                          })
                                      ), null));

    // Okay, now wait for all proxies to execute. allSettledPromises will
    // return tuples of errors and models depending on whether
    // or not an D-Bus call failed or succeeded. From there we can add
    // the results to a model as we build it up (since we will now have
    // the index) of the model.
    return allSettledPromises(pendingPromises)
    .then(states => {
        let models = states.map(([error, stateModels]) => {
            if (error) {
                logError(error, 'Query failed');
                return null;
            }

            return stateModels;
        })
        // Remove null entries (errors)
        .filter(r => !!r)
        // Flat map, since we get a list list from promise
        .reduce((a, b) => a.concat(b), []);

        return ModelOrdering.arrange(models);
    });

}

const AUTO_CLOSE_MILLISECONDS_TIMEOUT = 12000;

const DiscoveryFeedApplication = new Lang.Class({
    Name: 'DiscoveryFeedApplication',
    Extends: Gtk.Application,

    _init: function() {
        this.parent({
            application_id: pkg.name,
            inactivity_timeout: AUTO_CLOSE_MILLISECONDS_TIMEOUT,
            flags: Gio.ApplicationFlags.IS_SERVICE
        });
        GLib.set_application_name(_('Discovery Feed'));
        this.Visible = false;
        this._installedAppsChangedId = -1;
        this._monitorAddedSignalId = -1;
        this._monitorRemovedSignalId = -1;
        this._monitorWorkareaChangedSignalId = -1;
        this._discoveryFeedProxies = [];
        this._contentAppIds = [];
        this._debugWindow = !!GLib.getenv('DISCOVERY_FEED_DEBUG_WINDOW');
    },

    vfunc_startup: function() {
        this.parent();

        load_style_sheet('/com/endlessm/DiscoveryFeed/application.css');

        if (this._debugWindow)
            this.activate();
    },

    // Using connection, refresh discovery feed proxies. Returns a promise
    // that resolves when refresh operation is complete. Note that this
    // does not re-query the proxies. That is the responsibility of the
    // caller. For convenience, the promise resolves with proxies.
    _refreshDiscoveryFeedProxies: function(connection) {
        // Remove all proxies and start over
        return promisifyGIO(EosDiscoveryFeed,
                            'find_providers',
                            'find_providers_finish',
                            null).then(providers =>
            instantiateObjectsFromDiscoveryFeedProviders(connection, providers)
        ).then(Lang.bind(this, function(promises) {
            this._discoveryFeedProxies = promises.map(([error, proxy]) => {
                if (error) {
                    logError(error, 'Could not create proxy');
                    return null;
                }

                return proxy;
            }).filter(proxy => proxy);
            return this._discoveryFeedProxies;
        }));
    },

    vfunc_dbus_register: function(connection, path) {
        this._dbusImpl = Gio.DBusExportedObject.wrapJSObject(DiscoveryFeedIface, this);
        this._dbusImpl.export(connection, path);
        this._providersRequireRefresh = true;

        // Make sure to update the available proxies when the
        // app info state changes. Note that we need to hold
        // on to the reference here: https://phabricator.endlessm.com/T17598
        // otherwise the signal will be automatically disconnected, even though
        // the Gio documentation says that this is a singleton.
        this._appInfoMonitor = Gio.AppInfoMonitor.get();
        this._installedAppsChangedId = this._appInfoMonitor.connect('changed', Lang.bind(this, function() {
            this._providersRequireRefresh = true;
        }));

        return this.parent(connection, path);
    },

    vfunc_dbus_unregister: function(connection, path) {
        if (this._installedAppsChangedId !== -1) {
            this._appInfoMonitor.disconnect(this._installedAppsChangedId);
            this._installedAppsChangedId = -1;
        }

        this.parent(connection, path);
    },

    _createWindowResources: function() {
        this._window = new DiscoveryFeedMainWindow({
            application: this,
            type_hint: !this._debugWindow ? Gdk.WindowTypeHint.DOCK : Gdk.WindowTypeHint.NORMAL,
            role: !this._debugWindow ? SIDE_COMPONENT_ROLE : null
        });

        // to be able to set the opacity from css
        let visual = Gdk.Screen.get_default().get_rgba_visual();
        if (visual) {
            this._window.set_visual(visual);
        }

        this._window.connect('notify::visible', Lang.bind(this, this._onVisibilityChanged));
        this._setupWindowInteraction();

        // update position when workarea changes
        let display = Gdk.Display.get_default();
        this._monitorAddedSignalId = display.connect('monitor-added',
                                                     Lang.bind(this,
                                                               this._updateGeometry));
        this._monitorRemovedSignalId = display.connect('monitor-removed',
                                                       Lang.bind(this,
                                                                 this._updateGeometry));
        let monitor = display.get_primary_monitor();
        this._monitorWorkareaChangedSignalId = monitor.connect('notify::workarea',
                                                               Lang.bind(this,
                                                                        this._updateGeometry));
        this._updateGeometry();

        // When the window gets destroyed we should release our reference
        // to it so that we can re-create it later
        this._window.connect('destroy', Lang.bind(this, function() {
            // We also need to disconnect all signals now
            if (this._monitorAddedSignalId !== -1) {
                display.disconnect(this._monitorAddedSignalId);
                this._monitorAddedSignalId = -1;
            }

            if (this._monitorRemovedSignalId !== -1) {
                display.disconnect(this._monitorRemovedSignalId);
                this._monitorRemovedSignalId = -1;
            }

            if (this._monitorWorkareaChangedSignalId !== -1) {
                monitor.disconnect(this._monitorWorkareaChangedSignalId);
                this._monitorWorkareaChangedSignalId = -1;
            }

            this._window = null;
        }));

        // when the label contains letters and numbers the allocation
        // does not work properly, force re-allocation here
        //
        // Note that we only want to do this *after* we have connected
        // to window signals, including the 'realize' signal earlier
        // in this._setupWindowInteraction. This is because calling
        // realize() here will also recursively call realize() on all
        // parents and immediately fire the signal before we have a chance
        // to connect to it.
        this._window.expanded_date.realize();
    },

    vfunc_activate: function() {
        if (this._debugWindow)
            this.show(Gdk.CURRENT_TIME);
    },

    show: function(timestamp) {
        // We need to create window resources here so that gtk does not
        // take a hold on the application during startup. We cannot do it
        // during activate, since this function might be called by the
        // shell instead of activate.
        if (!this._window)
            this._createWindowResources();

        this._window.show();
        this._window.present_with_time(timestamp);

        recordMetricsEvent(EVENT_DISCOVERY_FEED_OPEN, new GLib.Variant('a{ss}', {
            opened_by: 'shell_button',
            language: GLib.get_language_names()[0]
        }));

        let chain = Promise.resolve(this._discoveryFeedProxies);
        if (this._providersRequireRefresh) {
            chain = this._refreshDiscoveryFeedProxies(this.get_dbus_connection());
            this._providersRequireRefresh = false;
        }

        chain.then(Lang.bind(this, function(proxies) {
            // It is possible that the window could have gone away just after
            // we refreshed our providers, in that case, we'll need to
            if (!this._window)
                return Promise.resolve();

            return this._window.updateContentFromProxies(proxies);
        })).catch(e => logError(e, 'Show failed'));
    },

    hide: function() {
        this._window.close('lost_focus');
    },

    _onVisibilityChanged: function() {
        this.Visible = this._window.is_visible();
        let propChangedVariant = new GLib.Variant('(sa{sv}as)', [
            DISCOVERY_FEED_IFACE, {
                'Visible': new GLib.Variant('b', this.Visible)
            },
            []
        ]);

        Gio.DBus.session.emit_signal(null,
                                     DISCOVERY_FEED_PATH,
                                     'org.freedesktop.DBus.Properties',
                                     'PropertiesChanged',
                                     propChangedVariant);
    },

    _setupWindowInteraction: function() {
        // we do not want this behavior when in debug mode to
        // not interfere with the inspector window
        if (this._debugWindow)
            return;

        this._window.connect('realize', Lang.bind(this, function() {
            let gdkWindow = this._window.get_window();
            gdkWindow.set_events(gdkWindow.get_events() |
                                 Gdk.EventMask.FOCUS_CHANGE_MASK);
            this._window.connect('focus-out-event', Lang.bind(this, function() {
                this.hide();
                return false;
            }));
        }));
    },

    _updateGeometry: function() {
        let monitor = Gdk.Display.get_default().get_primary_monitor();
        let workarea = monitor.get_workarea();

        let geometry = {
            width: this._window.get_size()[0],
            height: workarea.height,
            y: workarea.y
        };

        geometry.x = workarea.x + ((workarea.width - geometry.width) * 0.5);
        this._window.move(geometry.x, geometry.y);

        this._window.resize(geometry.width, geometry.height);
    }
});

function main(argv) { // eslint-disable-line no-unused-vars
    return (new DiscoveryFeedApplication()).run(argv);
}
