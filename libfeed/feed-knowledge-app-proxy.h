/* Copyright 2018 Endless Mobile, Inc.
 *
 * eos-discovery-feed is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation, either version 2.1 of the
 * License, or (at your option) any later version.
 *
 * eos-discovery-feed is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with eos-discovery-feed.  If not, see
 * <http://www.gnu.org/licenses/>.
 */

#pragma once

#include <feed-base-card-store.h>
#include <gio/gio.h>
#include <glib-object.h>

G_BEGIN_DECLS

#define EOS_DISCOVERY_FEED_TYPE_KNOWLEDGE_APP_PROXY eos_discovery_feed_knowledge_app_proxy_get_type ()
G_DECLARE_FINAL_TYPE (EosDiscoveryFeedKnowledgeAppProxy, eos_discovery_feed_knowledge_app_proxy, EOS_DISCOVERY_FEED, KNOWLEDGE_APP_PROXY, GObject)

EosDiscoveryFeedKnowledgeAppProxy * eos_discovery_feed_knowledge_app_proxy_new (GDBusProxy  *dbus_proxy,
                                                                                const gchar *desktop_id,
                                                                                const gchar *knowledge_search_object_path,
                                                                                const gchar *knowledge_app_id);

GDBusProxy * eos_discovery_feed_knowledge_app_proxy_get_dbus_proxy (EosDiscoveryFeedKnowledgeAppProxy *proxy);

const gchar * eos_discovery_feed_knowledge_app_proxy_get_desktop_id (EosDiscoveryFeedKnowledgeAppProxy *proxy);
const gchar * eos_discovery_feed_knowledge_app_proxy_get_knowledge_search_object_path (EosDiscoveryFeedKnowledgeAppProxy *proxy);
const gchar * eos_discovery_feed_knowledge_app_proxy_get_knowledge_app_id (EosDiscoveryFeedKnowledgeAppProxy *proxy);

G_END_DECLS
