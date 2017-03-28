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
    <method name="ContentQuery"> \
      <arg type="s" name="Query" direction="in" /> \
      <arg type="s" name="Result" direction="out" /> \
    </method> \
  </interface> \
</node>';

/*

const FDODBusIface = '\
<node> \
  <interface name='org.freedesktop.DBus'> \
    <method name='ListNames'> \
      <arg type='as' direction='out' /> \
    </method> \
  </interface> \
</node>';

const FDODBusIntrospectableIface = '\
<node> \
  <interface name='org.freedesktop.DBus.Introspectable'> \
    <method name='Introspect'> \
      <arg type='s' direction='out' /> \
    </method> \
  </interface> \
</node>';

function childPath(parentPath, childNodePath) {
    if (parentPath === '/') {
        return parentPath + childNodePath;
    }

    return [parentPath, childNodePath].join('/');
}

function findDBusObjectsWithInterfaceAtPath(connection, name, objectPath, interfaceName, done) {
    let fdoIntrospectableObjectReady = function(initable, error) {
        if (error) {
            logError(error, 'Could not create Introspectable DBus wrapper');
            return;
        }

        // Now that the object is ready, call the introspect method and
        // get the results
        fdoIntrospectableObject.IntrospectRemote(introspectionResultsHandler);
    };
    let introspectionResultsHandler = function(results, error) {
        if (error) {
            logError(error, 'Failed to call Introspect on ' + objectPath + ' at ' + name);
            return;
        }

        let nodeInfo = Gio.DBusNodeInfo.new_for_xml(results[0]);
        let discoveredObjects = [];
        let nodeCount = 0;

        let appendDiscoveredObject = function(discoveredObjectsOnThisPath) {
            Array.prototype.push.apply(discoveredObjects, discoveredObjectsOnThisPath);
            nodeCount--;

            if (nodeCount < 1) {
                done(discoveredObjects);
            }
        };

        // If we found an object at a path satisfying the interface we need
        // add it to the list now
        if (nodeInfo.lookup_interface(interfaceName) !== null) {
            discoveredObjects.push({
                path: objectPath,
                name: name
            });
        }

        nodeCount = nodeInfo.nodes.length;

        // Found some nodes, continue recursing
        if (nodeCount) {
            nodeInfo.nodes.forEach(function(node) {
                findDBusObjectsWithInterfaceAtPath(connection,
                                                   name,
                                                   childPath(objectPath, node.path),
                                                   interfaceName,
                                                   appendDiscoveredObject);
            });
        } else {
            // This was a leaf node. Return whatever we have here.
            done(discoveredObjects);
        }
    };

    let fdoIntrospectableObject = Gio.DBusProxy.makeProxyWrapper(FDODBusIntrospectableIface)(connection,
                                                                                             name,
                                                                                             objectPath,
                                                                                             fdoIntrospectableObjectReady,
                                                                                             null);
}

function findDBusObjectsWithInterface(connection, interfaceName, done) {
    let discoveredObjects = [];
    let remaining = 0;

    let appendDiscoveredObject = function(discoveredObjectsOnThisName) {
        Array.prototype.push.apply(discoveredObjects,
                                   discoveredObjectsOnThisName);

        remaining--;
        if (remaining < 1) {
            done(discoveredObjects);
        }
    };

    let fdoDBusReady = function(initable, error) {
        if (error) {
            logError(error, 'Could not create DBus wrapper');
            return;
        }

        fdoDBus.ListNamesRemote(function(names) {
            // Fire off asynchronous concurrent requests to get all objects
            // which match our criteria and then call done when we have
            // examined all objects on the bus.
            //
            // For now, filter to endlessm objects to save time traversing
            // the entire object tree, though this may change in future.
            names = names[0].filter(n => n.indexOf('endlessm') !== -1);
            remaining = names.length;
            names.forEach(function(name) {
                findDBusObjectsWithInterfaceAtPath(connection,
                                                   name,
                                                   '/',
                                                   interfaceName,
                                                   appendDiscoveredObject);
            });
        });
    };

    let fdoDBus = Gio.DBusProxy.makeProxyWrapper(FDODBusIface)(connection,
                                                               'org.freedesktop.DBus',
                                                               '/',
                                                               fdoDBusReady,
                                                               null);
}

function makeInterfaceProxiesForObjects(connection,
                                        interfaceWrapper,
                                        objects,
                                        done) {
    let proxies = [];
    let remaining = objects.length;

    let onProxyReady = function(initable, error) {
        if (error) {
            logError(error, 'Could not create proxy for ' + interfaceName);
            return;
        }

        remaining--;
        if (remaining < 1) {
            done(proxies);
        }
    };

    objects.forEach(function(object) {
        proxies.push(interfaceWrapper(connection,
                                      object.name,
                                      object.path,
                                      onProxyReady,
                                      null));
    });
}


findDBusObjectsWithInterface(connection, 'com.endlessm.GrandCentralContent', Lang.bind(this, function(discoveredObjects) {
    makeInterfaceProxiesForObjects(connection,
                                   Gio.DBusProxy.makeProxyWrapper(GrandCentralContentIface),
                                   discoveredObjects,
                                   Lang.bind(this, function(proxies) {
        Array.prototype.push.apply(this._grandCentralProxies, proxies);
    }));
}));

*/

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
        enumerator = directory.enumerate_children('standard::*',
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
        keyFile.load_from_file(file.get_path(), GLib.KeyFileFlags.NONE);

        if (!keyFile.has_group('GrandCentralContentProvider')) {
            log('Key file ' + file.get_path() + ' does not have a section called GrandCentralContentProvider, ignored');
            continue;
        }

        let keys = keyFile.get_keys('GrandCentralContentProvider')[0];
        let requiredKeys = ['DesktopId', 'ObjectPath', 'BusName'];

        let notFoundKeys = requiredKeys.filter(k => keys.indexOf(k) === -1);
        if (notFoundKeys.length) {
            log('Key file ' + file.get_path() + ' does not have keys ' + notFoundKeys.join(', ') + ', ignoring');
            continue;
        }

        providerBusDescriptors.push({
            path: keyFile.get_string('GrandCentralContentProvider', 'ObjectPath'),
            name: keyFile.get_string('GrandCentralContentProvider', 'BusName')
        });
    }

    return providerBusDescriptors;
}

