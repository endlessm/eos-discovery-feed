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
#include <glib-object.h>

G_BEGIN_DECLS

#define EOS_DISCOVERY_FEED_TYPE_PROVIDER_INFO eos_discovery_feed_provider_info_get_type ()
G_DECLARE_FINAL_TYPE (EosDiscoveryFeedProviderInfo, eos_discovery_feed_provider_info, EOS_DISCOVERY_FEED, PROVIDER_INFO, GObject)

const gchar * eos_discovery_feed_provider_info_get_object_path (EosDiscoveryFeedProviderInfo *provider_info);
const gchar * eos_discovery_feed_provider_info_get_bus_name (EosDiscoveryFeedProviderInfo *provider_info);
const gchar * const * eos_discovery_feed_provider_info_get_interfaces (EosDiscoveryFeedProviderInfo *provider_info);
const gchar * eos_discovery_feed_provider_info_get_knowledge_app_id (EosDiscoveryFeedProviderInfo *provider_info);
const gchar * eos_discovery_feed_provider_info_get_desktop_file_id (EosDiscoveryFeedProviderInfo *provider_info);
const gchar * eos_discovery_feed_provider_info_get_knowledge_search_object_path (EosDiscoveryFeedProviderInfo *provider_info);

EosDiscoveryFeedProviderInfo * eos_discovery_feed_provider_info_new (const gchar         *path,
                                                                     const gchar         *bus_name,
                                                                     const gchar * const *interfaces,
                                                                     const gchar         *knowledge_app_id,
                                                                     const gchar         *desktop_file_id,
                                                                     const gchar         *knowledge_search_object_path);

G_END_DECLS