function readGrandCentralProvidersInDataDirectories(directory) {
    let directories = GLib.getenv('XDG_DATA_DIRS').split(':');
    return directories.reduce((allProviders, directory) => {
        let path = Gio.File.new_for_path(GLib.build_filenamev([
            directory,
            'com.endlessm.GrandCentral',
            'ContentProviders'
        ]));
        Array.prototype.push.apply(allProviders,
                                   readGrandCentralProvidersInDirectory(path));
        return allProviders;
    }, []);
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

    let proxies = providers.map(provider => interfaceWrapper(connection,
                                                             provider.name,
                                                             provider.path,
                                                             Lang.bind(this,
                                                                       onProxyReady,
                                                                       provider.path,
                                                                       provider.name),
                                                             null));
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
                                          '')
    },

    _init: function(params) {
        this.parent(params);
    }
});

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

    _init: function(params) {
        this.parent(params);
        this.add(new Gtk.Label({
            visible: true,
            label: this.model.title
        }));
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
        'cards'
    ],

    _init: function(params) {
        this.parent(params);
        this.cards.bind_model(this.card_model, function(card_store) {
            return new GrandCentralCard({
                model: card_store
            });
        });
    },
});

function load_style_sheet(resourcePath) {
    let provider = new Gtk.CssProvider();
    provider.load_from_resource(resourcePath);
    Gtk.StyleContext.add_provider_for_screen(Gdk.Screen.get_default(),
                                             provider,
                                             Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION);
}

function populateGrandCentralModelFromQueries(model, proxies) {
    let remaining = proxies.length;
    model.remove_all();

    proxies.forEach(function(proxy) {
        proxy.ContentQueryRemote('hello', function(results, error) {
            if (error) {
                logError(error, 'Failed to execute Grand Central query');
                return;
            }

            results.forEach(function(string) {
                let response = JSON.parse(string);
                response.forEach(function(entry) {
                    model.append(new GrandCentralCardStore({
                        title: entry.title
                    }));
                });
            });
        });
    });
}

const GrandCentralApplication = new Lang.Class({
    Name: 'GrandCentralApplication',
    Extends: Gtk.Application,

    _init: function() {
        this.parent({ application_id: pkg.name });
        GLib.set_application_name(_("Grand Central"));
        this.Visible = false;
        this._changedSignalId = 0;
        this._grandCentralProxies = [];
        this._grandCentralCardModel = new Gio.ListStore({
            item_type: GrandCentralCardStore.$gtype
        });
    },

    vfunc_startup: function() {
        this.parent();

        Gtk.Settings.get_default().gtk_application_prefer_dark_theme = true;
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
